import { createServer } from 'node:net';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  AwtrixApiError,
  AwtrixClient,
  AwtrixConnectionError,
  AwtrixResponseError,
  AwtrixValidationError,
  isAwtrixApiError,
} from '../src/index.js';
import { buildBaseUrl, parseRetryAfter } from '../src/http.js';
import { MockAwtrix } from './mockServer.js';

const mock = new MockAwtrix();
let client: AwtrixClient;

beforeAll(() => mock.start());
afterAll(() => mock.stop());
beforeEach(() => {
  mock.reset();
  client = new AwtrixClient({ host: mock.host });
});

describe('buildBaseUrl', () => {
  it('accepts plain hosts, ports and protocols', () => {
    expect(buildBaseUrl({ host: '192.168.1.50' })).toBe('http://192.168.1.50');
    expect(buildBaseUrl({ host: 'awtrix.local', port: 8080 })).toBe('http://awtrix.local:8080');
    expect(buildBaseUrl({ host: 'awtrix.local:81' })).toBe('http://awtrix.local:81');
    expect(buildBaseUrl({ host: 'https://awtrix.example.com/' })).toBe('https://awtrix.example.com');
    expect(buildBaseUrl({ host: 'awtrix.local', protocol: 'https' })).toBe('https://awtrix.local');
    expect(buildBaseUrl({ host: '[fe80::1]', port: 80 })).toBe('http://[fe80::1]');
  });

  it('rejects invalid input', () => {
    expect(() => buildBaseUrl({ host: '' })).toThrow(AwtrixValidationError);
    expect(() => buildBaseUrl({ host: 'ftp://awtrix.local' })).toThrow(/unsupported protocol/);
    expect(() => buildBaseUrl({ host: 'awtrix.local', port: 70000 })).toThrow(/port/);
  });
});

describe('parseRetryAfter', () => {
  it('parses seconds and dates', () => {
    expect(parseRetryAfter('2')).toBe(2000);
    expect(parseRetryAfter(undefined)).toBeUndefined();
    expect(parseRetryAfter('nonsense')).toBeUndefined();
    expect(parseRetryAfter(new Date(Date.now() - 1000).toUTCString())).toBe(0);
  });
});

describe('error handling', () => {
  it('maps the device error body to AwtrixApiError', async () => {
    mock.reply({
      status: 422,
      body: { error: { code: 'validationFailed', message: 'out of range', field: 'brightness' } },
    });
    const error = await client.settings.update({ autoBrightness: false }).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(AwtrixApiError);
    expect(isAwtrixApiError(error)).toBe(true);
    const apiError = error as AwtrixApiError;
    expect(apiError.status).toBe(422);
    expect(apiError.code).toBe('validationFailed');
    expect(apiError.field).toBe('brightness');
    expect(apiError.deviceMessage).toBe('out of range');
    expect(apiError.isValidationError).toBe(true);
    expect(apiError.method).toBe('PATCH');
    expect(apiError.path).toBe('/api/v1/settings');
    expect(apiError.message).toContain('(field: brightness)');
  });

  it('derives a code when the body is not JSON', async () => {
    mock.reply({ status: 404, raw: 'nothing here' });
    const error = (await client.apps.switchTo('Nope').catch((e: unknown) => e)) as AwtrixApiError;
    expect(error.code).toBe('notFound');
    expect(error.deviceMessage).toBe('nothing here');
    expect(error.isNotFound).toBe(true);
  });

  it('reads the restore error shape {"ok":false,"error":"..."}', async () => {
    mock.reply({ status: 400, body: { ok: false, error: 'not a zip' } });
    const error = (await client.system.restoreBackup(new Uint8Array([1, 2, 3])).catch((e: unknown) => e)) as AwtrixApiError;
    expect(error.status).toBe(400);
    expect(error.deviceMessage).toBe('not a zip');
  });

  it('reports 401 as unauthorized', async () => {
    mock.reply({
      status: 401,
      headers: { 'WWW-Authenticate': 'Basic realm="AWTRIX NG"' },
      body: { error: { code: 'unauthorized', message: 'authentication required' } },
    });
    const error = (await client.device.get().catch((e: unknown) => e)) as AwtrixApiError;
    expect(error.isUnauthorized).toBe(true);
  });

  it('throws AwtrixResponseError for an unparseable success body', async () => {
    mock.reply({ status: 200, raw: '{broken' });
    await expect(client.device.get()).rejects.toBeInstanceOf(AwtrixResponseError);
  });

  it('retries 503 serviceBusy honouring Retry-After', async () => {
    mock
      .reply({
        status: 503,
        headers: { 'Retry-After': '0' },
        body: { error: { code: 'serviceBusy', message: 'device is busy, try again' } },
      })
      .reply({ status: 200, body: { ok: true, name: 'weather', error: null } });
    const result = await client.scripts.updateConfig('weather', { lat: '48.14' });
    expect(result.error).toBeNull();
    expect(mock.requests).toHaveLength(2);
  });

  it('gives up after the configured number of busy retries', async () => {
    const busy = { status: 503, headers: { 'Retry-After': '0' }, body: { error: { code: 'serviceBusy', message: 'busy' } } };
    mock.replyAlways(busy);
    const noRetry = new AwtrixClient({ host: mock.host, retryOnBusy: 0 });
    const error = (await noRetry.scripts.updateConfig('weather', { lat: '1' }).catch((e: unknown) => e)) as AwtrixApiError;
    expect(error.isBusy).toBe(true);
    expect(error.isUnavailable).toBe(false);
    expect(error.retryAfterMs).toBe(0);
    expect(mock.requests).toHaveLength(1);
  });

  it('does not retry 503 unavailable', async () => {
    mock.replyAlways({ status: 503, body: { error: { code: 'unavailable', message: 'not available on this device' } } });
    const error = (await client.audio.playStation('SWR3').catch((e: unknown) => e)) as AwtrixApiError;
    expect(error.isUnavailable).toBe(true);
    expect(mock.requests).toHaveLength(1);
  });

  it('classifies a refused connection', async () => {
    const port = await freePort();
    const offline = new AwtrixClient({ host: `127.0.0.1:${port}` });
    const error = (await offline.device.get().catch((e: unknown) => e)) as AwtrixConnectionError;
    expect(error).toBeInstanceOf(AwtrixConnectionError);
    expect(error.kind).toBe('refused');
    expect(error.code).toBe('ECONNREFUSED');
  });

  it('classifies a timeout', async () => {
    mock.reply({ status: 200, body: {}, delayMs: 300 });
    const error = (await client.device.get({ timeout: 50 }).catch((e: unknown) => e)) as AwtrixConnectionError;
    expect(error).toBeInstanceOf(AwtrixConnectionError);
    expect(error.isTimeout).toBe(true);
  });

  it('supports aborting a request', async () => {
    mock.reply({ status: 200, body: {}, delayMs: 300 });
    const controller = new AbortController();
    const pending = client.device.get({ signal: controller.signal });
    setTimeout(() => controller.abort(), 20);
    const error = (await pending.catch((e: unknown) => e)) as AwtrixConnectionError;
    expect(error.kind).toBe('aborted');
  });
});

describe('request details', () => {
  it('sends HTTP Basic credentials and custom headers', async () => {
    const authed = new AwtrixClient({ host: mock.host, auth: { username: 'admin', password: 'secret' }, headers: { 'X-Test': '1' } });
    mock.reply({ body: { version: '1.0.12' } });
    await authed.device.version();
    expect(mock.last.headers.authorization).toBe(`Basic ${Buffer.from('admin:secret').toString('base64')}`);
    expect(mock.last.headers['x-test']).toBe('1');
  });

  it('sends JSON with the required Content-Type', async () => {
    await client.display.setPower(false);
    expect(mock.last.headers['content-type']).toBe('application/json');
    expect(mock.last.json).toEqual({ power: false });
  });

  it('sends bodyless requests without a Content-Type', async () => {
    await client.apps.next();
    expect(mock.last.headers['content-type']).toBeUndefined();
    expect(mock.last.body.length).toBe(0);
  });
});

function freePort(): Promise<number> {
  return new Promise((resolve) => {
    const server = createServer();
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address() as { port: number };
      server.close(() => resolve(port));
    });
  });
}
