import type { RequestOptions } from '../http.js';
import type { OkResponse } from '../types/common.js';
import type { GamepadState } from '../types/system.js';
import { ApiModule } from './base.js';

/**
 * Bluetooth gamepad (firmware 1.1.4+). Only where `capabilities.gamepad` is `true` (the
 * TC002); elsewhere every route answers `404`.
 */
export class GamepadApi extends ApiModule {
  /** `GET /api/v1/gamepad` - the paired gamepad and its connection state. */
  async get(options?: RequestOptions): Promise<GamepadState> {
    return this.json(this.read('/api/v1/gamepad', options));
  }

  /**
   * `POST /api/v1/gamepad/pair` - looks for a gamepad in pairing mode for a minute. Answers at
   * once; follow the result with {@link get}.
   */
  async pair(options?: RequestOptions): Promise<OkResponse> {
    return this.ok({ method: 'POST', path: '/api/v1/gamepad/pair', options });
  }

  /** `DELETE /api/v1/gamepad` - forgets the paired gamepad. */
  async forget(options?: RequestOptions): Promise<OkResponse> {
    return this.ok({ method: 'DELETE', path: '/api/v1/gamepad', options });
  }
}
