import type { RequestOptions } from '../http.js';
import type { OkResponse } from '../types/common.js';
import type { IndicatorId, IndicatorUpdate } from '../types/device.js';
import { assertInteger, assertNonEmptyObject, assertOptionalInteger } from '../validation.js';
import { ApiModule } from './base.js';

/** The three indicator pixels on the right edge: 1 top, 2 middle, 3 bottom. */
export class IndicatorsApi extends ApiModule {
  /**
   * `PUT /api/v1/indicators/{id}`. Only the presence of `color` changes on/off; `0`/`null`
   * switches off but keeps the stored color. Omitted `blinkMs`/`fadeMs` keep their value.
   */
  set(id: IndicatorId, update: IndicatorUpdate, options?: RequestOptions): Promise<OkResponse> {
    assertInteger(id, 'id', 1, 3);
    assertNonEmptyObject(update, 'update');
    // The firmware wraps these to 16 bits without complaint, so they are checked here.
    assertOptionalInteger(update, 'blinkMs', 0, 65535);
    assertOptionalInteger(update, 'fadeMs', 0, 65535);
    return this.ok({ method: 'PUT', path: `/api/v1/indicators/${id}`, json: update, options });
  }

  /** `DELETE /api/v1/indicators/{id}` - off, color, `blinkMs` and `fadeMs` back to `0`. */
  clear(id: IndicatorId, options?: RequestOptions): Promise<OkResponse> {
    assertInteger(id, 'id', 1, 3);
    return this.ok({ method: 'DELETE', path: `/api/v1/indicators/${id}`, options });
  }
}
