import { describe, expect, expectTypeOf, it } from 'vitest';
import {
  AwtrixValidationError,
  Draw,
  hsv,
  isValidAppName,
  packColor,
  parseHexColor,
  rgb,
  toHexColor,
  unpackColor,
  type AppInfo,
  type AudioPlayRequest,
  type IndicatorUpdate,
  type MoodlightOptions,
  type NotificationPayload,
  type SettingsUpdate,
  type SharedValue,
} from '../src/index.js';

describe('color helpers', () => {
  it('converts between forms', () => {
    expect(rgb(255, 0, 0)).toEqual([255, 0, 0]);
    expect(hsv(120, 100, 50)).toEqual(['HSV', 120, 100, 50]);
    expect(packColor(255, 0, 0)).toBe(16711680);
    expect(unpackColor(0x00ff80)).toEqual([0, 255, 128]);
    expect(toHexColor(0x0a0b0c)).toBe('#0A0B0C');
    expect(toHexColor([255, 170, 0])).toBe('#FFAA00');
    expect(parseHexColor('#F00')).toBe(0xff0000);
    expect(parseHexColor('00aaff')).toBe(0x00aaff);
  });

  it('rejects invalid colors', () => {
    expect(() => rgb(256, 0, 0)).toThrow(AwtrixValidationError);
    expect(() => hsv(0, 101, 0)).toThrow(AwtrixValidationError);
    expect(() => unpackColor(0x1000000)).toThrow(AwtrixValidationError);
    expect(() => parseHexColor('#12')).toThrow(AwtrixValidationError);
  });
});

describe('Draw', () => {
  it('builds commands with and without color', () => {
    expect(Draw.pixel(1, 2)).toEqual(['pixel', 1, 2]);
    expect(Draw.line(0, 0, 5, 5, [0, 255, 0])).toEqual(['line', 0, 0, 5, 5, [0, 255, 0]]);
    expect(Draw.circleFill(4, 4, 2, '#F00')).toEqual(['circleFill', 4, 4, 2, '#F00']);
    expect(Draw.pixels(null, [[0, 0], [1, 1]])).toEqual(['pixels', null, 0, 0, 1, 1]);
    expect(Draw.bitmap(0, 0, 2, 1, ['#F00', 255])).toEqual(['bitmap', 0, 0, 2, 1, ['#F00', 255]]);
  });
});

describe('isValidAppName', () => {
  it('follows the device rules', () => {
    expect(isValidAppName('weather_1-x')).toBe(true);
    expect(isValidAppName('with space')).toBe(false);
    expect(isValidAppName('order')).toBe(false);
    expect(isValidAppName('')).toBe(false);
  });
});

/*
 * Compile-time checks: `npm run typecheck` fails if any of these stop holding.
 */
describe('type safety', () => {
  it('enforces the sound object rules', () => {
    const name: AudioPlayRequest = 'ding';
    const station: AudioPlayRequest = { station: 0 };
    const list: AudioPlayRequest = [{ speech: 'Hi' }, 'ding'];
    const looping: AudioPlayRequest = { song: 'lead: c4', loop: true, nextBar: true };
    // @ts-expect-error - two sources at once
    const twoSources: AudioPlayRequest = { file: 'a', rtttl: 'b' };
    // @ts-expect-error - no source at all
    const none: AudioPlayRequest = {};
    // @ts-expect-error - loop is not allowed with station
    const loopStation: AudioPlayRequest = { station: 'WDR', loop: true };
    // @ts-expect-error - nextBar needs a looping song
    const nextBar: AudioPlayRequest = { song: 'x', nextBar: true };
    // @ts-expect-error - station is not allowed in a list
    const stationInList: AudioPlayRequest = [{ station: 'WDR' }];
    // @ts-expect-error - at most 4 entries
    const tooMany: AudioPlayRequest = ['a', 'b', 'c', 'd', 'e'];
    expect([name, station, list, looping, twoSources, none, loopStation, nextBar, stationInList, tooMany]).toHaveLength(10);
  });

  it('requires at least one field for mood light and indicators', () => {
    const mood: MoodlightOptions = { brightness: 30 };
    // @ts-expect-error - empty body
    const emptyMood: MoodlightOptions = {};
    const indicator: IndicatorUpdate = { color: null };
    // @ts-expect-error - empty body
    const emptyIndicator: IndicatorUpdate = {};
    expect([mood, emptyMood, indicator, emptyIndicator]).toHaveLength(4);
  });

  it('types payload and settings keys', () => {
    const notification: NotificationPayload = {
      text: 'Hi',
      textColor: 'palette',
      palette: [{ color: '#F00', pos: 0 }, { color: [0, 0, 255], pos: 100 }],
      effect: 'Matrix',
      scroll: 'bounce',
      hold: true,
      sound: { rtttl: 'bell:d=4,o=5,b=120:c,e,g', loop: true },
    };
    // @ts-expect-error - unknown payload key
    const typo: NotificationPayload = { txt: 'Hi' };
    // @ts-expect-error - textCenter is no longer documented; use textAlign
    const oldCenter: NotificationPayload = { text: 'Hi', textCenter: false };
    // @ts-expect-error - textAlign takes start, center or end
    const badAlign: NotificationPayload = { text: 'Hi', textAlign: 'middle' };
    const aligned: NotificationPayload = { text: '42', textAlign: 'end' };
    // @ts-expect-error - invalid enum value
    const badMode: NotificationPayload = { scroll: { mode: 'zigzag' } };

    const settings: SettingsUpdate = { timeColor: null, textColor: 0xffffff, timeMode: 5 };
    // @ts-expect-error - textColor is not nullable
    const nullText: SettingsUpdate = { textColor: null };
    // @ts-expect-error - timeMode is 0..6
    const badTimeMode: SettingsUpdate = { timeMode: 7 };
    expect([notification, typo, oldCenter, badAlign, aligned, badMode, settings, nullText, badTimeMode]).toHaveLength(9);
  });

  it('narrows discriminated unions', () => {
    const app = { name: 'weather', origin: 'pushed', enabled: true, inLoop: true, present: true, slot: 1 } as AppInfo;
    if (app.origin === 'pushed') expectTypeOf(app.icon).toEqualTypeOf<string | undefined>();
    if (app.origin === 'module') expectTypeOf(app.import).toEqualTypeOf<string>();

    const shared = { owner: 'w', key: 'k', type: 'bool', value: true, ageMs: 1 } as SharedValue;
    if (shared.type === 'bool') expectTypeOf(shared.value).toEqualTypeOf<boolean>();
    expect(app.name).toBe('weather');
  });
});
