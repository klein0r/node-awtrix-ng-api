import type { RequestOptions } from '../http.js';
import { AwtrixValidationError } from '../errors.js';
import type { AssetDirectory, OkResponse } from '../types/common.js';
import type { FileList, IconOrigin, UploadContent } from '../types/files.js';
import { assertIconFileName, assertNonEmptyString } from '../validation.js';
import { ApiModule, toFormData, UPLOAD_TIMEOUT } from './base.js';

const WRITABLE_DIRECTORIES: readonly string[] = ['/ICONS', '/MELODIES', '/PALETTES', '/MP3'];
const READABLE_PREFIXES: readonly string[] = ['/ICONS/', '/MELODIES/', '/PALETTES/', '/MP3/', '/SCRIPTS/'];

/** The LittleFS file system: icons, melodies, palettes, MP3s - plus icon origin links. */
export class FilesApi extends ApiModule {
  /** `GET /api/v1/files?dir=` - a directory listing (empty for an unknown directory). */
  async list(dir: AssetDirectory = '/ICONS', options?: RequestOptions): Promise<FileList> {
    assertNonEmptyString(dir, 'dir');
    return this.json(this.read('/api/v1/files', options, { dir }));
  }

  /**
   * `POST /api/v1/files?dir=` - uploads one file. The content must match the folder:
   * `/ICONS` GIF or JPEG, `/MELODIES` RTTTL text, `/PALETTES` `RRGGBB` lines, `/MP3` MP3.
   */
  async upload(dir: Exclude<AssetDirectory, '/SCRIPTS'>, fileName: string, content: UploadContent, options?: RequestOptions): Promise<OkResponse> {
    if (!WRITABLE_DIRECTORIES.includes(dir)) {
      throw new AwtrixValidationError('dir', `must be one of ${WRITABLE_DIRECTORIES.join(', ')}`);
    }
    assertPlainFileName(fileName);
    return this.ok({
      method: 'POST',
      path: '/api/v1/files',
      query: { dir },
      body: toFormData('file', content, fileName),
      options: { timeout: UPLOAD_TIMEOUT, ...options },
    });
  }

  /** Uploads an icon (`.gif` or `.jpg`) to `/ICONS`. */
  async uploadIcon(fileName: string, content: UploadContent, options?: RequestOptions): Promise<OkResponse> {
    if (!/\.(gif|jpe?g)$/i.test(fileName)) {
      throw new AwtrixValidationError('fileName', 'icons must be .gif or .jpg files');
    }
    return this.upload('/ICONS', fileName, content, options);
  }

  /** `DELETE /api/v1/files?path=` - e.g. `"/ICONS/1234.jpg"`. Also removes an icon's origin link. */
  async delete(path: string, options?: RequestOptions): Promise<OkResponse> {
    assertAssetPath(path, WRITABLE_DIRECTORIES.map((d) => `${d}/`));
    return this.ok({ method: 'DELETE', path: '/api/v1/files', query: { path }, options });
  }

  /** Downloads a stored file via the static asset routes, e.g. `"/ICONS/1234.gif"`. */
  async download(path: string, options?: RequestOptions): Promise<Uint8Array> {
    assertAssetPath(path, READABLE_PREFIXES);
    const encoded = path
      .split('/')
      .map((part) => encodeURIComponent(part))
      .join('/');
    const res = await this.http.request<Uint8Array>({ method: 'GET', path: encoded, response: 'binary', options });
    return res.data;
  }

  /* --- Icon origins --- */

  /** `GET /api/v1/icons/origins` - links between installed icons and their published originals. */
  async listIconOrigins(options?: RequestOptions): Promise<IconOrigin[]> {
    const body = await this.json<{ icons: IconOrigin[] }>(this.read('/api/v1/icons/origins', options));
    return body.icons;
  }

  /** `PUT /api/v1/icons/origins` - creates or replaces the link of one existing icon. */
  async setIconOrigin(origin: IconOrigin, options?: RequestOptions): Promise<OkResponse> {
    assertIconFileName(origin?.name);
    if (typeof origin.hub !== 'string' || !/^https:\/\/[^@?#%\\ ]+\/icons\/$/.test(origin.hub) || origin.hub.length > 240) {
      throw new AwtrixValidationError('hub', 'must be an https URL ending in /icons/ (at most 240 characters)');
    }
    if (typeof origin.slug !== 'string' || !/^[a-z0-9_-]{1,32}$/.test(origin.slug)) {
      throw new AwtrixValidationError('slug', 'must match [a-z0-9_-]{1,32}');
    }
    if (typeof origin.sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(origin.sha256)) {
      throw new AwtrixValidationError('sha256', 'must be 64 lowercase hex characters');
    }
    const { name, hub, slug, sha256 } = origin;
    return this.ok({ method: 'PUT', path: '/api/v1/icons/origins', json: { name, hub, slug, sha256 }, options });
  }

  /**
   * `POST /api/v1/icons/rename` - renames an icon (same extension); its origin record moves
   * along. Apps that use the old name show no icon until changed. `409 nameTaken` when the new
   * name exists as `.gif` or `.jpg`.
   */
  async renameIcon(from: string, to: string, options?: RequestOptions): Promise<OkResponse> {
    assertIconFileName(from);
    assertIconFileName(to);
    if (from.slice(from.lastIndexOf('.')) !== to.slice(to.lastIndexOf('.'))) {
      throw new AwtrixValidationError('to', 'must have the same extension as from');
    }
    return this.ok({ method: 'POST', path: '/api/v1/icons/rename', json: { from, to }, options });
  }

  /** `DELETE /api/v1/icons/origins?name=` - removes the link only, the icon stays. */
  async deleteIconOrigin(fileName: string, options?: RequestOptions): Promise<OkResponse> {
    assertIconFileName(fileName);
    return this.ok({ method: 'DELETE', path: '/api/v1/icons/origins', query: { name: fileName }, options });
  }
}

function assertPlainFileName(fileName: unknown): asserts fileName is string {
  if (typeof fileName !== 'string' || fileName.length === 0 || fileName.includes('/') || fileName.includes('..')) {
    throw new AwtrixValidationError('fileName', 'must be a plain file name without "/" or ".."');
  }
}

function assertAssetPath(path: unknown, prefixes: readonly string[]): asserts path is string {
  if (typeof path !== 'string' || path.includes('..') || !prefixes.some((p) => path.startsWith(p) && path.length > p.length)) {
    throw new AwtrixValidationError('path', `must be a file below ${prefixes.join(', ')} without ".."`);
  }
}
