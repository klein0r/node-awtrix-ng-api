import { createHash } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  AwtrixClient,
  AwtrixConnectionError,
  AwtrixFirmwareError,
  AwtrixValidationError,
  FirmwareUpdater,
  compareFirmwareVersions,
  type AvailableFirmware,
} from '../src/index.js';
import { MockAwtrix, type MockReply, type RecordedRequest } from './mockServer.js';

const device = new MockAwtrix();
const github = new MockAwtrix();
let client: AwtrixClient;
let updater: FirmwareUpdater;

const image = Buffer.alloc(1024, 0x42);
image[0] = 0xe9;
const sha256 = createHash('sha256').update(image).digest('hex');

let release: MockReply;
let manifest: MockReply;
let download: MockReply;

beforeAll(async () => {
  await device.start();
  await github.start();
});
afterAll(async () => {
  await device.stop();
  await github.stop();
});
beforeEach(() => {
  device.reset();
  github.reset();
  client = new AwtrixClient({ host: device.host });
  updater = new FirmwareUpdater(client, {
    releaseUrl: `http://${github.host}/releases/latest`,
    otaUrl: `http://${github.host}/ota/`,
  });

  device.replyAlways((req) =>
    req.path === '/api/v1/device' ? { body: { version: '1.2.1', updateImage: 'firmware-awtrix-ng.bin' } } : { body: { ok: true } },
  );
  release = { body: { tag_name: 'v1.2.2', draft: false, prerelease: false } };
  manifest = { body: { version: 'v1.2.2', assets: { 'firmware-awtrix-ng.bin': { size: image.length, sha256 } } } };
  download = { raw: image, headers: { 'Content-Type': 'application/octet-stream' } };
  github.replyAlways((req: RecordedRequest) => {
    if (req.path === '/releases/latest') return release;
    if (req.path === '/ota/index.json') return manifest;
    if (req.path === '/ota/v1.2.2/firmware-awtrix-ng.bin') return download;
    return { status: 404 };
  });
});

describe('compareFirmwareVersions', () => {
  it('compares the numeric parts', () => {
    expect(compareFirmwareVersions('1.2.10', '1.2.9')).toBe(1);
    expect(compareFirmwareVersions('1.2.2', 'v1.2.2')).toBe(0);
    expect(compareFirmwareVersions('1.2.2-dev', '1.2.3')).toBe(-1);
    expect(compareFirmwareVersions('1.3', '1.2.9')).toBe(1);
  });
});

describe('FirmwareUpdater', () => {
  it('reports a newer stable release', async () => {
    const result = await updater.check();
    expect(result).toEqual({
      available: true,
      currentVersion: '1.2.1',
      latestVersion: '1.2.2',
      update: {
        version: '1.2.2',
        image: 'firmware-awtrix-ng.bin',
        url: `http://${github.host}/ota/v1.2.2/firmware-awtrix-ng.bin`,
        size: image.length,
        sha256,
      },
    });
  });

  it('reports no update without reading the manifest', async () => {
    release = { body: { tag_name: 'v1.2.1' } };
    expect(await updater.check()).toEqual({ available: false, currentVersion: '1.2.1', latestVersion: '1.2.1' });
    expect(github.requests.map((r) => r.path)).toEqual(['/releases/latest']);
  });

  it('refuses devices without a supported image', async () => {
    device.reply({ body: { version: '1.2.1', updateImage: '' } });
    const error = (await updater.check().catch((e: unknown) => e)) as AwtrixFirmwareError;
    expect(error).toBeInstanceOf(AwtrixFirmwareError);
    expect(error.reason).toBe('unsupportedImage');
    expect(github.requests).toHaveLength(0);
  });

  it('refuses prereleases', async () => {
    release = { body: { tag_name: 'v1.3.0', prerelease: true } };
    await expect(updater.check()).rejects.toMatchObject({ reason: 'noStableRelease' });
  });

  it('refuses a manifest of another version', async () => {
    manifest = { body: { version: 'v1.2.1', assets: { 'firmware-awtrix-ng.bin': { size: image.length, sha256 } } } };
    await expect(updater.check()).rejects.toMatchObject({ reason: 'invalidManifest' });
  });

  it('reports HTTP errors from GitHub', async () => {
    release = { status: 403, body: { message: 'rate limit' } };
    await expect(updater.check()).rejects.toMatchObject({ reason: 'httpError', status: 403 });
  });

  it('downloads, verifies and uploads the image', async () => {
    const result = await updater.check();
    if (!result.available) throw new Error('expected an update');
    await updater.install(result.update);

    expect(device.last.method).toBe('POST');
    expect(device.last.path).toBe('/update');
    expect(device.last.text).toContain('filename="firmware-awtrix-ng.bin"');
    expect(device.last.body.includes(image)).toBe(true);
  });

  it('does not upload an image with a wrong checksum', async () => {
    const result = await updater.check();
    if (!result.available) throw new Error('expected an update');
    const broken = Buffer.from(image);
    broken[100] = 0;
    download = { raw: broken };

    await expect(updater.install(result.update)).rejects.toMatchObject({ reason: 'invalidImage' });
    expect(device.requests.some((r) => r.path === '/update')).toBe(false);
  });

  it('refuses to download an unknown image', async () => {
    const result = await updater.check();
    if (!result.available) throw new Error('expected an update');
    const update = { ...result.update, image: 'other.bin' } as unknown as AvailableFirmware;

    const error = await updater.download(update).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(AwtrixValidationError);
    expect(error).toMatchObject({ field: 'update.image' });
    expect(github.requests.some((r) => r.path.startsWith('/ota/v'))).toBe(false);
  });

  it('reports a body that is not JSON', async () => {
    release = { raw: '<html>maintenance</html>', headers: { 'Content-Type': 'text/html' } };
    await expect(updater.check()).rejects.toMatchObject({
      reason: 'invalidResponse',
      url: `http://${github.host}/releases/latest`,
    });
  });

  it('refuses an image larger than the limit', async () => {
    const result = await updater.check();
    if (!result.available) throw new Error('expected an update');
    download = { raw: Buffer.alloc(16 * 1024 * 1024 + 1, 0xe9) };

    const error = await updater.install(result.update).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(AwtrixFirmwareError);
    expect(error).toMatchObject({ reason: 'invalidImage', url: result.update.url });
    expect((error as Error).message).toContain('larger than 16777216 bytes');
    expect(device.requests.some((r) => r.path === '/update')).toBe(false);
  });

  it('reports an interrupted download as a connection error, not as too large', async () => {
    const result = await updater.check();
    if (!result.available) throw new Error('expected an update');
    download = { raw: image, abortAfterBytes: 100 };

    const error = await updater.install(result.update).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(AwtrixConnectionError);
    expect((error as Error).message).not.toContain('larger than');
    expect(device.requests.some((r) => r.path === '/update')).toBe(false);
  });

  it('reports an unreachable server as a connection error', async () => {
    const offline = new MockAwtrix();
    await offline.start();
    const host = offline.host;
    await offline.stop();
    updater = new FirmwareUpdater(client, { releaseUrl: `http://${host}/releases/latest` });

    await expect(updater.check()).rejects.toMatchObject({ name: 'AwtrixConnectionError', kind: 'refused' });
  });

  it('validates the timeouts', () => {
    expect(() => new FirmwareUpdater(client, { timeout: -1 })).toThrow(AwtrixValidationError);
    expect(() => new FirmwareUpdater(client, { downloadTimeout: Number.NaN })).toThrow(AwtrixValidationError);
    expect(() => new FirmwareUpdater(client, { timeout: 0 })).not.toThrow();
  });

  it('does not send the device credentials to GitHub', async () => {
    client = new AwtrixClient({ host: device.host, auth: { username: 'admin', password: 'secret' } });
    updater = new FirmwareUpdater(client, { releaseUrl: `http://${github.host}/releases/latest`, otaUrl: `http://${github.host}/ota` });
    await updater.check();
    expect(device.last.headers.authorization).toBeDefined();
    expect(github.requests.every((r) => r.headers.authorization === undefined)).toBe(true);
  });
});
