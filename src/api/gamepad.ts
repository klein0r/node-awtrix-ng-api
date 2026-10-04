import type { RequestOptions } from '../http.js';
import type { OkResponse } from '../types/common.js';
import type { GamepadPairResult, GamepadSlot, GamepadState } from '../types/system.js';
import { assertInteger } from '../validation.js';
import { ApiModule } from './base.js';

/**
 * Bluetooth gamepads in two slots. Only where `capabilities.gamepad` is `true` (the TC002);
 * elsewhere every route answers `404`.
 */
export class GamepadApi extends ApiModule {
  /** `GET /api/v1/gamepad` - both slots, empty ones included. */
  async get(options?: RequestOptions): Promise<GamepadState> {
    return this.json(this.read('/api/v1/gamepad', options));
  }

  /**
   * `POST /api/v1/gamepad/pair` - looks for a new gamepad in pairing mode for a minute and
   * resolves with the slot the search runs for. Rejects with `409 gamepadsFull` when both slots
   * are taken. Follow the result with {@link get}.
   */
  async pair(options?: RequestOptions): Promise<GamepadPairResult> {
    return this.json({ method: 'POST', path: '/api/v1/gamepad/pair', options });
  }

  /** `DELETE /api/v1/gamepad/{id}` - forgets the gamepad in this slot (`200` also when empty). */
  async forget(slot: GamepadSlot, options?: RequestOptions): Promise<OkResponse> {
    assertInteger(slot, 'slot', 1, 2);
    return this.ok({ method: 'DELETE', path: `/api/v1/gamepad/${slot}`, options });
  }
}
