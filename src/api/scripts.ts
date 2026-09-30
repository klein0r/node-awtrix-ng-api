import type { RequestOptions } from '../http.js';
import { AwtrixValidationError } from '../errors.js';
import type {
  ScriptConfig,
  ScriptConfigUpdate,
  ScriptData,
  ScriptDataUpdate,
  ScriptSoundList,
  ScriptWriteResult,
  SharedValue,
} from '../types/apps.js';
import type { AppName, OkResponse } from '../types/common.js';
import type { UploadContent } from '../types/files.js';
import { assertAppName, assertNonEmptyObject, normalizeMp3Name, segment } from '../validation.js';
import { ApiModule, toFormData, UPLOAD_TIMEOUT } from './base.js';

/** Berry scripts: source, install, settings and the shared key/value space. */
export class ScriptsApi extends ApiModule {
  /** `GET /api/v1/apps/script/{name}` - the raw Berry source, byte for byte. */
  async getSource(name: AppName, options?: RequestOptions): Promise<string> {
    assertAppName(name);
    return this.http
      .request<string>({ method: 'GET', path: `/api/v1/apps/script/${segment(name)}`, response: 'text', options })
      .then((res) => res.data);
  }

  /**
   * `PUT /api/v1/apps/script/{name}` - installs or replaces a script.
   *
   * A script that does not compile **still installs**: the promise resolves and `error`
   * carries the compiler message. Only `error === null` means the script works.
   */
  async install(name: AppName, source: string, options?: RequestOptions): Promise<ScriptWriteResult> {
    assertAppName(name);
    if (typeof source !== 'string' || source.length === 0) {
      throw new AwtrixValidationError('source', 'must be a non-empty string');
    }
    return this.json({
      method: 'PUT',
      path: `/api/v1/apps/script/${segment(name)}`,
      body: source,
      contentType: 'text/plain; charset=utf-8',
      options,
    });
  }

  /**
   * `PUT /api/v1/apps/script-update/{name}` - replaces the script only if its source still
   * equals `expectedSource` (optimistic locking). `expectedSource: null` creates the script
   * only if the name is free. Rejects with `409 scriptChanged` otherwise.
   * Requires `capabilities.scriptUpdates`.
   */
  async updateIfUnchanged(name: AppName, expectedSource: string | null, source: string, options?: RequestOptions): Promise<OkResponse> {
    assertAppName(name);
    if (expectedSource !== null && typeof expectedSource !== 'string') {
      throw new AwtrixValidationError('expectedSource', 'must be a string or null');
    }
    if (typeof source !== 'string' || source.length === 0) {
      throw new AwtrixValidationError('source', 'must be a non-empty string');
    }
    return this.ok({
      method: 'PUT',
      path: `/api/v1/apps/script-update/${segment(name)}`,
      json: { expected_source: expectedSource, source },
      options,
    });
  }

  /**
   * Removes a script together with its persisted store (`DELETE /api/v1/apps/{name}`). Its own
   * sounds stay (1.1.4+); remove them with {@link deleteAllSounds}.
   */
  async delete(name: AppName, options?: RequestOptions): Promise<OkResponse> {
    assertAppName(name);
    return this.ok({ method: 'DELETE', path: `/api/v1/apps/${segment(name)}`, options });
  }

  /** `GET /api/v1/apps/{name}/config` - the declared settings with their current values. */
  async getConfig(name: AppName, options?: RequestOptions): Promise<ScriptConfig> {
    assertAppName(name);
    return this.json(this.read(`/api/v1/apps/${segment(name)}/config`, options));
  }

  /**
   * `PATCH /api/v1/apps/{name}/config` - changes settings and restarts the script.
   * All-or-nothing; numbers outside `min`/`max` are clamped by the device.
   */
  async updateConfig(name: AppName, values: ScriptConfigUpdate, options?: RequestOptions): Promise<ScriptWriteResult> {
    assertAppName(name);
    assertNonEmptyObject(values, 'values');
    for (const [key, value] of Object.entries(values)) {
      if (!['string', 'number', 'boolean'].includes(typeof value)) {
        throw new AwtrixValidationError(key, 'must be a string, number or boolean');
      }
    }
    return this.json({ method: 'PATCH', path: `/api/v1/apps/${segment(name)}/config`, json: values, options });
  }

  /* --- Saved data (1.1.4+) --- */

  /**
   * `GET /api/v1/apps/{name}/data` - what the script saved with `store.set()`, without its
   * `@config` settings. `{}` when it saved nothing.
   */
  async getData(name: AppName, options?: RequestOptions): Promise<ScriptData> {
    assertAppName(name);
    return this.json(this.read(`/api/v1/apps/${segment(name)}/data`, options));
  }

  /**
   * `PATCH /api/v1/apps/{name}/data` - changes saved values and restarts the script. `null`
   * removes a key. Keys that are `@config` settings are refused with `422`; use
   * {@link updateConfig} for those.
   */
  async updateData(name: AppName, values: ScriptDataUpdate, options?: RequestOptions): Promise<ScriptWriteResult> {
    assertAppName(name);
    assertNonEmptyObject(values, 'values');
    return this.json({ method: 'PATCH', path: `/api/v1/apps/${segment(name)}/data`, json: values, options });
  }

  /* --- Own sounds (1.1.4+) --- */

  /** `GET /api/v1/apps/script/{name}/sounds` - the script's own MP3s with their SHA-256. */
  async listSounds(name: AppName, options?: RequestOptions): Promise<ScriptSoundList> {
    assertAppName(name);
    return this.json(this.read(`/api/v1/apps/script/${segment(name)}/sounds`, options));
  }

  /**
   * `POST /api/v1/apps/script/{name}/sounds` - uploads one MP3 into the script's folder,
   * replacing a sound of the same name. The script must be installed first.
   */
  async uploadSound(name: AppName, soundName: string, content: UploadContent, options?: RequestOptions): Promise<OkResponse> {
    assertAppName(name);
    const fileName = `${normalizeMp3Name(soundName)}.mp3`;
    return this.ok({
      method: 'POST',
      path: `/api/v1/apps/script/${segment(name)}/sounds`,
      body: toFormData('file', content, fileName, 'audio/mpeg'),
      options: { timeout: UPLOAD_TIMEOUT, ...options },
    });
  }

  /** `DELETE /api/v1/apps/script/{name}/sounds/{sound}` - `soundName` with or without `.mp3`. */
  async deleteSound(name: AppName, soundName: string, options?: RequestOptions): Promise<OkResponse> {
    assertAppName(name);
    const sound = normalizeMp3Name(soundName);
    return this.ok({ method: 'DELETE', path: `/api/v1/apps/script/${segment(name)}/sounds/${segment(sound)}`, options });
  }

  /**
   * `DELETE /api/v1/apps/script/{name}/sounds` - deletes all of the script's sounds. Deleting a
   * script keeps its sounds, so this is how they are removed.
   */
  async deleteAllSounds(name: AppName, options?: RequestOptions): Promise<OkResponse> {
    assertAppName(name);
    return this.ok({ method: 'DELETE', path: `/api/v1/apps/script/${segment(name)}/sounds`, options });
  }

  /** `GET /api/v1/scripts/shared` - what scripts have published to each other (volatile). */
  async getShared(options?: RequestOptions): Promise<SharedValue[]> {
    return this.json(this.read('/api/v1/scripts/shared', options));
  }
}
