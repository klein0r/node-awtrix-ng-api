/**
 * Building blocks shared by every part of the AWTRIX NG API.
 */

/**
 * A string union that still accepts arbitrary strings while keeping IDE autocompletion
 * for the known values. Used for names the firmware may extend in future releases
 * (effects, transitions, overlays, palettes ...).
 */
export type LooseString<Known extends string> = Known | (string & {});

/** A color as AWTRIX reports it: always an uppercase `"#RRGGBB"` string. */
export type HexColor = `#${string}`;

/** `[r, g, b]` with every channel in `0..255`. */
export type RgbColor = readonly [r: number, g: number, b: number];

/** `["HSV", h, s, v]` with `h` in `0..360` and `s`/`v` in `0..100`. */
export type HsvColor = readonly [model: 'HSV', h: number, s: number, v: number];

/**
 * Every color form AWTRIX accepts on input:
 *
 * - `"#RRGGBB"`, `"RRGGBB"`, `"#RGB"` or `"RGB"`
 * - `[r, g, b]` (0-255 each)
 * - `["HSV", h, s, v]` (h 0-360, s/v 0-100)
 * - a packed `0xRRGGBB` integer (`16711680` is red)
 *
 * The device always answers with `"#RRGGBB"` ({@link HexColor}).
 */
export type ColorInput = string | number | RgbColor | HsvColor;

/** Body of every write route that has nothing more to say than "done". */
export interface OkResponse {
  ok: true;
}

/** Makes at least one of the keys of `T` required. */
export type RequireAtLeastOne<T, Keys extends keyof T = keyof T> = Pick<T, Exclude<keyof T, Keys>> &
  {
    [K in Keys]-?: Required<Pick<T, K>> & Partial<Pick<T, Exclude<Keys, K>>>;
  }[Keys];

/** Exactly one of the keys of `T` may be present; every other key is forbidden. */
export type ExactlyOne<T> = {
  [K in keyof T]: { [P in K]-?: T[P] } & { [P in Exclude<keyof T, K>]?: never };
}[keyof T];

/**
 * An app name: 1-32 characters of `[A-Za-z0-9_-]`. Checked client side before any request
 * is sent. `active`, `next`, `previous` and `order` are reserved by the device.
 */
export type AppName = string;

/** Directories of the AWTRIX file system that the file routes know about. */
export type AssetDirectory = '/ICONS' | '/MELODIES' | '/PALETTES' | '/MP3' | '/SCRIPTS';

/** An inclusive GPIO range as the device reports it: `[lo, hi]`. */
export type PinRange = readonly [lo: number, hi: number];
