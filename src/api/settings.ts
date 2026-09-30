import type { RequestOptions } from '../http.js';
import { AwtrixValidationError } from '../errors.js';
import type { OkResponse } from '../types/common.js';
import type { Settings, SettingsUpdate } from '../types/settings.js';
import { assertOptionalInteger } from '../validation.js';
import { ApiModule } from './base.js';

/** The saved preferences: brightness, colors, clock/date format, transitions, volumes. */
export class SettingsApi extends ApiModule {
  /** `GET /api/v1/settings` - every settings key. */
  async get(options?: RequestOptions): Promise<Settings> {
    return this.json(this.read('/api/v1/settings', options));
  }

  /**
   * `PATCH /api/v1/settings` - any subset of the keys. Applied completely or not at all;
   * resolves with the full, updated settings.
   */
  async update(patch: SettingsUpdate, options?: RequestOptions): Promise<Settings> {
    if (typeof patch !== 'object' || patch === null || Array.isArray(patch)) {
      throw new AwtrixValidationError('patch', 'must be an object');
    }
    const p = patch as Record<string, unknown>;
    assertOptionalInteger(p, 'brightness', 0, 255);
    assertOptionalInteger(p, 'saturation', 0, 100);
    assertOptionalInteger(p, 'timeMode', 0, 6);
    for (const key of ['buzzerVolume', 'dfplayerVolume', 'mp3Volume', 'radioVolume']) {
      assertOptionalInteger(p, key, 0, 100);
    }
    return this.json({ method: 'PATCH', path: '/api/v1/settings', json: patch, options });
  }

  /** Shorthand for `update({ brightness })`, `0..255`. */
  async setBrightness(brightness: number, options?: RequestOptions): Promise<Settings> {
    return this.update({ brightness }, options);
  }

  /**
   * `POST /api/v1/settings/reset` - clears the settings and **reboots**. Wi-Fi, MQTT and the
   * GPIO map are not touched.
   */
  async reset(options?: RequestOptions): Promise<OkResponse> {
    return this.ok({ method: 'POST', path: '/api/v1/settings/reset', options });
  }
}
