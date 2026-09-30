import { AwtrixConnectionError, AwtrixError } from '../errors.js';
import { delay, type RequestOptions } from '../http.js';
import type { OkResponse } from '../types/common.js';
import type { DeviceState } from '../types/device.js';
import type { Capabilities } from '../types/system.js';
import { assertInteger } from '../validation.js';
import { ApiModule } from './base.js';

export interface WaitForOnlineOptions {
  /** Give up after this many ms. Default `60000`. */
  timeoutMs?: number;
  /** Pause between two probes in ms. Default `2000`. */
  intervalMs?: number;
  /** Timeout of a single probe in ms. Default `2000`. */
  probeTimeoutMs?: number;
  signal?: AbortSignal;
}

/** Device state, lifecycle and capabilities. */
export class DeviceApi extends ApiModule {
  /** `GET /api/v1/device` - state and statistics. */
  async get(options?: RequestOptions): Promise<DeviceState> {
    return this.json(this.read('/api/v1/device', options));
  }

  /** `GET /api/v1/version` - the firmware version, e.g. `"1.0.12"`. */
  async version(options?: RequestOptions): Promise<string> {
    const body = await this.json<{ version: string }>(this.read('/api/v1/version', options));
    return body.version;
  }

  /** `GET /api/v1/capabilities` - effect/transition/overlay/palette names, audio outputs, GPIO rules. */
  async capabilities(options?: RequestOptions): Promise<Capabilities> {
    return this.json(this.read('/api/v1/capabilities', options));
  }

  /** `POST /api/v1/device/reboot`. The reply is sent before the restart. */
  async reboot(options?: RequestOptions): Promise<OkResponse> {
    return this.ok({ method: 'POST', path: '/api/v1/device/reboot', options });
  }

  /**
   * `POST /api/v1/device/sleep` - deep-sleep for `durationMs`, then boot normally. The select
   * button only wakes the device early when it sits on an RTC pin.
   *
   * **ESP32 only.** A TC002 has no timed sleep: the route stops the clock and nothing wakes it
   * again. Use `display.setPower(false)` to blank a TC002.
   */
  async sleep(durationMs: number, options?: RequestOptions): Promise<OkResponse> {
    assertInteger(durationMs, 'durationMs', 1, Number.MAX_SAFE_INTEGER);
    return this.ok({ method: 'POST', path: '/api/v1/device/sleep', json: { durationMs }, options });
  }

  /**
   * `POST /api/v1/device/factory-reset` - erases settings, configuration, Wi-Fi credentials
   * and the whole file system (icons, melodies, scripts ...), then reboots into provisioning
   * mode. **Cannot be undone.**
   */
  async factoryReset(options?: RequestOptions): Promise<OkResponse> {
    return this.ok({ method: 'POST', path: '/api/v1/device/factory-reset', options });
  }

  /**
   * Probes `GET /version` and reports whether the device answers. Never throws for network
   * problems or error statuses - only when `signal` aborts.
   */
  async ping(options?: RequestOptions): Promise<boolean> {
    try {
      await this.http.request<string>({ method: 'GET', path: '/version', response: 'text', options });
      return true;
    } catch (error) {
      if (options?.signal?.aborted) throw error;
      return false;
    }
  }

  /**
   * Polls until the device answers again (e.g. after {@link reboot} or a firmware update) and
   * returns its firmware version.
   *
   * @throws AwtrixConnectionError with kind `timeout` when `timeoutMs` elapses.
   */
  async waitForOnline(options: WaitForOnlineOptions = {}): Promise<string> {
    const { timeoutMs = 60_000, intervalMs = 2000, probeTimeoutMs = 2000, signal } = options;
    const deadline = Date.now() + timeoutMs;
    let lastError: unknown;
    for (;;) {
      try {
        const res = await this.http.request<string>({
          method: 'GET',
          path: '/version',
          response: 'text',
          options: { signal, timeout: Math.max(1, Math.min(probeTimeoutMs, deadline - Date.now())) },
        });
        return res.data.trim();
      } catch (error) {
        if (signal?.aborted) throw error;
        if (error instanceof AwtrixError && !(error instanceof AwtrixConnectionError) && !isTransient(error)) throw error;
        lastError = error;
      }
      const remaining = deadline - Date.now();
      if (remaining <= 0) {
        throw new AwtrixConnectionError(
          'timeout',
          'GET',
          '/version',
          `device did not come back within ${timeoutMs} ms`,
          'ETIMEDOUT',
          lastError,
        );
      }
      await delay(Math.min(intervalMs, remaining), signal);
    }
  }
}

/** Statuses a freshly booting device may answer with before it is fully up. */
function isTransient(error: AwtrixError): boolean {
  const status = (error as { status?: number }).status;
  return status === 502 || status === 503 || status === 504;
}
