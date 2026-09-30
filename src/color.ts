import { AwtrixValidationError } from './errors.js';
import type { HexColor, HsvColor, RgbColor } from './types/common.js';

function channel(value: number, name: string, max = 255): number {
  if (!Number.isFinite(value) || value < 0 || value > max) {
    throw new AwtrixValidationError(name, `must be a number between 0 and ${max}`);
  }
  return Math.round(value);
}

/** `[r, g, b]` for payload color fields. */
export function rgb(r: number, g: number, b: number): RgbColor {
  return [channel(r, 'r'), channel(g, 'g'), channel(b, 'b')];
}

/** `["HSV", h, s, v]` with `h` in `0..360` and `s`/`v` in `0..100`. */
export function hsv(h: number, s: number, v: number): HsvColor {
  return ['HSV', channel(h, 'h', 360), channel(s, 's', 100), channel(v, 'v', 100)];
}

/** Packs `r, g, b` into the `0xRRGGBB` integer the device uses for pixels and script colors. */
export function packColor(r: number, g: number, b: number): number {
  return (channel(r, 'r') << 16) | (channel(g, 'g') << 8) | channel(b, 'b');
}

/** Splits a packed `0xRRGGBB` integer (e.g. a framebuffer pixel) into `[r, g, b]`. */
export function unpackColor(packed: number): RgbColor {
  if (!Number.isInteger(packed) || packed < 0 || packed > 0xffffff) {
    throw new AwtrixValidationError('color', 'must be an integer between 0 and 16777215');
  }
  return [(packed >> 16) & 0xff, (packed >> 8) & 0xff, packed & 0xff];
}

/** Formats a packed integer or `[r, g, b]` as uppercase `"#RRGGBB"`. */
export function toHexColor(color: number | RgbColor): HexColor {
  const packed = typeof color === 'number' ? color : packColor(color[0], color[1], color[2]);
  unpackColor(packed);
  return `#${packed.toString(16).toUpperCase().padStart(6, '0')}`;
}

/** Parses `"#RGB"`, `"RGB"`, `"#RRGGBB"` or `"RRGGBB"` into a packed integer. */
export function parseHexColor(hex: string): number {
  const match = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex?.trim() ?? '');
  if (!match) throw new AwtrixValidationError('color', `"${hex}" is not a hex color`);
  let digits = match[1]!;
  if (digits.length === 3) digits = [...digits].map((d) => d + d).join('');
  return parseInt(digits, 16);
}
