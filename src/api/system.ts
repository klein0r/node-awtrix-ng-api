import { AwtrixConnectionError, AwtrixValidationError } from '../errors.js';
import { delay, type RequestOptions } from '../http.js';
import type { OkResponse } from '../types/common.js';
import type { RestoreResult, UploadContent } from '../types/files.js';
import type {
  LogChunk,
  SystemConfig,
  SystemConfigUpdate,
  SystemConfigWithSecrets,
  WifiNetwork,
  WifiScanResult,
} from '../types/system.js';
import { assertInteger } from '../validation.js';
import { ApiModule, toFormData, UPLOAD_TIMEOUT } from './base.js';

export interface WifiScanWaitOptions {
  /** Give up after this many ms. Default `20000`. */
  timeoutMs?: number;
  /** Pause between two polls in ms. Default `1000`. */
  intervalMs?: number;
  signal?: AbortSignal;
}

/** Device configuration (network, MQTT, time, auth, panel, GPIO), logs, firmware and backups. */
export class SystemApi extends ApiModule {
  /** `GET /api/v1/system` - the configuration without the three secrets. */
  get(options?: RequestOptions): Promise<SystemConfig> {
    return this.json(this.read('/api/v1/system', options));
  }

  /**
   * `GET /api/v1/system?secrets=1` - the configuration including `wifiPass`, `mqttPass` and
   * `authPass` (for backups). Ignored by the device in provisioning mode.
   */
  getWithSecrets(options?: RequestOptions): Promise<SystemConfigWithSecrets> {
    return this.json(this.read('/api/v1/system', options, { secrets: 1 }));
  }

  /**
   * `PUT /api/v1/system` - partial merge, validated as a whole. Resolves with the resulting
   * configuration. Most changes, and all pin changes, apply after a reboot. An invalid GPIO
   * map rejects with `400 invalidPinConfig`, a range error with `422 validationFailed`.
   */
  update(patch: SystemConfigUpdate, options?: RequestOptions): Promise<SystemConfig> {
    if (typeof patch !== 'object' || patch === null || Array.isArray(patch)) {
      throw new AwtrixValidationError('patch', 'must be an object');
    }
    return this.json({ method: 'PUT', path: '/api/v1/system', json: patch, options });
  }

  /**
   * One poll of `GET /api/v1/system/wifi-scan`. The first call starts a scan
   * (`scanning: true`); results are handed out once and then deleted.
   */
  async scanWifi(options?: RequestOptions): Promise<WifiScanResult> {
    const res = await this.http.request<WifiNetwork[] | { scanning: boolean }>({
      method: 'GET',
      path: '/api/v1/system/wifi-scan',
      acceptStatus: [202],
      options,
    });
    if (res.status === 202 || !Array.isArray(res.data)) return { scanning: true };
    return { scanning: false, networks: res.data };
  }

  /** Starts a Wi-Fi scan and polls until the networks are known. */
  async waitForWifiScan(options: WifiScanWaitOptions = {}): Promise<WifiNetwork[]> {
    const { timeoutMs = 20_000, intervalMs = 1000, signal } = options;
    const deadline = Date.now() + timeoutMs;
    for (;;) {
      const result = await this.scanWifi({ signal });
      if (!result.scanning) return result.networks;
      const remaining = deadline - Date.now();
      if (remaining <= 0) {
        throw new AwtrixConnectionError('timeout', 'GET', '/api/v1/system/wifi-scan', `scan did not finish within ${timeoutMs} ms`);
      }
      await delay(Math.min(intervalMs, remaining), signal);
    }
  }

  /**
   * `GET /api/v1/logs` - buffered log lines with a sequence number greater than `after`.
   * Pass the returned `next` back as `after` to poll incrementally.
   */
  getLogs(after = 0, options?: RequestOptions): Promise<LogChunk> {
    assertInteger(after, 'after', 0, Number.MAX_SAFE_INTEGER);
    return this.json(this.read('/api/v1/logs', options, { after }));
  }

  /**
   * `POST /update` - uploads and flashes a firmware image, then the device reboots. Use
   * `device.waitForOnline()` afterwards. A mismatching image rejects with `400 wrongChip`.
   */
  updateFirmware(firmware: UploadContent, fileName = 'firmware.bin', options?: RequestOptions): Promise<OkResponse> {
    return this.ok({
      method: 'POST',
      path: '/update',
      body: toFormData('firmware', firmware, fileName, 'application/octet-stream'),
      options: { timeout: UPLOAD_TIMEOUT, ...options },
    });
  }

  /**
   * `POST /api/v1/restore` - restores a backup ZIP as produced by the web UI. Entries that do
   * not check out are skipped and reported in `warnings`. Reboot afterwards to apply
   * boot-time configuration.
   */
  restoreBackup(backup: UploadContent, fileName = 'backup.zip', options?: RequestOptions): Promise<RestoreResult> {
    return this.json({
      method: 'POST',
      path: '/api/v1/restore',
      body: toFormData('file', backup, fileName, 'application/zip'),
      options: { timeout: UPLOAD_TIMEOUT, ...options },
    });
  }
}
