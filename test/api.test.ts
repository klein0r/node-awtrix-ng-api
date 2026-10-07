import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { AwtrixApiError, AwtrixClient, AwtrixConnectionError, AwtrixValidationError, Draw } from '../src/index.js';
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

describe('argument errors', () => {
  it('reject the promise instead of throwing synchronously', async () => {
    let promise: Promise<unknown> | undefined;
    expect(() => {
      promise = client.apps.push('bad name', { text: 'x' });
    }).not.toThrow();
    await expect(promise).rejects.toBeInstanceOf(AwtrixValidationError);
    expect(mock.requests).toHaveLength(0);
  });
});

describe('device', () => {
  it('reads state, version and capabilities', async () => {
    mock.reply({ body: { version: '1.0.12', uid: 'abc', matrixPower: true } });
    const state = await client.device.get();
    expect(state.version).toBe('1.0.12');
    expectRequest('GET', '/api/v1/device');

    mock.reply({ body: { version: '1.0.12' } });
    expect(await client.device.version()).toBe('1.0.12');
    expectRequest('GET', '/api/v1/version');

    mock.reply({ body: { effects: ['Matrix'], transitions: [], overlays: [], palettes: [], audio: {}, gpio: {} } });
    expect((await client.device.capabilities()).effects).toEqual(['Matrix']);
    expectRequest('GET', '/api/v1/capabilities');
  });

  it('reboots, sleeps and factory-resets', async () => {
    expect(await client.device.reboot()).toEqual({ ok: true });
    expectRequest('POST', '/api/v1/device/reboot');
    await client.device.sleep(60000);
    expectRequest('POST', '/api/v1/device/sleep', { durationMs: 60000 });
    await client.device.factoryReset();
    expectRequest('POST', '/api/v1/device/factory-reset');
  });

  it('validates the sleep duration', async () => {
    await expect(client.device.sleep(0)).rejects.toThrow(AwtrixValidationError);
    await expect(client.device.sleep(1.5)).rejects.toThrow(AwtrixValidationError);
  });

  it('pings via GET /version', async () => {
    mock.reply({ raw: '1.0.12', headers: { 'Content-Type': 'text/plain' } });
    expect(await client.device.ping()).toBe(true);
    expectRequest('GET', '/version');
    mock.reply({ status: 500, raw: '' });
    expect(await client.device.ping()).toBe(false);
  });

  it('waits until the device is back online', async () => {
    mock
      .reply({ status: 503, body: { error: { code: 'unavailable', message: 'booting' } } })
      .reply({ raw: '1.0.13\n', headers: { 'Content-Type': 'text/plain' } });
    expect(await client.device.waitForOnline({ intervalMs: 10, timeoutMs: 2000 })).toBe('1.0.13');
  });

  it('gives up waiting after the timeout', async () => {
    mock.replyAlways({ status: 503, body: { error: { code: 'unavailable', message: 'booting' } } });
    const error = await client.device.waitForOnline({ intervalMs: 10, timeoutMs: 60 }).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(AwtrixConnectionError);
    expect((error as AwtrixConnectionError).isTimeout).toBe(true);
  });
});

describe('settings', () => {
  it('gets, patches and resets', async () => {
    mock.reply({ body: { brightness: 120 } });
    await client.settings.get();
    expectRequest('GET', '/api/v1/settings');

    mock.reply({ body: { brightness: 80 } });
    const updated = await client.settings.update({ brightness: 80, timeColor: null, scroll: 'loop', weekdayBar: { weekendDays: ['friday', 'saturday'] } });
    expect(updated.brightness).toBe(80);
    expectRequest('PATCH', '/api/v1/settings', {
      brightness: 80,
      timeColor: null,
      scroll: 'loop',
      weekdayBar: { weekendDays: ['friday', 'saturday'] },
    });

    await client.settings.reset();
    expectRequest('POST', '/api/v1/settings/reset');
  });

  it('rejects out-of-range values before sending', async () => {
    await expect(client.settings.update({ brightness: 256 })).rejects.toThrow(/brightness/);
    await expect(client.settings.setBrightness(-1)).rejects.toThrow(AwtrixValidationError);
    expect(mock.requests).toHaveLength(0);
  });
});

describe('display', () => {
  it('controls power, overlay and mood light', async () => {
    await client.display.setOverlay('snow', { speed: 2, palette: 'Cloud', blend: true });
    expectRequest('PATCH', '/api/v1/display', { overlay: 'snow', overlaySettings: { speed: 2, palette: 'Cloud', blend: true } });
    await client.display.clearOverlay();
    expectRequest('PATCH', '/api/v1/display', { overlay: null });

    await client.display.setMoodlight({ kelvin: 2700, brightness: 90 });
    expectRequest('PUT', '/api/v1/display/moodlight', { kelvin: 2700, brightness: 90 });
    await client.display.disableMoodlight();
    expectRequest('DELETE', '/api/v1/display/moodlight');

    mock.reply({ body: { width: 32, height: 8, pixels: [16711680] } });
    expect((await client.display.getScreen()).pixels[0]).toBe(0xff0000);
    expectRequest('GET', '/api/v1/display/screen');
  });

  it('refuses an empty mood light and a wrapping brightness', async () => {
    await expect(client.display.setMoodlight({} as never)).rejects.toThrow(AwtrixValidationError);
    await expect(client.display.setMoodlight({ brightness: 300 })).rejects.toThrow(/brightness/);
    await expect(client.display.update({})).rejects.toThrow(AwtrixValidationError);
  });
});

describe('apps', () => {
  it('lists, switches and navigates', async () => {
    mock.reply({ body: [{ name: 'Time', enabled: true, inLoop: true, present: true, slot: 0, origin: 'builtin' }] });
    const apps = await client.apps.list();
    expect(apps[0]?.origin).toBe('builtin');

    await client.apps.switchTo('Time', { fast: true });
    expectRequest('PUT', '/api/v1/apps/active', { name: 'Time', fast: true });
    await client.apps.switchTo('Date');
    expectRequest('PUT', '/api/v1/apps/active', { name: 'Date' });
    await client.apps.next();
    expectRequest('POST', '/api/v1/apps/next');
    await client.apps.previous();
    expectRequest('POST', '/api/v1/apps/previous');
  });

  it('sets the order', async () => {
    await client.apps.setOrder({ order: ['Time', 'weather', 'Time'], disabled: ['Battery'] });
    expectRequest('PUT', '/api/v1/apps/order', { order: ['Time', 'weather', 'Time'], disabled: ['Battery'] });
    await client.apps.disable(['Battery']);
    expectRequest('PUT', '/api/v1/apps/order', { disabled: ['Battery'] });
    await expect(client.apps.setOrder({ order: ['Time'] } as never)).rejects.toThrow(/disabled/);
  });

  it('pushes single and array payloads', async () => {
    await client.apps.push('weather', {
      text: [{ text: 'CPU ', color: '#888' }, { text: '87', color: [255, 0, 0] }],
      icon: '2422',
      scroll: { mode: 'bounce', speed: 50 },
      draw: [Draw.rect(0, 0, 32, 8, '#202020'), Draw.pixels('#F00', [[1, 2], [3, 4]]), Draw.text(9, 1, 'HI')],
    });
    expectRequest('PUT', '/api/v1/apps/pushed/weather', {
      text: [{ text: 'CPU ', color: '#888' }, { text: '87', color: [255, 0, 0] }],
      icon: '2422',
      scroll: { mode: 'bounce', speed: 50 },
      draw: [['rect', 0, 0, 32, 8, '#202020'], ['pixels', '#F00', 1, 2, 3, 4], ['text', 9, 1, 'HI']],
    });

    await client.apps.push('stocks', [{ text: 'AAPL 189' }, { text: 'MSFT 402' }]);
    expectRequest('PUT', '/api/v1/apps/pushed/stocks', [{ text: 'AAPL 189' }, { text: 'MSFT 402' }]);
  });

  it('validates names and payloads', async () => {
    await expect(client.apps.push('bad name', { text: 'x' })).rejects.toThrow(/\[A-Za-z0-9_-\]/);
    await expect(client.apps.push('next', { text: 'x' })).rejects.toThrow(/reserved/);
    await expect(client.apps.push('a'.repeat(33), { text: 'x' })).rejects.toThrow(AwtrixValidationError);
    await expect(client.apps.push('ok', {})).rejects.toThrow(/at least one key/);
    await expect(client.apps.push('ok', [])).rejects.toThrow(/empty array/);
    expect(mock.requests).toHaveLength(0);
  });

  it('switches one app on or off', async () => {
    await client.apps.setEnabled('Time', false);
    expectRequest('PUT', '/api/v1/apps/Time/enabled');
    expect(mock.last.text).toBe('false');
    expect(mock.last.headers['content-type']).toBe('application/json');
    await client.apps.setEnabled('weather', true);
    expect(mock.last.text).toBe('true');
    await expect(client.apps.setEnabled('Time', 'yes' as never)).rejects.toThrow(/true or false/);
    await expect(client.apps.setEnabled('bad name', true)).rejects.toBeInstanceOf(AwtrixValidationError);
  });

  it('deletes apps', async () => {
    await client.apps.delete('weather');
    expectRequest('DELETE', '/api/v1/apps/weather');
  });

  it('surfaces the 507 app cap', async () => {
    mock.reply({ status: 507, body: { error: { code: 'insufficientStorage', message: 'storage capacity reached' } } });
    const error = (await client.apps.push('many', { text: 'x' }).catch((e: unknown) => e)) as AwtrixApiError;
    expect(error.isInsufficientStorage).toBe(true);
  });
});

describe('scripts', () => {
  it('reads and installs source as plain text', async () => {
    mock.reply({ raw: '# clock\nclass Clock end', headers: { 'Content-Type': 'text/plain' } });
    expect(await client.scripts.getSource('clock')).toBe('# clock\nclass Clock end');
    expectRequest('GET', '/api/v1/apps/script/clock');

    mock.reply({ body: { ok: true, name: 'clock', error: { message: "syntax_error: unexpected token ')'", line: 12 } } });
    const result = await client.scripts.install('clock', 'class Clock end');
    expect(result.error?.line).toBe(12);
    expectRequest('PUT', '/api/v1/apps/script/clock');
    expect(mock.last.text).toBe('class Clock end');
    expect(mock.last.headers['content-type']).toMatch(/^text\/plain/);
  });

  it('updates only an unchanged script', async () => {
    await client.scripts.updateIfUnchanged('clock', null, 'class Clock end');
    expectRequest('PUT', '/api/v1/apps/script-update/clock', { expected_source: null, source: 'class Clock end' });

    mock.reply({ status: 409, body: { error: { code: 'scriptChanged', message: 'source changed' } } });
    const error = (await client.scripts.updateIfUnchanged('clock', 'old', 'new').catch((e: unknown) => e)) as AwtrixApiError;
    expect(error.isConflict).toBe(true);
    expect(error.code).toBe('scriptChanged');
  });

  it('handles config and shared values', async () => {
    mock.reply({ body: { name: 'Weather', fields: [{ key: 'metric', type: 'bool', label: 'Celsius', default: true, value: true }], warnings: [] } });
    const config = await client.scripts.getConfig('Weather');
    const field = config.fields[0]!;
    if (field.type === 'bool') expect(field.value).toBe(true);
    expectRequest('GET', '/api/v1/apps/Weather/config');

    mock.reply({ body: { ok: true, name: 'Weather', error: null } });
    await client.scripts.updateConfig('Weather', { lat: '48.14', tint: '#00FF00', every: 30, metric: false });
    expectRequest('PATCH', '/api/v1/apps/Weather/config', { lat: '48.14', tint: '#00FF00', every: 30, metric: false });

    mock.reply({ body: [{ owner: 'weather', key: 'temp', type: 'real', value: 21.5, ageMs: 3200 }] });
    const shared = await client.scripts.getShared();
    expect(shared[0]?.type).toBe('real');
    expectRequest('GET', '/api/v1/scripts/shared');

    await client.scripts.delete('clock');
    expectRequest('DELETE', '/api/v1/apps/clock');
  });

  it('refuses empty sources and configs', async () => {
    await expect(client.scripts.install('clock', '')).rejects.toThrow(/source/);
    await expect(client.scripts.updateConfig('clock', {})).rejects.toThrow(AwtrixValidationError);
  });
});

describe('notifications', () => {
  it('sends and dismisses', async () => {
    await client.notifications.send({ text: 'Doorbell', icon: '1234', hold: true, name: 'door', sound: { rtttl: 'd:d=4,o=5,b=120:c,e,g', loop: true } });
    expectRequest('POST', '/api/v1/notifications', { text: 'Doorbell', icon: '1234', hold: true, name: 'door', sound: { rtttl: 'd:d=4,o=5,b=120:c,e,g', loop: true } });
    await client.notifications.send({ text: 'Door', sound: [{ speech: 'The door is open.' }, 'ding'] });
    expectRequest('POST', '/api/v1/notifications', { text: 'Door', sound: [{ speech: 'The door is open.' }, 'ding'] });
    await client.notifications.send({ text: 'Quiet', sound: null });
    expectRequest('POST', '/api/v1/notifications', { text: 'Quiet', sound: null });
    await client.notifications.dismiss();
    expectRequest('DELETE', '/api/v1/notifications/active');
    await client.notifications.dismissByName('backup job');
    expectRequest('DELETE', '/api/v1/notifications/backup%20job');
  });

  it('protects the reserved name "active"', async () => {
    await expect(client.notifications.dismissByName('active')).rejects.toThrow(/reserved/);
    await expect(client.notifications.send({ text: 'x', name: 'active' })).rejects.toThrow(/reserved/);
  });
});

describe('indicators', () => {
  it('sets and clears', async () => {
    await client.indicators.set(1, { color: '#FF0000', blinkMs: 500 });
    expectRequest('PUT', '/api/v1/indicators/1', { color: '#FF0000', blinkMs: 500 });
    await client.indicators.set(2, { color: null });
    expectRequest('PUT', '/api/v1/indicators/2', { color: null });
    await client.indicators.clear(3);
    expectRequest('DELETE', '/api/v1/indicators/3');
  });

  it('validates id, body and ranges', async () => {
    await expect(client.indicators.set(4 as never, { color: 'F00' })).rejects.toThrow(/id/);
    await expect(client.indicators.set(1, {} as never)).rejects.toThrow(AwtrixValidationError);
    await expect(client.indicators.set(1, { fadeMs: 70000 })).rejects.toThrow(/fadeMs/);
  });
});

describe('audio', () => {
  it('plays names, sound objects and lists', async () => {
    await client.audio.play('ding');
    expectRequest('POST', '/api/v1/audio/play', 'ding');
    await client.audio.play({ rtttl: 'beep:d=4,o=5,b=120:c,e,g', loop: true });
    expectRequest('POST', '/api/v1/audio/play', { rtttl: 'beep:d=4,o=5,b=120:c,e,g', loop: true });
    await client.audio.play([{ speech: 'Hello' }, 'Racer/boost', 'https://example.com/a.mp3']);
    expectRequest('POST', '/api/v1/audio/play', [{ speech: 'Hello' }, 'Racer/boost', 'https://example.com/a.mp3']);
    await client.audio.play({ song: 'bpm 96; lead: c4:4 e g', loop: true, nextBar: true });
    expectRequest('POST', '/api/v1/audio/play', { song: 'bpm 96; lead: c4:4 e g', loop: true, nextBar: true });
  });

  it('offers single-source shorthands', async () => {
    await client.audio.playFile('Racer/boost', { loop: true });
    expectRequest('POST', '/api/v1/audio/play', { file: 'Racer/boost', loop: true });
    await client.audio.playRtttl('d=4,o=5,b=100:e,c');
    expectRequest('POST', '/api/v1/audio/play', { rtttl: 'd=4,o=5,b=100:e,c' });
    await client.audio.playSong('lead: c4:4');
    expectRequest('POST', '/api/v1/audio/play', { song: 'lead: c4:4' });
    await client.audio.speak('The door is open.');
    expectRequest('POST', '/api/v1/audio/play', { speech: 'The door is open.' });
    await client.audio.playTrack(5);
    expectRequest('POST', '/api/v1/audio/play', { track: 5 });
    await client.audio.playStation('SWR3');
    expectRequest('POST', '/api/v1/audio/play', { station: 'SWR3' });
    await client.audio.playStation(0);
    expectRequest('POST', '/api/v1/audio/play', { station: 0 });
  });

  it('refuses what the device would reject', async () => {
    await expect(client.audio.play({} as never)).rejects.toThrow(/needs a sound key/);
    await expect(client.audio.play({ file: 'a', rtttl: 'b' } as never)).rejects.toThrow(/one sound key only/);
    await expect(client.audio.play({ mp3: 'old' } as never)).rejects.toThrow(/unknown field/);
    await expect(client.audio.play({ track: 3000 })).rejects.toThrow(/track/);
    await expect(client.audio.play({ station: 'WDR', loop: true } as never)).rejects.toThrow(/not with station/);
    await expect(client.audio.play({ song: 'x', nextBar: true } as never)).rejects.toThrow(/looping song/);
    await expect(client.audio.play(['a', 'b', 'c', 'd', 'e'] as never)).rejects.toThrow(/1 to 4/);
    await expect(client.audio.play([{ station: 'WDR' }] as never)).rejects.toThrow(/not here/);
    await expect(client.audio.play('bad name')).rejects.toThrow(/Script\/name/);
    await expect(client.audio.speak('x'.repeat(513))).rejects.toThrow(/512 bytes/);
    await expect(client.notifications.send({ text: 'x', sound: { station: 'WDR' } as never })).rejects.toThrow(/not here/);
    expect(mock.requests).toHaveLength(0);
  });

  it('plays clips as raw bytes', async () => {
    const wav = Buffer.concat([Buffer.from('RIFF'), Buffer.alloc(40)]);
    await client.audio.playClip(wav);
    expectRequest('POST', '/api/v1/audio/clip');
    expect(mock.last.headers['content-type']).toBe('audio/wav');
    expect(mock.last.body.equals(wav)).toBe(true);
    await client.audio.playClip(new Blob([Buffer.from('ID3mp3')]));
    expect(mock.last.headers['content-type']).toBe('audio/mpeg');
    expect(mock.last.text).toBe('ID3mp3');
    await expect(client.audio.playClip(new Uint8Array())).rejects.toThrow(/empty/);
  });

  it('stops everything or one group', async () => {
    await client.audio.stop();
    expectRequest('POST', '/api/v1/audio/stop');
    expect(mock.last.body.length).toBe(0);
    await client.audio.stop('radio');
    expectRequest('POST', '/api/v1/audio/stop', { group: 'radio' });
    await expect(client.audio.stop('stream' as never)).rejects.toThrow(/group/);
  });

  it('manages melodies', async () => {
    mock.reply({ status: 201, body: { ok: true } });
    expect(await client.audio.saveMelody('doorbell', 'd=4,o=5,b=100:e,c')).toEqual({ ok: true, created: true });
    expectRequest('PUT', '/api/v1/audio/melodies/doorbell', { rtttl: 'd=4,o=5,b=100:e,c' });
    mock.reply({ status: 200, body: { ok: true } });
    expect((await client.audio.saveMelody('doorbell', 'd=4,o=5,b=100:e,c')).created).toBe(false);

    mock.reply({ body: { melodies: [], usedBytes: 1, totalBytes: 2 } });
    await client.audio.listMelodies();
    expectRequest('GET', '/api/v1/audio/melodies');
    await client.audio.deleteMelody('doorbell');
    expectRequest('DELETE', '/api/v1/audio/melodies/doorbell');
    await expect(client.audio.saveMelody('x'.repeat(25), 'c')).rejects.toThrow(AwtrixValidationError);
  });

  it('uploads and deletes MP3s', async () => {
    await client.audio.uploadMp3('ding', Buffer.from('ID3fake-mp3'));
    expectRequest('POST', '/api/v1/audio/mp3');
    expect(mock.last.headers['content-type']).toMatch(/^multipart\/form-data; boundary=/);
    expect(mock.last.text).toContain('filename="ding.mp3"');
    expect(mock.last.text).toContain('ID3fake-mp3');

    await client.audio.renameMp3('ding.mp3', 'bell');
    expectRequest('POST', '/api/v1/audio/mp3/rename', { from: 'ding', to: 'bell' });
    await expect(client.audio.renameMp3('ding', 'bad name')).rejects.toBeInstanceOf(AwtrixValidationError);

    await client.audio.deleteMp3('ding.mp3');
    expectRequest('DELETE', '/api/v1/audio/mp3/ding');
    await expect(client.audio.uploadMp3('bad name', Buffer.from('x'))).rejects.toThrow(AwtrixValidationError);
    await expect(client.audio.uploadMp3('empty', new Uint8Array())).rejects.toThrow(/empty/);
  });

  it('manages radio stations', async () => {
    await client.audio.setStations([{ name: 'SWR3', url: 'https://liveradio.swr.de/sw282p3/swr3/' }]);
    expectRequest('PUT', '/api/v1/audio/stations', { stations: [{ name: 'SWR3', url: 'https://liveradio.swr.de/sw282p3/swr3/' }] });
    await expect(client.audio.setStations([{ name: 'A', url: 'ftp://x' }])).rejects.toThrow(/stations\[0\]\.url/);
    await expect(client.audio.setStations([
        { name: 'A', url: 'http://a' },
        { name: 'A', url: 'http://b' },
      ]),).rejects.toThrow(/duplicate/);

    mock.reply({ body: { stations: [{ name: 'SWR3', url: 'x' }] } });
    expect(await client.audio.getStations()).toEqual([{ name: 'SWR3', url: 'x' }]);
    expectRequest('GET', '/api/v1/audio/stations');
  });
});

describe('system', () => {
  it('reads and writes the configuration', async () => {
    mock.reply({ body: { hostname: 'awtrix' } });
    await client.system.get();
    expectRequest('GET', '/api/v1/system');
    expect(mock.last.query.has('secrets')).toBe(false);

    mock.reply({ body: { hostname: 'awtrix', wifiPass: 'x' } });
    await client.system.getWithSecrets();
    expect(mock.last.query.get('secrets')).toBe('1');

    mock.reply({ body: { ntpServer: '192.168.1.1' } });
    await client.system.update({ ntpServer: '192.168.1.1', statsInterval: 30000 });
    expectRequest('PUT', '/api/v1/system', { ntpServer: '192.168.1.1', statsInterval: 30000 });
  });

  it('reports invalid pin maps', async () => {
    mock.reply({ status: 400, body: { error: { code: 'invalidPinConfig', message: 'GPIO 6 is reserved' } } });
    const error = (await client.system.update({ pinBuzzer: 6 }).catch((e: unknown) => e)) as AwtrixApiError;
    expect(error.code).toBe('invalidPinConfig');
    expect(error.isBadRequest).toBe(true);
  });

  it('polls the Wi-Fi scan', async () => {
    mock
      .reply({ status: 202, body: { scanning: true } })
      .reply({ status: 202, body: { scanning: true } })
      .reply({ body: [{ ssid: 'Home', rssi: -45, enc: true }] });
    expect(await client.system.waitForWifiScan({ intervalMs: 5 })).toEqual([{ ssid: 'Home', rssi: -45, enc: true }]);
    expect(mock.requests).toHaveLength(3);
    expectRequest('GET', '/api/v1/system/wifi-scan');
  });

  it('reads logs incrementally', async () => {
    mock.reply({ body: { next: 42, lines: ['12:00:00 hi'] } });
    const logs = await client.system.getLogs(40);
    expect(logs.next).toBe(42);
    expect(mock.last.query.get('after')).toBe('40');
  });

  it('uploads firmware and restores backups', async () => {
    await client.system.updateFirmware(Buffer.from('firmware-bytes'), 'firmware-awtrix-ng.bin');
    expectRequest('POST', '/update');
    expect(mock.last.text).toContain('name="firmware"; filename="firmware-awtrix-ng.bin"');

    mock.reply({ body: { ok: true, applied: { settings: 1, icons: 3 }, warnings: [] } });
    const restore = await client.system.restoreBackup(new Blob(['zip']));
    expect(restore.applied.icons).toBe(3);
    expectRequest('POST', '/api/v1/restore');
  });
});

describe('files', () => {
  it('lists, uploads, downloads and deletes', async () => {
    mock.reply({ body: { files: [{ name: '1234.gif', size: 10 }], usedBytes: 1, totalBytes: 2 } });
    await client.files.list('/MELODIES');
    expectRequest('GET', '/api/v1/files');
    expect(mock.last.query.get('dir')).toBe('/MELODIES');

    await client.files.uploadIcon('1234.gif', Buffer.from('GIF89a'));
    expectRequest('POST', '/api/v1/files');
    expect(mock.last.query.get('dir')).toBe('/ICONS');
    expect(mock.last.text).toContain('filename="1234.gif"');

    mock.reply({ raw: Buffer.from([0x47, 0x49, 0x46]), headers: { 'Content-Type': 'image/gif' } });
    const bytes = await client.files.download('/ICONS/1234.gif');
    expect([...bytes]).toEqual([0x47, 0x49, 0x46]);
    expectRequest('GET', '/ICONS/1234.gif');

    await client.files.delete('/ICONS/1234.gif');
    expectRequest('DELETE', '/api/v1/files');
    expect(mock.last.query.get('path')).toBe('/ICONS/1234.gif');
  });

  it('guards paths', async () => {
    await expect(client.files.delete('/ICONS/../config/x')).rejects.toThrow(/path/);
    await expect(client.files.delete('/SCRIPTS/x')).rejects.toThrow(/path/);
    await expect(client.files.upload('/ICONS', '../x.gif', Buffer.from('x'))).rejects.toThrow(/fileName/);
    await expect(client.files.uploadIcon('icon.png', Buffer.from('x'))).rejects.toThrow(/gif/);
  });

  it('manages icon origins', async () => {
    mock.reply({ body: { icons: [{ name: 'mail.gif', hub: 'https://awtrix.de/icons/', slug: 'mail', sha256: 'a'.repeat(64) }] } });
    expect(await client.files.listIconOrigins()).toHaveLength(1);
    expectRequest('GET', '/api/v1/icons/origins');

    const origin = { name: 'mail.gif', hub: 'https://awtrix.de/icons/', slug: 'mail', sha256: 'a'.repeat(64) };
    await client.files.setIconOrigin(origin);
    expectRequest('PUT', '/api/v1/icons/origins', origin);
    await expect(client.files.setIconOrigin({ ...origin, hub: 'http://awtrix.de/icons/' })).rejects.toThrow(/hub/);

    await client.files.deleteIconOrigin('mail.gif');
    expectRequest('DELETE', '/api/v1/icons/origins');
    expect(mock.last.query.get('name')).toBe('mail.gif');
  });
});
