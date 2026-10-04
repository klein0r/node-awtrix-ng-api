/**
 * Error codes the device reports in `{"error":{"code": ...}}`. Unknown future codes are
 * passed through as plain strings.
 */
export type AwtrixErrorCode =
  | 'invalidJson'
  | 'invalidPinConfig'
  | 'invalidPath'
  | 'invalidName'
  | 'invalidMethodOverride'
  | 'invalidOrigin'
  | 'badRequest'
  | 'wrongChip'
  | 'invalidPackage'
  | 'wrongTarget'
  | 'unauthorized'
  | 'forbidden'
  | 'forbiddenOrigin'
  | 'notFound'
  | 'methodNotAllowed'
  | 'scriptChanged'
  | 'nameTaken'
  | 'gamepadsFull'
  | 'notNewer'
  | 'updateBusy'
  | 'payloadTooLarge'
  | 'insufficientMemory'
  | 'unsupportedMediaType'
  | 'validationFailed'
  | 'internalError'
  | 'storageError'
  | 'notSupported'
  | 'unavailable'
  | 'serviceBusy'
  | 'insufficientStorage'
  | (string & {});

/** Base class of every error this library throws. */
export class AwtrixError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = new.target.name;
  }
}

/** Details of an {@link AwtrixApiError}. */
export interface AwtrixApiErrorDetails {
  status: number;
  code: AwtrixErrorCode;
  message: string;
  field?: string;
  method: string;
  path: string;
  retryAfterMs?: number;
  body?: unknown;
}

/** The device answered with a non-2xx status. */
export class AwtrixApiError extends AwtrixError {
  /** HTTP status code. */
  readonly status: number;
  /** Machine-readable error code from the body (or derived from the status). */
  readonly code: AwtrixErrorCode;
  /** The input key at fault, e.g. `brightness` or `scroll.speed`, when the device names one. */
  readonly field?: string;
  /** HTTP method of the failed request. */
  readonly method: string;
  /** Request path of the failed request. */
  readonly path: string;
  /** Parsed `Retry-After` header, sent with `503 serviceBusy`. */
  readonly retryAfterMs?: number;
  /** The raw (parsed) response body. */
  readonly body?: unknown;
  /** The message as the device sent it, without the request prefix. */
  readonly deviceMessage: string;

  constructor(details: AwtrixApiErrorDetails) {
    const fieldPart = details.field ? ` (field: ${details.field})` : '';
    super(`${details.method} ${details.path} failed with ${details.status} ${details.code}: ${details.message}${fieldPart}`);
    this.status = details.status;
    this.code = details.code;
    this.field = details.field;
    this.method = details.method;
    this.path = details.path;
    this.retryAfterMs = details.retryAfterMs;
    this.body = details.body;
    this.deviceMessage = details.message;
  }

  /** `400` - malformed JSON, name, path, pin map, method override or firmware image. */
  get isBadRequest(): boolean {
    return this.status === 400;
  }

  /** `401` - HTTP Basic auth is enabled and the credentials are missing or wrong. */
  get isUnauthorized(): boolean {
    return this.status === 401;
  }

  /** `403` - the action is disabled in AP/provisioning mode. */
  get isForbidden(): boolean {
    return this.status === 403;
  }

  /** `404` - unknown app, notification, melody, MP3, file, script or indicator. */
  get isNotFound(): boolean {
    return this.status === 404;
  }

  /** `409` - the script source changed, or (TC002) the update is not newer / another update runs. */
  get isConflict(): boolean {
    return this.status === 409;
  }

  /** `422` - validation failed; {@link field} names the offending key. */
  get isValidationError(): boolean {
    return this.status === 422;
  }

  /** `503 unavailable` - the feature is not present on this build or hardware. */
  get isUnavailable(): boolean {
    return this.status === 503 && this.code !== 'serviceBusy';
  }

  /** `503 serviceBusy` - retry after {@link retryAfterMs}. */
  get isBusy(): boolean {
    return this.code === 'serviceBusy';
  }

  /** `507` - storage, app cap or notification queue is full. */
  get isInsufficientStorage(): boolean {
    return this.status === 507;
  }
}

/** Why a request did not produce any HTTP response. */
export type AwtrixConnectionErrorKind = 'timeout' | 'refused' | 'unreachable' | 'dns' | 'reset' | 'aborted' | 'network';

/** The device could not be reached (timeout, refused, DNS, reset ...). */
export class AwtrixConnectionError extends AwtrixError {
  readonly kind: AwtrixConnectionErrorKind;
  /** Low-level error code, e.g. `ECONNREFUSED` or `ETIMEDOUT`. */
  readonly code?: string;
  readonly method: string;
  readonly path: string;

  constructor(kind: AwtrixConnectionErrorKind, method: string, path: string, message: string, code?: string, cause?: unknown) {
    super(`${method} ${path} failed (${kind}): ${message}`, { cause });
    this.kind = kind;
    this.code = code;
    this.method = method;
    this.path = path;
  }

  get isTimeout(): boolean {
    return this.kind === 'timeout';
  }
}

/** An argument was rejected before any request was sent. */
export class AwtrixValidationError extends AwtrixError {
  /** The argument at fault. */
  readonly field: string;

  constructor(field: string, message: string) {
    super(`Invalid ${field}: ${message}`);
    this.field = field;
  }
}

/** The device answered with a body this library cannot interpret. */
export class AwtrixResponseError extends AwtrixError {
  readonly status: number;
  readonly method: string;
  readonly path: string;
  readonly body: unknown;

  constructor(status: number, method: string, path: string, message: string, body: unknown) {
    super(`${method} ${path}: ${message}`);
    this.status = status;
    this.method = method;
    this.path = path;
    this.body = body;
  }
}

export function isAwtrixError(error: unknown): error is AwtrixError {
  return error instanceof AwtrixError;
}

export function isAwtrixApiError(error: unknown): error is AwtrixApiError {
  return error instanceof AwtrixApiError;
}

export function isAwtrixConnectionError(error: unknown): error is AwtrixConnectionError {
  return error instanceof AwtrixConnectionError;
}
