import axios, { type AxiosInstance, type AxiosResponse, type CreateAxiosDefaults, type Method } from 'axios';
import {
  AwtrixApiError,
  AwtrixConnectionError,
  type AwtrixConnectionErrorKind,
  type AwtrixErrorCode,
  AwtrixError,
  AwtrixResponseError,
  AwtrixValidationError,
} from './errors.js';

/** HTTP Basic credentials, needed once `authEnabled` is switched on in the system config. */
export interface AwtrixAuth {
  username: string;
  password: string;
}

export interface AwtrixClientOptions {
  /**
   * Hostname or IP of the device, optionally with protocol and port:
   * `"192.168.1.50"`, `"awtrixng-a1b2c3.local"`, `"http://192.168.1.50:8080"`.
   */
  host: string;
  /** Overrides the port given in `host`. Default `80`. */
  port?: number;
  /** Used when `host` carries no protocol. Default `http`. */
  protocol?: 'http' | 'https';
  /** HTTP Basic credentials. */
  auth?: AwtrixAuth;
  /** Request timeout in ms. Default `5000`. `0` disables it. */
  timeout?: number;
  /**
   * How often a request answered with `503 serviceBusy` is retried, honouring the
   * `Retry-After` header. Default `1`. `0` disables retries.
   */
  retryOnBusy?: number;
  /** Additional headers sent with every request. */
  headers?: Record<string, string>;
  /** Extra axios defaults merged into the internal instance (ignored with `axiosInstance`). */
  axiosConfig?: CreateAxiosDefaults;
  /** Use this axios instance instead of creating one (e.g. for interceptors or proxies). */
  axiosInstance?: AxiosInstance;
}

/** Options every API call accepts as its last argument. */
export interface RequestOptions {
  /** Aborts the request. */
  signal?: AbortSignal;
  /** Timeout for this request in ms, overriding the client default. */
  timeout?: number;
}

export type ResponseKind = 'json' | 'text' | 'binary';

export interface TransportRequest {
  method: Method;
  path: string;
  query?: Record<string, string | number | boolean | undefined>;
  /** Serialized as JSON with `Content-Type: application/json`. */
  json?: unknown;
  /** A raw body (string or FormData) sent as is. */
  body?: string | FormData;
  contentType?: string;
  response?: ResponseKind;
  /** Statuses (besides 2xx) that should not throw. */
  acceptStatus?: readonly number[];
  options?: RequestOptions;
}

export interface TransportResponse<T> {
  status: number;
  data: T;
  headers: Record<string, string>;
}

const DEFAULT_TIMEOUT = 5000;
const DEFAULT_BUSY_DELAY = 2000;
const MAX_BUSY_DELAY = 30_000;

const STATUS_CODES: Record<number, AwtrixErrorCode> = {
  400: 'badRequest',
  401: 'unauthorized',
  403: 'forbidden',
  404: 'notFound',
  405: 'methodNotAllowed',
  409: 'scriptChanged',
  413: 'payloadTooLarge',
  415: 'unsupportedMediaType',
  422: 'validationFailed',
  500: 'internalError',
  501: 'notSupported',
  503: 'unavailable',
  507: 'insufficientStorage',
};

/** Builds the base URL from the client options. */
export function buildBaseUrl(options: Pick<AwtrixClientOptions, 'host' | 'port' | 'protocol'>): string {
  const host = options.host?.trim();
  if (!host) {
    throw new AwtrixValidationError('host', 'must be a non-empty hostname or IP address');
  }
  const withProtocol = /^[a-z][a-z0-9+.-]*:\/\//i.test(host) ? host : `${options.protocol ?? 'http'}://${host}`;
  let url: URL;
  try {
    url = new URL(withProtocol);
  } catch {
    throw new AwtrixValidationError('host', `"${host}" is not a valid host`);
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new AwtrixValidationError('host', `unsupported protocol "${url.protocol}"`);
  }
  if (options.port !== undefined) {
    if (!Number.isInteger(options.port) || options.port < 1 || options.port > 65535) {
      throw new AwtrixValidationError('port', 'must be an integer between 1 and 65535');
    }
    url.port = String(options.port);
  }
  return `${url.protocol}//${url.host}${url.pathname.replace(/\/+$/, '')}`;
}

/**
 * Thin wrapper around axios that speaks the AWTRIX conventions: status handling, the error
 * body shape, `Retry-After` and connection error classification.
 */
export class HttpTransport {
  readonly baseUrl: string;
  private readonly axios: AxiosInstance;
  private readonly retryOnBusy: number;
  private readonly timeout: number;
  private readonly auth?: AwtrixAuth;
  private readonly headers: Record<string, string>;

  constructor(options: AwtrixClientOptions) {
    this.baseUrl = buildBaseUrl(options);
    const timeout = options.timeout ?? DEFAULT_TIMEOUT;
    if (!Number.isFinite(timeout) || timeout < 0) {
      throw new AwtrixValidationError('timeout', 'must be a non-negative number of milliseconds');
    }
    const retryOnBusy = options.retryOnBusy ?? 1;
    if (!Number.isInteger(retryOnBusy) || retryOnBusy < 0) {
      throw new AwtrixValidationError('retryOnBusy', 'must be a non-negative integer');
    }
    this.retryOnBusy = retryOnBusy;
    this.timeout = timeout;
    this.auth = options.auth;
    this.axios = options.axiosInstance ?? axios.create(options.axiosConfig);
    this.headers = { Accept: 'application/json, text/plain, */*', ...options.headers };
  }

  async request<T>(req: TransportRequest): Promise<TransportResponse<T>> {
    for (let attempt = 0; ; attempt++) {
      try {
        return await this.send<T>(req);
      } catch (error) {
        if (error instanceof AwtrixApiError && error.isBusy && attempt < this.retryOnBusy && !req.options?.signal?.aborted) {
          await delay(Math.min(error.retryAfterMs ?? DEFAULT_BUSY_DELAY, MAX_BUSY_DELAY), req.options?.signal);
          continue;
        }
        throw error;
      }
    }
  }

  private async send<T>(req: TransportRequest): Promise<TransportResponse<T>> {
    const method = req.method.toUpperCase();
    const path = req.path;
    // `false` keeps axios from adding its form-urlencoded default to bodyless requests.
    const headers: Record<string, string | false> = { ...this.headers, 'Content-Type': false };
    let data: unknown;

    if (req.json !== undefined) {
      data = JSON.stringify(req.json);
      headers['Content-Type'] = 'application/json';
    } else if (req.body !== undefined) {
      data = req.body;
      if (req.contentType) headers['Content-Type'] = req.contentType;
      // FormData: axios sets multipart/form-data including the boundary itself.
      else delete headers['Content-Type'];
    }

    let response: AxiosResponse<RawBody>;
    try {
      response = await this.axios.request<RawBody>({
        method: req.method,
        url: this.baseUrl + path,
        params: req.query ? stripUndefined(req.query) : undefined,
        data,
        headers,
        responseType: req.response === 'binary' ? 'arraybuffer' : 'text',
        // Parsing is done here, so a non-JSON error body never trips axios.
        transformResponse: [(raw: unknown) => raw],
        validateStatus: () => true,
        signal: req.options?.signal,
        timeout: req.options?.timeout ?? this.timeout,
        ...(this.auth ? { auth: { username: this.auth.username, password: this.auth.password } } : {}),
      });
    } catch (error) {
      throw toConnectionError(error, method, path);
    }

    const status = response.status;
    const responseHeaders = normalizeHeaders(response.headers);
    const ok = (status >= 200 && status < 300) || req.acceptStatus?.includes(status);

    if (!ok) {
      throw toApiError(status, response.statusText, response.data, responseHeaders, method, path);
    }

    return { status, headers: responseHeaders, data: parseBody<T>(req.response ?? 'json', response.data, status, method, path) };
  }
}

/** What axios hands back: a string for `text`, a Buffer (Node.js) or ArrayBuffer for `arraybuffer`. */
type RawBody = string | ArrayBuffer | ArrayBufferView | undefined;

function toBytes(raw: RawBody): Uint8Array {
  if (raw instanceof ArrayBuffer) return new Uint8Array(raw);
  if (ArrayBuffer.isView(raw)) return new Uint8Array(raw.buffer, raw.byteOffset, raw.byteLength);
  if (typeof raw === 'string') return new TextEncoder().encode(raw);
  return new Uint8Array(0);
}

function toText(raw: RawBody): string {
  return typeof raw === 'string' ? raw : new TextDecoder().decode(toBytes(raw));
}

function parseBody<T>(kind: ResponseKind, raw: RawBody, status: number, method: string, path: string): T {
  if (kind === 'binary') {
    // Copy, so the result does not pin a pooled Buffer.
    return Uint8Array.from(toBytes(raw)) as T;
  }
  const text = toText(raw);
  if (kind === 'text') return text as T;
  if (text.trim() === '') return undefined as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new AwtrixResponseError(status, method, path, 'response body is not valid JSON', text);
  }
}

function toApiError(
  status: number,
  statusText: string,
  raw: RawBody,
  headers: Record<string, string>,
  method: string,
  path: string,
): AwtrixApiError {
  const text = toText(raw);
  let body: unknown = text || undefined;
  try {
    if (text) body = JSON.parse(text);
  } catch {
    // Not JSON - keep the text.
  }

  let code: AwtrixErrorCode = STATUS_CODES[status] ?? 'httpError';
  let message = statusText || `HTTP ${status}`;
  let field: string | undefined;

  if (isRecord(body)) {
    const error = body.error;
    if (isRecord(error)) {
      if (typeof error.code === 'string') code = error.code;
      if (typeof error.message === 'string') message = error.message;
      if (typeof error.field === 'string' && error.field !== '') field = error.field;
    } else if (typeof error === 'string') {
      // POST /api/v1/restore answers {"ok":false,"error":"..."}.
      message = error;
    }
  } else if (typeof body === 'string' && body.trim() !== '') {
    message = body.trim();
  }

  return new AwtrixApiError({
    status,
    code,
    message,
    field,
    method,
    path,
    retryAfterMs: parseRetryAfter(headers['retry-after']),
    body,
  });
}

function toConnectionError(error: unknown, method: string, path: string): AwtrixError {
  if (error instanceof AwtrixError) return error;
  if (axios.isCancel(error)) {
    return new AwtrixConnectionError('aborted', method, path, 'request was aborted', 'ERR_CANCELED', error);
  }
  const err = error as { code?: string; message?: string; cause?: { code?: string } };
  const code = err?.code ?? err?.cause?.code;
  const message = err?.message ?? String(error);
  return new AwtrixConnectionError(classify(code), method, path, message, code, error);
}

function classify(code: string | undefined): AwtrixConnectionErrorKind {
  switch (code) {
    case 'ECONNABORTED':
    case 'ETIMEDOUT':
    case 'ESOCKETTIMEDOUT':
      return 'timeout';
    case 'ECONNREFUSED':
      return 'refused';
    case 'EHOSTUNREACH':
    case 'ENETUNREACH':
    case 'EHOSTDOWN':
    case 'ENETDOWN':
      return 'unreachable';
    case 'ENOTFOUND':
    case 'EAI_AGAIN':
      return 'dns';
    case 'ECONNRESET':
    case 'EPIPE':
      return 'reset';
    case 'ERR_CANCELED':
      return 'aborted';
    default:
      return 'network';
  }
}

/** Parses a `Retry-After` header (delta seconds or HTTP date) into milliseconds. */
export function parseRetryAfter(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (/^\d+$/.test(trimmed)) return Number(trimmed) * 1000;
  const date = Date.parse(trimmed);
  if (Number.isNaN(date)) return undefined;
  return Math.max(0, date - Date.now());
}

function normalizeHeaders(headers: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  if (!headers || typeof headers !== 'object') return out;
  const source =
    typeof (headers as { toJSON?: unknown }).toJSON === 'function'
      ? (headers as { toJSON(): Record<string, unknown> }).toJSON()
      : (headers as Record<string, unknown>);
  for (const [key, value] of Object.entries(source)) {
    if (value === undefined || value === null) continue;
    out[key.toLowerCase()] = Array.isArray(value) ? value.join(', ') : String(value);
  }
  return out;
}

function stripUndefined(query: Record<string, string | number | boolean | undefined>): Record<string, string | number | boolean> {
  const out: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined) out[key] = value;
  }
  return out;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Resolves after `ms`, or rejects early with an aborted connection error. */
export function delay(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new AwtrixConnectionError('aborted', 'WAIT', '', 'aborted while waiting'));
      return;
    }
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(timer);
      reject(new AwtrixConnectionError('aborted', 'WAIT', '', 'aborted while waiting'));
    };
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}
