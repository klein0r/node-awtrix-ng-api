import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  AwtrixApiError,
  AwtrixClient,
  AwtrixValidationError,
  Draw,
  type AppPayload,
  type Capabilities,
  type NativeRegion,
  type Settings,
  type SettingsUpdate,
} from '../src/index.js';
import { MockAwtrix } from './mockServer.js';

const mock = new MockAwtrix();
let client: AwtrixClient;

beforeAll(() => mock.start());
afterAll(() => mock.stop());
beforeEach(() => {
  mock.reset();
  client = new AwtrixClient({ host: mock.host });
});

function expectRequest(method: string, path: string, json?: unknown) {
  expect(mock.last.method).toBe(method);
  expect(mock.last.path).toBe(path);
  if (json !== undefined) expect(mock.last.json).toEqual(json);
}

describe('layouts', () => {
  it('pushes a region layout', async () => {
    const payload: AppPayload = {
      durationMs: 10_000,
      layout: {
        version: 1,
        effect: 'Plasma',
        effectSpeed: 0.5,
        regions: [
          { id: 'title', box: [0, 0, 52, 8], text: 'Hello', font: 'small', scroll: 'bounce' },
          { id: 'icon', box: [0, 8, 8, 8], icon: '2422' },
          { id: 'chart', box: [8, 8, 30, 8], chart: { values: [1, 5, 3], type: 'bar', min: 0, max: 10 }, color: 'palette' },
          { id: 'load', box: [38, 8, 14, 4], progress: 64, trackColor: '#101010' },
          { id: 'art', box: [38, 12, 14, 4], draw: [Draw.line(0, 0, 13, 3, '#F00')] },
        ],
      },
    };
    await client.apps.push('dash', payload);
    expectRequest('PUT', '/api/v1/apps/pushed/dash', payload);
  });
});

describe('scripts', () => {
  it('reads and changes saved data', async () => {
    mock.reply({ body: { unl: 7, best: [12, 40, 9] } });
    expect(await client.scripts.getData('game')).toEqual({ unl: 7, best: [12, 40, 9] });
    expectRequest('GET', '/api/v1/apps/game/data');

    mock.reply({ body: { ok: true, name: 'game', error: null } });
    await client.scripts.updateData('game', { unl: 8, old: null });
    expectRequest('PATCH', '/api/v1/apps/game/data', { unl: 8, old: null });
    await expect(client.scripts.updateData('game', {})).rejects.toBeInstanceOf(AwtrixValidationError);
  });

  it('manages the script sounds', async () => {
    mock.reply({ body: { files: [{ name: 'boost.mp3', size: 20411, sha256: 'a'.repeat(64) }], usedBytes: 1, totalBytes: 2 } });
    expect((await client.scripts.listSounds('Racer')).files[0]?.sha256).toHaveLength(64);
    expectRequest('GET', '/api/v1/apps/script/Racer/sounds');

    await client.scripts.uploadSound('Racer', 'boost', Buffer.from('ID3fake'));
    expectRequest('POST', '/api/v1/apps/script/Racer/sounds');
    expect(mock.last.text).toContain('filename="boost.mp3"');

    await client.scripts.deleteSound('Racer', 'boost.mp3');
    expectRequest('DELETE', '/api/v1/apps/script/Racer/sounds/boost');
    await client.scripts.deleteAllSounds('Racer');
    expectRequest('DELETE', '/api/v1/apps/script/Racer/sounds');
  });
});

describe('gamepad and voice', () => {
  it('reads both slots, pairs and forgets per slot', async () => {
    mock.reply({
      body: {
        devices: [
          { id: 1, state: 'ready', name: '8BitDo', address: 'aa:bb', player: 1 },
          { id: 2, state: 'unpaired', name: '', address: '', player: null },
        ],
      },
    });
    const { devices } = await client.gamepad.get();
    expect(devices.map((d) => d.state)).toEqual(['ready', 'unpaired']);
    expectRequest('GET', '/api/v1/gamepad');

    mock.reply({ body: { ok: true, id: 2 } });
    expect(await client.gamepad.pair()).toEqual({ ok: true, id: 2 });
    expectRequest('POST', '/api/v1/gamepad/pair');

    await client.gamepad.forget(1);
    expectRequest('DELETE', '/api/v1/gamepad/1');
    await expect(client.gamepad.forget(3 as never)).rejects.toThrow(/slot/);
  });

  it('connects and disconnects a phone as gamepad', async () => {
    mock.reply({ body: { port: 4214, token: 'a'.repeat(32), player: 2, session: 7 } });
    const session = await client.gamepad.connectRemote({ name: 'Pixel', player: 2 });
    expect(session).toEqual({ port: 4214, token: 'a'.repeat(32), player: 2, session: 7 });
    expectRequest('POST', '/api/v1/gamepad/remote', { name: 'Pixel', player: 2 });

    mock.reply({ body: { port: 4214, token: 'b'.repeat(32), player: 1, session: 8 } });
    await client.gamepad.connectRemote();
    expectRequest('POST', '/api/v1/gamepad/remote', {});

    await client.gamepad.disconnectRemote(7);
    expectRequest('DELETE', '/api/v1/gamepad/remote/7');

    await expect(client.gamepad.connectRemote({ player: 3 as never })).rejects.toThrow(/player/);
    await expect(client.gamepad.connectRemote({ name: 'x'.repeat(33) })).rejects.toThrow(/name/);
    await expect(client.gamepad.disconnectRemote(0)).rejects.toThrow(/session/);
  });

  it('surfaces gamepadsFull', async () => {
    mock.reply({ status: 409, body: { error: { code: 'gamepadsFull', message: 'no free slot' } } });
    const error = (await client.gamepad.pair().catch((e: unknown) => e)) as AwtrixApiError;
    expect(error.code).toBe('gamepadsFull');
    expect(error.isConflict).toBe(true);
  });

  it('reads the voice state', async () => {
    mock.reply({ body: { config: { enabled: true, url: 'http://ha:8123', pipeline: '', tokenSet: true }, state: 'ready', error: '', pipelines: [] } });
    expect((await client.voice.get()).config.tokenSet).toBe(true);
    expectRequest('GET', '/api/v1/voice');
  });
});

describe('OAuth and voice writes', () => {
  it('lists, reads and changes sign-ins with the web UI headers', async () => {
    mock.reply({ body: { redirectUri: 'https://awtrix.de/oauth/callback', apps: [] } });
    expect((await client.oauth.list()).redirectUri).toBe('https://awtrix.de/oauth/callback');
    expectRequest('GET', '/api/v1/oauth');

    mock.reply({ body: { name: 'Spotify', provider: 'accounts.spotify.com', scope: 's', pkce: true, clientId: '', clientSecretSet: false, state: 'signedOut' } });
    expect((await client.oauth.get('Spotify')).state).toBe('signedOut');
    expectRequest('GET', '/api/v1/oauth/Spotify');

    await client.oauth.setCredentials('Spotify', { clientId: 'abc', clientSecret: 'xyz' });
    expectRequest('POST', '/api/v1/oauth/Spotify', { clientId: 'abc', clientSecret: 'xyz' });
    expect(mock.last.headers['x-awtrix-oauth']).toBe('1');
    expect(mock.last.headers.origin).toBe(`http://${mock.host}`);

    mock.reply({ body: { url: 'https://accounts.spotify.com/authorize?x=1' } });
    expect(await client.oauth.startSignIn('Spotify')).toBe('https://accounts.spotify.com/authorize?x=1');
    expectRequest('POST', '/api/v1/oauth/Spotify/start', {});

    mock.reply({ status: 202, body: { ok: true } });
    await client.oauth.finishSignIn('Spotify', 'the-code', 'the-state');
    expectRequest('POST', '/api/v1/oauth/Spotify/code', { code: 'the-code', state: 'the-state' });

    await client.oauth.signOut('Spotify');
    expectRequest('DELETE', '/api/v1/oauth/Spotify');
    expect(mock.last.headers['x-awtrix-oauth']).toBe('1');
  });

  it('changes the voice settings with the web UI headers', async () => {
    await client.voice.update({ enabled: false, device: 'abc123' });
    expectRequest('POST', '/api/v1/voice', { enabled: false, device: 'abc123' });
    expect(mock.last.headers['x-awtrix-voice']).toBe('1');
    expect(mock.last.headers.origin).toBe(`http://${mock.host}`);
    await expect(client.voice.update({ device: 'not valid!' })).rejects.toThrow(/device/);
  });

  it('chooses the assistant and the wake word (1.2.3)', async () => {
    await client.voice.update({ assistant: 'app:LumenAssistant', wakeWord: true, wakeSensitivity: 'high' });
    expectRequest('POST', '/api/v1/voice', { assistant: 'app:LumenAssistant', wakeWord: true, wakeSensitivity: 'high' });

    for (const assistant of ['app:next', 'app:', 'app:bad name', 'homeassistant']) {
      const error = await client.voice.update({ assistant: assistant as 'off' }).catch((e: unknown) => e);
      expect(error).toBeInstanceOf(AwtrixValidationError);
      expect(error).toMatchObject({ field: 'assistant' });
    }
    expect(mock.requests).toHaveLength(1);
  });

  it('starts the assistant with the web UI headers (1.2.3)', async () => {
    await client.voice.start();
    expectRequest('POST', '/api/v1/voice/start');
    expect(mock.last.body).toHaveLength(0);
    expect(mock.last.headers['content-type']).toBeUndefined();
    expect(mock.last.headers['x-awtrix-voice']).toBe('1');
    expect(mock.last.headers.origin).toBe(`http://${mock.host}`);

    mock.reply({ status: 409, body: { error: { code: 'voiceUnavailable', message: 'assistant not ready' } } });
    await expect(client.voice.start()).rejects.toMatchObject({ status: 409, code: 'voiceUnavailable' });
  });
});

describe('API keys (1.2.3)', () => {
  it('lists and reads the keys', async () => {
    mock.reply({ body: { apps: ['LumenAssistant'] } });
    expect(await client.secrets.list()).toEqual({ apps: ['LumenAssistant'] });
    expectRequest('GET', '/api/v1/secrets');

    const keys = { keys: [{ key: 'key', label: 'API key', help: '', set: true, hosts: ['api.openai.com'] }] };
    mock.reply({ body: keys });
    expect(await client.secrets.get('LumenAssistant')).toEqual(keys);
    expectRequest('GET', '/api/v1/secrets/LumenAssistant');
  });

  it('saves and erases keys with the web UI headers', async () => {
    await client.secrets.set('LumenAssistant', { key: 'sk-123', other: '' });
    expectRequest('PUT', '/api/v1/secrets/LumenAssistant', { key: 'sk-123', other: '' });
    expect(mock.last.headers['x-awtrix-secret']).toBe('1');
    expect(mock.last.headers.origin).toBe(`http://${mock.host}`);

    await client.secrets.delete('LumenAssistant', 'key');
    expectRequest('DELETE', '/api/v1/secrets/LumenAssistant/key');
    expect(mock.last.headers['x-awtrix-secret']).toBe('1');
  });

  it('refuses invalid names, keys and values before sending', async () => {
    await expect(client.secrets.get('next')).rejects.toMatchObject({ field: 'name' });
    await expect(client.secrets.delete('Lumen', '1key')).rejects.toMatchObject({ field: 'key' });
    await expect(client.secrets.delete('Lumen', '../x')).rejects.toMatchObject({ field: 'key' });
    await expect(client.secrets.set('Lumen', { key: 42 as unknown as string })).rejects.toMatchObject({ field: 'key' });
    await expect(client.secrets.set('Lumen', null as unknown as Record<string, string>)).rejects.toMatchObject({ field: 'values' });
    expect(mock.requests).toHaveLength(0);
  });
});

describe('speech voice packs (1.2.3)', () => {
  const voice = { name: 'Conny', language: 'en', version: '1', bytes: 1189344, uploaded: false, maxBytes: 2000000 };

  it('reads, uploads and removes the voice pack', async () => {
    mock.reply({ body: voice });
    expect(await client.audio.getSpeechVoice()).toEqual(voice);
    expectRequest('GET', '/api/v1/speech/voice');

    mock.reply({ body: { ...voice, name: 'Hans', language: 'de', uploaded: true } });
    const pack = Buffer.from('ATTS voice pack');
    expect((await client.audio.uploadVoicePack(pack)).uploaded).toBe(true);
    expectRequest('POST', '/api/v1/speech/voice');
    expect(mock.last.headers['content-type']).toMatch(/^multipart\/form-data/);
    expect(mock.last.text).toContain('name="voice"; filename="voice.atts"');
    expect(mock.last.body.includes(pack)).toBe(true);

    mock.reply({ body: voice });
    expect((await client.audio.removeVoicePack()).uploaded).toBe(false);
    expectRequest('DELETE', '/api/v1/speech/voice');
  });

  it('narrows a clock without a voice', async () => {
    mock.reply({ body: { name: null, maxBytes: 2000000 } });
    const result = await client.audio.getSpeechVoice();
    expect(result).toEqual({ name: null, maxBytes: 2000000 });
    expect(result.uploaded).toBeUndefined();
    if (result.name !== null) {
      const language: string = result.language;
      expect(language).toBeDefined();
    }
  });
});

describe('Help AWTRIX (1.2.3)', () => {
  it('reads and answers the question', async () => {
    mock.reply({ body: { consent: null } });
    expect(await client.system.getActivation()).toEqual({ consent: null });
    expectRequest('GET', '/api/v1/activation');

    mock.reply({ body: { consent: false } });
    expect(await client.system.setActivation(false)).toEqual({ consent: false });
    expectRequest('PUT', '/api/v1/activation', { consent: false });

    await expect(client.system.setActivation('yes' as unknown as boolean)).rejects.toMatchObject({ field: 'consent' });
    expect(mock.requests).toHaveLength(2);
  });
});

describe('built-in app settings', () => {
  it('reads and changes them', async () => {
    mock.reply({
      body: {
        name: 'Time',
        fields: [
          { key: 'clockFace', type: 'select', options: ['sheet', 'ring'], group: 'time', path: ['clockFace'], default: 'sheet', value: 'sheet' },
          { key: 'weekdayBar.show', type: 'bool', group: 'weekday', path: ['weekdayBar', 'show'], default: true, value: true },
        ],
        warnings: [],
      },
    });
    const config = await client.apps.getBuiltinConfig('Time');
    expect(config.fields.map((f) => f.path.join('.'))).toEqual(['clockFace', 'weekdayBar.show']);
    expectRequest('GET', '/api/v1/apps/builtin/Time/config');

    mock.reply({ body: { ok: true, name: 'Time', error: null } });
    await client.apps.updateBuiltinConfig('Time', { clockFace: 'flap', weekdayBar: { show: false } });
    expectRequest('PATCH', '/api/v1/apps/builtin/Time/config', { clockFace: 'flap', weekdayBar: { show: false } });
    await expect(client.apps.updateBuiltinConfig('Time', {})).rejects.toBeInstanceOf(AwtrixValidationError);
  });
});

describe('MQTT over TLS', () => {
  it('reads, uploads and removes the broker CA', async () => {
    mock.reply({ body: { ca: 'public', pending: null } });
    expect((await client.system.getMqttTls()).ca).toBe('public');
    expectRequest('GET', '/api/v1/mqtt/tls');

    const pem = '-----BEGIN CERTIFICATE-----\nMIIB\n-----END CERTIFICATE-----';
    mock.reply({ body: { ca: 'uploaded', pending: null } });
    await client.system.setMqttTlsCa(pem);
    expectRequest('PUT', '/api/v1/mqtt/tls/ca', { certificate: pem });

    mock.reply({ body: { ca: 'public', pending: null } });
    await client.system.deleteMqttTlsCa();
    expectRequest('DELETE', '/api/v1/mqtt/tls/ca');
  });
});

describe('icons', () => {
  it('renames an icon', async () => {
    await client.files.renameIcon('mail.gif', 'letter.gif');
    expectRequest('POST', '/api/v1/icons/rename', { from: 'mail.gif', to: 'letter.gif' });
    await expect(client.files.renameIcon('mail.gif', 'letter.jpg')).rejects.toThrow(/extension/);

    mock.reply({ status: 409, body: { error: { code: 'nameTaken', message: 'name taken' } } });
    const error = (await client.files.renameIcon('mail.gif', 'taken.gif').catch((e: unknown) => e)) as AwtrixApiError;
    expect(error.code).toBe('nameTaken');
  });
});

describe('settings', () => {
  it('range-checks the volumes', async () => {
    mock.reply({ body: { volume: 50 } });
    await client.settings.update({ volume: 50, radioVolume: 40, dateWeekdayBar: { show: false } });
    expectRequest('PATCH', '/api/v1/settings', { volume: 50, radioVolume: 40, dateWeekdayBar: { show: false } });
    await expect(client.settings.update({ alertVolume: 101 })).rejects.toThrow(/alertVolume/);
  });
});

describe('firmware update on a TC002', () => {
  it('returns the applying flag', async () => {
    mock.reply({ body: { ok: true, applying: true } });
    const result = await client.system.updateFirmware(Buffer.from('awup'), 'awtrix-ng-tc002.awup');
    expect(result.applying).toBe(true);
    expect(mock.last.text).toContain('filename="awtrix-ng-tc002.awup"');
  });

  it('surfaces notNewer as a conflict', async () => {
    mock.reply({ status: 409, body: { error: { code: 'notNewer', message: 'not newer than the installed release' } } });
    const error = (await client.system.updateFirmware(Buffer.from('awup')).catch((e: unknown) => e)) as AwtrixApiError;
    expect(error.code).toBe('notNewer');
    expect(error.isConflict).toBe(true);
  });
});

/*
 * Compile-time checks: `npm run typecheck` fails if any of these stop holding.
 */
describe('types', () => {
  it('keeps layouts and classic keys apart', () => {
    // @ts-expect-error - classic visual keys cannot be combined with a layout
    const mixed: AppPayload = { text: 'x', layout: { version: 1, regions: [] } };
    // @ts-expect-error - a region has exactly one kind of content
    const twoContents: NativeRegion = { id: 'a', box: [0, 0, 1, 1], text: 'x', progress: 5 };
    // @ts-expect-error - scroll only belongs to text regions
    const scrollOnIcon: NativeRegion = { id: 'a', box: [0, 0, 1, 1], icon: '1', scroll: 'wrap' };
    // @ts-expect-error - effect and backgroundColor exclude each other
    const both: AppPayload = { layout: { version: 1, regions: [], effect: 'Matrix', backgroundColor: '#000' } };
    expect([mixed, twoContents, scrollOnIcon, both]).toHaveLength(4);
  });

  it('accepts an ESP32 settings response without the TC002-only keys', () => {
    type Esp32Only = Omit<Settings, 'clockFace' | 'calendarAnimation' | 'bootSound' | 'musicSource' | 'radioVolume'>;
    const esp32 = {} as Esp32Only;
    const asSettings: Settings = esp32;
    expect(asSettings).toBeDefined();
  });

  it('types the 1.2.0 settings and capabilities', () => {
    // @ts-expect-error - soundEnabled no longer exists
    const removed: SettingsUpdate = { soundEnabled: false };
    const volumes: SettingsUpdate = { volume: 80, alertVolume: 100, appVolume: 50, radioVolume: 40, musicSource: 'microphone' };
    const tc002Gpio: Capabilities['gpio'] = null;
    expect([removed, volumes, tc002Gpio]).toHaveLength(3);
  });
});
