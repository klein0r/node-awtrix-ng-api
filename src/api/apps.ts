import type { RequestOptions } from '../http.js';
import { AwtrixValidationError } from '../errors.js';
import type { AppInfo, AppOrder, BuiltinAppConfig, BuiltinAppConfigUpdate, BuiltinConfigWriteResult } from '../types/apps.js';
import type { AppName, OkResponse } from '../types/common.js';
import type { AppPayload } from '../types/payload.js';
import { assertAppName, assertNonEmptyObject, segment } from '../validation.js';
import { ApiModule } from './base.js';

export interface SwitchAppOptions extends RequestOptions {
  /** Jump instantly instead of playing the transition. Default `false`. */
  fast?: boolean;
}

/** The app collection: inventory, rotation, pushed apps and removal. */
export class AppsApi extends ApiModule {
  /** `GET /api/v1/apps` - the arranged apps in order, then everything else. */
  async list(options?: RequestOptions): Promise<AppInfo[]> {
    return this.json(this.read('/api/v1/apps', options));
  }

  /**
   * `PUT /api/v1/apps/active` - shows the app. Rejects with `404` for an unknown app. Naming an
   * `@ondemand` script (1.1.4+) starts it; that can fail with `503` or `507` for lack of memory.
   */
  async switchTo(name: AppName, options: SwitchAppOptions = {}): Promise<OkResponse> {
    if (typeof name !== 'string' || name.length === 0) {
      throw new AwtrixValidationError('name', 'must be a non-empty string');
    }
    const { fast, ...requestOptions } = options;
    const json = fast === undefined ? { name } : { name, fast };
    return this.ok({ method: 'PUT', path: '/api/v1/apps/active', json, options: requestOptions });
  }

  /** `POST /api/v1/apps/next` - advances the rotation. */
  async next(options?: RequestOptions): Promise<OkResponse> {
    return this.ok({ method: 'POST', path: '/api/v1/apps/next', options });
  }

  /** `POST /api/v1/apps/previous` - steps the rotation back. */
  async previous(options?: RequestOptions): Promise<OkResponse> {
    return this.ok({ method: 'POST', path: '/api/v1/apps/previous', options });
  }

  /**
   * `PUT /api/v1/apps/order` - which apps are switched off and (optionally) the drawing
   * order. Apps named in neither list keep their state.
   */
  async setOrder(order: AppOrder, options?: RequestOptions): Promise<OkResponse> {
    if (typeof order !== 'object' || order === null || !Array.isArray(order.disabled)) {
      throw new AwtrixValidationError('disabled', 'is required (use [] to switch nothing off)');
    }
    if (order.order !== undefined && !Array.isArray(order.order)) {
      throw new AwtrixValidationError('order', 'must be an array of app names');
    }
    for (const name of [...(order.order ?? []), ...order.disabled]) {
      if (typeof name !== 'string' || name.length === 0) {
        throw new AwtrixValidationError('order', 'app names must be non-empty strings');
      }
    }
    return this.ok({ method: 'PUT', path: '/api/v1/apps/order', json: order, options });
  }

  /** Switches the given apps off without touching the arrangement. */
  async disable(names: readonly AppName[], options?: RequestOptions): Promise<OkResponse> {
    return this.setOrder({ disabled: names }, options);
  }

  /**
   * `PUT /api/v1/apps/pushed/{name}` - creates or replaces a pushed app (held in RAM only).
   * An array creates the indexed apps `{name}0`, `{name}1`, ... and is all-or-nothing.
   */
  async push(name: AppName, payload: AppPayload | readonly AppPayload[], options?: RequestOptions): Promise<OkResponse> {
    assertAppName(name);
    if (Array.isArray(payload)) {
      if (payload.length === 0) throw new AwtrixValidationError('payload', 'must not be an empty array');
      payload.forEach((page, i) => assertNonEmptyObject(page, `payload[${i}]`));
    } else {
      // An empty body is refused by the device; removal is delete().
      assertNonEmptyObject(payload, 'payload');
    }
    return this.ok({ method: 'PUT', path: `/api/v1/apps/pushed/${segment(name)}`, json: payload, options });
  }

  /**
   * `GET /api/v1/apps/builtin/{name}/config` - the settings a built-in app (Time, Date, ...)
   * offers on this device. `404` when the device has no such built-in app.
   */
  async getBuiltinConfig(name: string, options?: RequestOptions): Promise<BuiltinAppConfig> {
    assertBuiltinName(name);
    return this.json(this.read(`/api/v1/apps/builtin/${segment(name)}/config`, options));
  }

  /**
   * `PATCH /api/v1/apps/builtin/{name}/config` - changes settings of a built-in app, each at its
   * field's `path` (`['weekdayBar', 'show']` is sent as `{ weekdayBar: { show } }`).
   * All-or-nothing; a setting the app does not offer answers `422`.
   */
  async updateBuiltinConfig(name: string, values: BuiltinAppConfigUpdate, options?: RequestOptions): Promise<BuiltinConfigWriteResult> {
    assertBuiltinName(name);
    assertNonEmptyObject(values, 'values');
    return this.json({ method: 'PATCH', path: `/api/v1/apps/builtin/${segment(name)}/config`, json: values, options });
  }

  /**
   * `DELETE /api/v1/apps/{name}` - removes whatever app carries the name (pushed incl. its
   * indexed children, or a script together with its store). Succeeds for unknown names.
   */
  async delete(name: AppName, options?: RequestOptions): Promise<OkResponse> {
    assertAppName(name);
    return this.ok({ method: 'DELETE', path: `/api/v1/apps/${segment(name)}`, options });
  }
}

function assertBuiltinName(name: unknown): asserts name is string {
  if (typeof name !== 'string' || !/^[A-Za-z0-9_-]{1,32}$/.test(name)) {
    throw new AwtrixValidationError('name', 'must match [A-Za-z0-9_-]{1,32}');
  }
}
