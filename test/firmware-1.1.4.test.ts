import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  AwtrixApiError,
  AwtrixClient,
  AwtrixValidationError,
  Draw,
  type AppPayload,
  type AudioPlayRequest,
  type Capabilities,
  type NativeRegion,
  type Settings,
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

describe('audio', () => {
  it('plays mixer and synthesizer sources with their modifiers', async () => {
    await client.audio.playSfx('boost', { script: 'Racer' });
    expectRequest('POST', '/api/v1/audio/play', { sfx: 'boost', script: 'Racer' });
    await client.audio.playLoop('engine');
    expectRequest('POST', '/api/v1/audio/play', { loop: 'engine' });
    await client.audio.playSong('bpm 96; lead: c4:4 e g', { nextBar: true });
    expectRequest('POST', '/api/v1/audio/play', { song: 'bpm 96; lead: c4:4 e g', nextBar: true });
    await client.audio.playFx('lead: c5:8');
    expectRequest('POST', '/api/v1/audio/play', { fx: 'lead: c5:8' });
    await client.audio.play({ mp3: 'ding', script: 'Racer' });
    expectRequest('POST', '/api/v1/audio/play', { mp3: 'ding', script: 'Racer' });
    await client.audio.stop('loop');
    expectRequest('POST', '/api/v1/audio/stop', { scope: 'loop' });
  });

  it('refuses modifiers next to the wrong source', async () => {
    await expect(client.audio.play({ melody: 'x', script: 'Racer' } as never)).rejects.toThrow(/script/);
    await expect(client.audio.play({ sfx: 'x', nextBar: true } as never)).rejects.toThrow(/nextBar/);
    await expect(client.audio.play({ sfx: 'x', script: 'bad name' })).rejects.toBeInstanceOf(AwtrixValidationError);
    expect(mock.requests).toHaveLength(0);
  });

  it('falls back to GET /api/v1/audio for stations on older firmware', async () => {
    mock
      .reply({ status: 405, body: { error: { code: 'methodNotAllowed', message: 'allowed method(s): PUT' } } })
      .reply({ body: { available: true, mp3: { playing: false, name: '' }, radio: {}, stations: [{ name: 'SWR3', url: 'x' }] } });
    expect(await client.audio.getStations()).toEqual([{ name: 'SWR3', url: 'x' }]);
    expect(mock.requests.map((r) => r.path)).toEqual(['/api/v1/audio/stations', '/api/v1/audio']);
  });

  it('does not hide other station errors', async () => {
    mock.reply({ status: 401, body: { error: { code: 'unauthorized', message: 'authentication required' } } });
    const error = (await client.audio.getStations().catch((e: unknown) => e)) as AwtrixApiError;
    expect(error.isUnauthorized).toBe(true);
    expect(mock.requests).toHaveLength(1);
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
  it('reads, pairs and forgets the gamepad', async () => {
    mock.reply({ body: { state: 'ready', name: '8BitDo', address: 'aa:bb' } });
    expect((await client.gamepad.get()).state).toBe('ready');
    expectRequest('GET', '/api/v1/gamepad');
    await client.gamepad.pair();
    expectRequest('POST', '/api/v1/gamepad/pair');
    await client.gamepad.forget();
    expectRequest('DELETE', '/api/v1/gamepad');
  });

  it('reads the voice state', async () => {
    mock.reply({ body: { config: { enabled: true, url: 'http://ha:8123', pipeline: '', tokenSet: true }, state: 'ready', error: '', pipelines: [] } });
    expect((await client.voice.get()).config.tokenSet).toBe(true);
    expectRequest('GET', '/api/v1/voice');
  });

  it('reports a missing gamepad as 404 on other devices', async () => {
    mock.reply({ status: 404, body: { error: { code: 'notFound', message: 'unknown route' } } });
    const error = (await client.gamepad.get().catch((e: unknown) => e)) as AwtrixApiError;
    expect(error.isNotFound).toBe(true);
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

  it('allows script and nextBar only next to their sources', () => {
    const ok: AudioPlayRequest = { loop: 'engine', script: 'Racer' };
    // @ts-expect-error - script is not allowed with melody
    const scriptOnMelody: AudioPlayRequest = { melody: 'x', script: 'Racer' };
    // @ts-expect-error - nextBar is only allowed with song
    const nextBarOnFx: AudioPlayRequest = { fx: 'x', nextBar: true };
    expect([ok, scriptOnMelody, nextBarOnFx]).toHaveLength(3);
  });

  it('describes both firmware generations', () => {
    const older: Pick<Settings, 'clockFace' | 'radioMeta'> = { radioMeta: true };
    const newer: Pick<Settings, 'clockFace' | 'radioMeta'> = { clockFace: 'flap' };
    const tc002Gpio: Capabilities['gpio'] = null;
    expect([older, newer, tc002Gpio]).toHaveLength(3);
  });
});
