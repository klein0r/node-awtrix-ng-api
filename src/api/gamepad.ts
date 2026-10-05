import type { RequestOptions } from '../http.js';
import type { OkResponse } from '../types/common.js';
import type { GamepadPairResult, GamepadRemoteRequest, GamepadRemoteSession, GamepadSlot, GamepadState } from '../types/system.js';
import { AwtrixValidationError } from '../errors.js';
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

  /**
   * `POST /api/v1/gamepad/remote` - makes a phone the gamepad of one player
   * (`capabilities.gamepadRemote`). Resolves with the UDP port and token the phone sends its
   * controls to. Without `player` the clock picks a free one.
   */
  async connectRemote(request: GamepadRemoteRequest = {}, options?: RequestOptions): Promise<GamepadRemoteSession> {
    if (typeof request !== 'object' || request === null || Array.isArray(request)) {
      throw new AwtrixValidationError('request', 'must be an object');
    }
    if (request.player !== undefined) assertInteger(request.player, 'player', 1, 2);
    if (request.name !== undefined && (typeof request.name !== 'string' || request.name.length > 32)) {
      throw new AwtrixValidationError('name', 'must be a string of at most 32 characters');
    }
    return this.json({ method: 'POST', path: '/api/v1/gamepad/remote', json: request, options });
  }

  /** `DELETE /api/v1/gamepad/remote/{session}` - ends one phone's session. `404` for an unknown session. */
  async disconnectRemote(session: number, options?: RequestOptions): Promise<OkResponse> {
    assertInteger(session, 'session', 1, Number.MAX_SAFE_INTEGER);
    return this.ok({ method: 'DELETE', path: `/api/v1/gamepad/remote/${session}`, options });
  }
}
