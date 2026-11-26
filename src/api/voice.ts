import type { RequestOptions } from '../http.js';
import { AwtrixValidationError } from '../errors.js';
import type { OkResponse } from '../types/common.js';
import type { VoiceState, VoiceUpdate } from '../types/system.js';
import { assertNonEmptyObject, isValidAppName } from '../validation.js';
import { ApiModule } from './base.js';

/**
 * The voice assistant: Home Assistant Voice or, since 1.2.3, an app. Only where
 * `capabilities.voice` is `true` (the TC002); elsewhere the routes answer `404`.
 */
export class VoiceApi extends ApiModule {
  /** `GET /api/v1/voice` - settings (without the token) and connection state. */
  async get(options?: RequestOptions): Promise<VoiceState> {
    return this.json(this.read('/api/v1/voice', options));
  }

  /**
   * `POST /api/v1/voice` - changes the settings. The route accepts requests only as the
   * device's own web UI sends them; this client adds the documented `X-Awtrix-Voice` and
   * `Origin` headers.
   */
  async update(update: VoiceUpdate, options?: RequestOptions): Promise<OkResponse> {
    assertNonEmptyObject(update, 'update');
    checkLength(update.url, 'url', 512);
    checkLength(update.pipeline, 'pipeline', 128);
    checkLength(update.token, 'token', 4096);
    if (update.assistant !== undefined && !isValidAssistant(update.assistant)) {
      throw new AwtrixValidationError('assistant', 'must be off, ha or app:<name> with a valid app name');
    }
    if (update.device !== undefined && (typeof update.device !== 'string' || !/^[A-Za-z0-9]{0,64}$/.test(update.device))) {
      throw new AwtrixValidationError('device', 'must be letters and digits, at most 64');
    }
    return this.ok({ method: 'POST', path: '/api/v1/voice', json: update, headers: this.webUiHeaders('X-Awtrix-Voice'), options });
  }

  /**
   * `POST /api/v1/voice/start` (1.2.3+) - starts the assistant as holding the knob does: Home
   * Assistant Voice, or opens the app in `config.assistant`. Rejects with `409 voiceUnavailable`
   * when nothing started (assistant off, not connected or busy, ...). Sent with the same web UI
   * headers as {@link update}.
   */
  async start(options?: RequestOptions): Promise<OkResponse> {
    return this.ok({ method: 'POST', path: '/api/v1/voice/start', headers: this.webUiHeaders('X-Awtrix-Voice'), options });
  }
}

function isValidAssistant(value: unknown): boolean {
  if (value === 'off' || value === 'ha') return true;
  return typeof value === 'string' && value.startsWith('app:') && isValidAppName(value.slice(4));
}

function checkLength(value: unknown, field: string, max: number): void {
  if (value !== undefined && (typeof value !== 'string' || value.length > max)) {
    throw new AwtrixValidationError(field, `must be a string of at most ${max} characters`);
  }
}
