import type { HttpTransport, RequestOptions, TransportRequest } from '../http.js';
import { AwtrixValidationError } from '../errors.js';
import type { OkResponse } from '../types/common.js';
import type { UploadContent } from '../types/files.js';

/** Default timeout of multipart uploads (MP3s, firmware, backups) in ms. */
export const UPLOAD_TIMEOUT = 120_000;

/** Shared plumbing of the API namespaces. */
export abstract class ApiModule {
  constructor(protected readonly http: HttpTransport) {}

  /** Sends a request and returns the parsed JSON body. */
  protected async json<T>(req: TransportRequest): Promise<T> {
    const res = await this.http.request<T>(req);
    return res.data;
  }

  /** Sends a request whose success body is `{"ok":true}`. */
  protected async ok(req: TransportRequest): Promise<OkResponse> {
    const res = await this.http.request<OkResponse | undefined>(req);
    return res.data ?? { ok: true };
  }

  /** Builds a plain `GET` request. */
  protected read(path: string, options?: RequestOptions, query?: TransportRequest['query']): TransportRequest {
    return { method: 'GET', path, query, options };
  }
}

/** Wraps upload content into a single-file multipart form. */
export function toFormData(field: string, content: UploadContent, fileName: string, contentType?: string): FormData {
  if (typeof FormData === 'undefined' || typeof Blob === 'undefined') {
    throw new AwtrixValidationError('content', 'multipart uploads need FormData and Blob (Node.js 18 or newer)');
  }
  let blob: Blob;
  if (content instanceof Blob) {
    blob = content;
  } else if (content instanceof ArrayBuffer || ArrayBuffer.isView(content)) {
    blob = new Blob([content], contentType ? { type: contentType } : undefined);
  } else {
    throw new AwtrixValidationError('content', 'must be a Blob, Buffer, Uint8Array or ArrayBuffer');
  }
  if (blob.size === 0) {
    throw new AwtrixValidationError('content', 'must not be empty');
  }
  const form = new FormData();
  form.append(field, blob, fileName);
  return form;
}
