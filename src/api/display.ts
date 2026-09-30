import type { RequestOptions } from '../http.js';
import type { OkResponse } from '../types/common.js';
import type { DisplayState, DisplayUpdate, MoodlightOptions, ScreenBuffer } from '../types/device.js';
import type { EffectSettings, OverlayName } from '../types/visuals.js';
import { assertNonEmptyObject, assertOptionalInteger } from '../validation.js';
import { ApiModule } from './base.js';

/** Panel power, global weather overlay, mood light and framebuffer. */
export class DisplayApi extends ApiModule {
  /** `GET /api/v1/display`. */
  get(options?: RequestOptions): Promise<DisplayState> {
    return this.json(this.read('/api/v1/display', options));
  }

  /** `PATCH /api/v1/display` - power and/or global overlay. Applied completely or not at all. */
  update(patch: DisplayUpdate, options?: RequestOptions): Promise<OkResponse> {
    assertNonEmptyObject(patch, 'patch');
    return this.ok({ method: 'PATCH', path: '/api/v1/display', json: patch, options });
  }

  /** Switches the panel on or off. */
  setPower(on: boolean, options?: RequestOptions): Promise<OkResponse> {
    return this.update({ power: on }, options);
  }

  /** Sets the global weather overlay drawn over all apps. */
  setOverlay(overlay: OverlayName, settings?: EffectSettings, options?: RequestOptions): Promise<OkResponse> {
    return this.update(settings ? { overlay, overlaySettings: settings } : { overlay }, options);
  }

  /** Removes the global weather overlay (and resets its settings). */
  clearOverlay(options?: RequestOptions): Promise<OkResponse> {
    return this.update({ overlay: null }, options);
  }

  /**
   * `PUT /api/v1/display/moodlight` - floods the panel with one color. `kelvin` wins over
   * `color`; omitted fields keep their previous value.
   */
  setMoodlight(moodlight: MoodlightOptions, options?: RequestOptions): Promise<OkResponse> {
    assertNonEmptyObject(moodlight, 'moodlight');
    // The firmware silently wraps brightness to 8 bits, so it is range-checked here.
    // kelvin is clamped to 1000..40000 by the device itself.
    assertOptionalInteger(moodlight, 'brightness', 0, 255);
    return this.ok({ method: 'PUT', path: '/api/v1/display/moodlight', json: moodlight, options });
  }

  /** `DELETE /api/v1/display/moodlight` - turns the mood light off. */
  disableMoodlight(options?: RequestOptions): Promise<OkResponse> {
    return this.ok({ method: 'DELETE', path: '/api/v1/display/moodlight', options });
  }

  /**
   * `GET /api/v1/display/screen` - the framebuffer as packed `0xRRGGBB` integers, row-major.
   * Brightness and color correction are not applied.
   */
  getScreen(options?: RequestOptions): Promise<ScreenBuffer> {
    return this.json(this.read('/api/v1/display/screen', options));
  }
}
