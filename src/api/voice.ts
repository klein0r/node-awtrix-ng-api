import type { RequestOptions } from '../http.js';
import type { VoiceState } from '../types/system.js';
import { ApiModule } from './base.js';

/**
 * Home Assistant Voice (firmware 1.1.4+). Only where `capabilities.voice` is `true` (the
 * TC002); elsewhere the route answers `404`.
 *
 * Changing the voice settings (`POST /api/v1/voice`) is intentionally not offered: the
 * firmware accepts it only from the device's own web page (Origin check).
 */
export class VoiceApi extends ApiModule {
  /** `GET /api/v1/voice` - settings (without the token) and connection state. */
  async get(options?: RequestOptions): Promise<VoiceState> {
    return this.json(this.read('/api/v1/voice', options));
  }
}
