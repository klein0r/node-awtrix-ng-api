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
  it('enforces exactly one audio source', () => {
    const ok: AudioPlayRequest = { station: 'SWR3' };
    // @ts-expect-error - two sources at once
    const twoSources: AudioPlayRequest = { station: 'SWR3', url: 'http://x' };
    // @ts-expect-error - no source at all
    const none: AudioPlayRequest = {};
    expect([ok, twoSources, none]).toHaveLength(3);
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
      sound: 5,
    };
    // @ts-expect-error - unknown payload key
    const typo: NotificationPayload = { txt: 'Hi' };
    // @ts-expect-error - invalid enum value
    const badMode: NotificationPayload = { scroll: { mode: 'zigzag' } };

    const settings: SettingsUpdate = { timeColor: null, textColor: 0xffffff, timeMode: 5 };
    // @ts-expect-error - textColor is not nullable
    const nullText: SettingsUpdate = { textColor: null };
    // @ts-expect-error - timeMode is 0..6
    const badTimeMode: SettingsUpdate = { timeMode: 7 };
    expect([notification, typo, badMode, settings, nullText, badTimeMode]).toHaveLength(6);
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
