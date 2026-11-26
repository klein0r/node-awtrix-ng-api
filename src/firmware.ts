import { createHash } from 'node:crypto';
import axios, { type AxiosInstance, type AxiosResponse } from 'axios';
import type { AwtrixClient } from './client.js';
import { AwtrixFirmwareError, AwtrixValidationError } from './errors.js';
import { toBytes, toConnectionError, type RawBody, type RequestOptions } from './http.js';
import type { FirmwareUpdateResult } from './types/files.js';
import {
  FIRMWARE_IMAGES,
  type AvailableFirmware,
  type FirmwareCheckResult,
  type FirmwareImageName,
} from './types/firmware.js';

export interface FirmwareUpdaterOptions {
  /** GitHub API URL of the latest release. Default: the `Blueforcer/awtrix-ng` repository. */
  releaseUrl?: string;
  /** Base URL of the OTA files (`index.json` and `v{version}/{image}`). Default: the project's GitHub Pages. */
  otaUrl?: string;
  /** Timeout of the release and manifest requests in ms. Default `10000`. */
  timeout?: number;
  /** Timeout of the image download in ms. Default `120000`. */
  downloadTimeout?: number;
  /** Use this axios instance for the requests to GitHub (e.g. for a proxy). */
  axiosInstance?: AxiosInstance;
}

const DEFAULT_RELEASE_URL = 'https://api.github.com/repos/Blueforcer/awtrix-ng/releases/latest';
const DEFAULT_OTA_URL = 'https://blueforcer.github.io/awtrix-ng/firmware/ota';
const DEFAULT_TIMEOUT = 10_000;
const DEFAULT_DOWNLOAD_TIMEOUT = 120_000;
const MIN_IMAGE_SIZE = 256;
const AWUP_MAGIC = 'AWUPD003';
const ESP_IMAGE_MAGIC = 0xe9;

interface Release {
  tag_name?: unknown;
  draft?: unknown;
  prerelease?: unknown;
}

interface OtaManifest {
  version?: unknown;
  assets?: Record<string, { size?: unknown; sha256?: unknown } | undefined>;
}

/**
 * Over-the-air updates from the official releases: finds out whether a newer stable firmware
 * exists for a device, downloads and verifies the image and installs it.
 *
 * The release and the image come from GitHub, not from the device, so the device's credentials
 * are never sent there.
 *
 * ```ts
 * const updater = new FirmwareUpdater(awtrix);
 * const result = await updater.check();
 * if (result.available) {
 *   await updater.install(result.update);
 *   await awtrix.device.waitForOnline({ timeoutMs: 180_000 });
 * }
 * ```
 */
export class FirmwareUpdater {
  private readonly releaseUrl: string;
  private readonly otaUrl: string;
  private readonly timeout: number;
  private readonly downloadTimeout: number;
  private readonly axios: AxiosInstance;

  constructor(
    private readonly client: AwtrixClient,
    options: FirmwareUpdaterOptions = {},
  ) {
    this.releaseUrl = options.releaseUrl ?? DEFAULT_RELEASE_URL;
    this.otaUrl = (options.otaUrl ?? DEFAULT_OTA_URL).replace(/\/+$/, '');
    this.timeout = assertTimeout('timeout', options.timeout ?? DEFAULT_TIMEOUT);
    this.downloadTimeout = assertTimeout('downloadTimeout', options.downloadTimeout ?? DEFAULT_DOWNLOAD_TIMEOUT);
    this.axios = options.axiosInstance ?? axios.create();
  }

  /**
   * Compares the device firmware with the latest stable release. Rejects with
   * {@link AwtrixFirmwareError} if the device has no supported update image, the latest
   * release is no stable version or the OTA manifest does not list a valid image for it.
   */
  async check(options?: RequestOptions): Promise<FirmwareCheckResult> {
    const device = await this.client.device.get(options);
    const currentVersion = String(device.version);
    const image = device.updateImage;
    if (!isFirmwareImage(image)) {
      throw new AwtrixFirmwareError('unsupportedImage', `the device has no supported update image (${image || 'none'})`);
    }

    const release = await this.getJson<Release>(this.releaseUrl, options);
    const latestVersion = typeof release.tag_name === 'string' ? release.tag_name.replace(/^v/, '') : '';
    if (release.draft === true || release.prerelease === true || !/^\d+\.\d+\.\d+$/.test(latestVersion)) {
      throw new AwtrixFirmwareError('noStableRelease', 'the latest release is no stable firmware version');
    }

    if (compareFirmwareVersions(latestVersion, currentVersion) <= 0) {
      return { available: false, currentVersion, latestVersion };
    }

    const manifest = await this.getJson<OtaManifest>(`${this.otaUrl}/index.json`, options);
    const asset = manifest.assets?.[image];
    const size = asset?.size;
    const sha256 = asset?.sha256;
    if (
      manifest.version !== `v${latestVersion}` ||
      typeof size !== 'number' ||
      !Number.isSafeInteger(size) ||
      size < MIN_IMAGE_SIZE ||
      size > maxImageSize(image) ||
      typeof sha256 !== 'string' ||
      !/^[a-f0-9]{64}$/.test(sha256)
    ) {
      throw new AwtrixFirmwareError('invalidManifest', `the OTA manifest lists no valid ${image} for ${latestVersion}`);
    }

    return {
      available: true,
      currentVersion,
      latestVersion,
      update: {
        version: latestVersion,
        image,
        url: `${this.otaUrl}/v${latestVersion}/${image}`,
        size,
        sha256,
      },
    };
  }

  /**
   * Downloads the image and verifies size, SHA-256 and file header. Rejects with
   * {@link AwtrixFirmwareError} (`invalidImage`) if the download does not match.
   */
  async download(update: AvailableFirmware, options?: Pick<RequestOptions, 'signal'>): Promise<Uint8Array> {
    if (!isFirmwareImage(update?.image)) {
      throw new AwtrixValidationError('update.image', `must be one of ${FIRMWARE_IMAGES.join(', ')}`);
    }
    const maxSize = maxImageSize(update.image);
    const firmware = await this.get(update.url, 'binary', this.downloadTimeout, options?.signal, maxSize);

    const digest = createHash('sha256').update(firmware).digest('hex');
    const validHeader = update.image.endsWith('.awup')
      ? new TextDecoder().decode(firmware.subarray(0, AWUP_MAGIC.length)) === AWUP_MAGIC
      : firmware[0] === ESP_IMAGE_MAGIC;
    if (firmware.length !== update.size || firmware.length < MIN_IMAGE_SIZE || digest !== update.sha256 || !validHeader) {
      throw new AwtrixFirmwareError('invalidImage', `the downloaded ${update.image} failed validation`, { url: update.url });
    }
    return firmware;
  }

  /**
   * Downloads and verifies the image, then uploads it with `system.updateFirmware()`. The device
   * reboots afterwards; use `device.waitForOnline()`. `options.timeout` applies to the upload.
   */
  async install(update: AvailableFirmware, options?: RequestOptions): Promise<FirmwareUpdateResult> {
    const firmware = await this.download(update, options);
    return this.client.system.updateFirmware(firmware, update.image, options);
  }

  private async getJson<T>(url: string, options?: RequestOptions): Promise<T> {
    const bytes = await this.get(url, 'json', options?.timeout ?? this.timeout, options?.signal);
    const text = new TextDecoder().decode(bytes);
    try {
      return JSON.parse(text) as T;
    } catch {
      throw new AwtrixFirmwareError('invalidResponse', `GET ${url}: response body is not valid JSON`, { url });
    }
  }

  private async get(
    url: string,
    kind: 'json' | 'binary',
    timeout: number,
    signal: AbortSignal | undefined,
    maxContentLength?: number,
  ): Promise<Uint8Array> {
    let response: AxiosResponse<unknown>;
    try {
      response = await this.axios.get<unknown>(url, {
        headers: { Accept: kind === 'json' ? 'application/vnd.github+json, application/json' : 'application/octet-stream' },
        responseType: 'arraybuffer',
        transformResponse: [(raw: unknown) => raw],
        validateStatus: () => true,
        timeout,
        signal,
        ...(maxContentLength !== undefined ? { maxContentLength } : {}),
      });
    } catch (error) {
      // axios uses ERR_BAD_RESPONSE for an interrupted stream as well, so only its
      // "maxContentLength size of N exceeded" message means the image is too large.
      if (
        maxContentLength !== undefined &&
        axios.isAxiosError(error) &&
        error.code === 'ERR_BAD_RESPONSE' &&
        error.message.includes('maxContentLength')
      ) {
        throw new AwtrixFirmwareError('invalidImage', `GET ${url}: the image is larger than ${maxContentLength} bytes`, { url });
      }
      throw toConnectionError(error, 'GET', url);
    }
    if (response.status < 200 || response.status >= 300) {
      throw new AwtrixFirmwareError('httpError', `GET ${url} failed with HTTP ${response.status}`, {
        url,
        status: response.status,
      });
    }
    // Copy, so the result does not pin a pooled Buffer.
    return Uint8Array.from(toBytes(response.data as RawBody));
  }
}

/**
 * Compares two firmware versions (`1.2.3`, `v1.2.3`, `1.2.3-dev`) by their numeric parts.
 * Returns a positive number if `a` is newer, a negative one if `b` is newer, `0` if equal.
 */
export function compareFirmwareVersions(a: string, b: string): number {
  const pa = versionParts(a);
  const pb = versionParts(b);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff !== 0) return Math.sign(diff);
  }
  return 0;
}

function versionParts(version: string): number[] {
  return String(version)
    .trim()
    .replace(/^v/i, '')
    .replace(/-.*$/, '')
    .split('.')
    .map((part) => {
      const n = parseInt(part, 10);
      return Number.isNaN(n) ? 0 : n;
    });
}

function isFirmwareImage(image: unknown): image is FirmwareImageName {
  return typeof image === 'string' && (FIRMWARE_IMAGES as readonly string[]).includes(image);
}

function maxImageSize(image: FirmwareImageName): number {
  return (image.endsWith('.awup') ? 8 : 16) * 1024 * 1024;
}

function assertTimeout(field: string, value: number): number {
  if (!Number.isFinite(value) || value < 0) {
    throw new AwtrixValidationError(field, 'must be a non-negative number of milliseconds');
  }
  return value;
}
