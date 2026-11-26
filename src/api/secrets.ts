import type { RequestOptions } from '../http.js';
import { AwtrixValidationError } from '../errors.js';
import type { OkResponse } from '../types/common.js';
import type { SecretKeys, SecretList, SecretValues } from '../types/secrets.js';
import { assertAppName, segment } from '../validation.js';
import { ApiModule } from './base.js';

const SECRET_KEY = /^[A-Za-z_][A-Za-z0-9_]{0,23}$/;

/**
 * API keys of scripts with an `@secret` line (TC002, 1.2.3+). Only while
 * `capabilities.secret` is `true`, which needs scripting on. No route ever returns a key.
 *
 * The routes that change a key accept requests only as the device's own web UI sends them;
 * this client adds the documented `X-Awtrix-Secret` and `Origin` headers.
 */
export class SecretsApi extends ApiModule {
  /** `GET /api/v1/secrets` - installed scripts with an `@secret` line, also invalid ones. */
  async list(options?: RequestOptions): Promise<SecretList> {
    return this.json(this.read('/api/v1/secrets', options));
  }

  /**
   * `GET /api/v1/secrets/{name}` - says per key whether a value is saved, or (`invalid`) why
   * the script's `@secret` lines are unusable. `404` for a script without an `@secret` line.
   */
  async get(name: string, options?: RequestOptions): Promise<SecretKeys> {
    assertAppName(name);
    return this.json(this.read(`/api/v1/secrets/${segment(name)}`, options));
  }

  /**
   * `PUT /api/v1/secrets/{name}` - saves keys; `""` erases one, keys left out keep their value.
   * A value is at most 512 bytes without control characters, else `422`. All or nothing.
   */
  async set(name: string, values: SecretValues, options?: RequestOptions): Promise<OkResponse> {
    assertAppName(name);
    if (typeof values !== 'object' || values === null || Array.isArray(values)) {
      throw new AwtrixValidationError('values', 'must be an object of key → string');
    }
    for (const [key, value] of Object.entries(values)) {
      if (typeof value !== 'string') throw new AwtrixValidationError(key, 'must be a string');
    }
    return this.ok({
      method: 'PUT',
      path: `/api/v1/secrets/${segment(name)}`,
      json: values,
      headers: this.webUiHeaders('X-Awtrix-Secret'),
      options,
    });
  }

  /** `DELETE /api/v1/secrets/{name}/{key}` - erases one key; also `200` when it was not set. */
  async delete(name: string, key: string, options?: RequestOptions): Promise<OkResponse> {
    assertAppName(name);
    if (typeof key !== 'string' || !SECRET_KEY.test(key)) {
      throw new AwtrixValidationError('key', 'must match [A-Za-z_][A-Za-z0-9_]{0,23}');
    }
    return this.ok({
      method: 'DELETE',
      path: `/api/v1/secrets/${segment(name)}/${segment(key)}`,
      headers: this.webUiHeaders('X-Awtrix-Secret'),
      options,
    });
  }
}
