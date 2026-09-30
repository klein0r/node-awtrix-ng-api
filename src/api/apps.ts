import type { RequestOptions } from '../http.js';
import { AwtrixValidationError } from '../errors.js';
import type { AppInfo, AppOrder } from '../types/apps.js';
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
  list(options?: RequestOptions): Promise<AppInfo[]> {
    return this.json(this.read('/api/v1/apps', options));
  }

  /** `PUT /api/v1/apps/active` - shows the app. Rejects with `404` for an unknown app. */
  switchTo(name: AppName, options: SwitchAppOptions = {}): Promise<OkResponse> {
    if (typeof name !== 'string' || name.length === 0) {
      throw new AwtrixValidationError('name', 'must be a non-empty string');
    }
    const { fast, ...requestOptions } = options;
    const json = fast === undefined ? { name } : { name, fast };
    return this.ok({ method: 'PUT', path: '/api/v1/apps/active', json, options: requestOptions });
  }

  /** `POST /api/v1/apps/next` - advances the rotation. */
  next(options?: RequestOptions): Promise<OkResponse> {
    return this.ok({ method: 'POST', path: '/api/v1/apps/next', options });
  }

  /** `POST /api/v1/apps/previous` - steps the rotation back. */
  previous(options?: RequestOptions): Promise<OkResponse> {
    return this.ok({ method: 'POST', path: '/api/v1/apps/previous', options });
  }

  /**
   * `PUT /api/v1/apps/order` - which apps are switched off and (optionally) the drawing
   * order. Apps named in neither list keep their state.
   */
  setOrder(order: AppOrder, options?: RequestOptions): Promise<OkResponse> {
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
  disable(names: readonly AppName[], options?: RequestOptions): Promise<OkResponse> {
    return this.setOrder({ disabled: names }, options);
  }

  /**
   * `PUT /api/v1/apps/pushed/{name}` - creates or replaces a pushed app (held in RAM only).
   * An array creates the indexed apps `{name}0`, `{name}1`, ... and is all-or-nothing.
   */
  push(name: AppName, payload: AppPayload | readonly AppPayload[], options?: RequestOptions): Promise<OkResponse> {
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
   * `DELETE /api/v1/apps/{name}` - removes whatever app carries the name (pushed incl. its
   * indexed children, or a script together with its store). Succeeds for unknown names.
   */
  delete(name: AppName, options?: RequestOptions): Promise<OkResponse> {
    assertAppName(name);
    return this.ok({ method: 'DELETE', path: `/api/v1/apps/${segment(name)}`, options });
  }
}
