import type { ColorInput } from './types/common.js';
import type {
  DrawBitmap,
  DrawCircle,
  DrawCircleFill,
  DrawLine,
  DrawPixel,
  DrawPixels,
  DrawRect,
  DrawRectFill,
  DrawText,
} from './types/payload.js';

function withColor<T extends readonly unknown[]>(command: T, color: ColorInput | undefined): T {
  return (color === undefined ? command : [...command, color]) as unknown as T;
}

/**
 * Builders for the `draw` array of a payload. A command without color uses the app's text
 * color.
 *
 * ```ts
 * { draw: [Draw.rect(0, 0, 32, 8, '#202020'), Draw.circleFill(4, 4, 2, '#F00'), Draw.text(9, 1, 'HI')] }
 * ```
 */
export const Draw = {
  pixel: (x: number, y: number, color?: ColorInput): DrawPixel => withColor(['pixel', x, y] as const, color),
  /** Many pixels in one color; `points` are `[x, y]` pairs. */
  pixels: (color: ColorInput | null, points: readonly (readonly [number, number])[]): DrawPixels => [
    'pixels',
    color,
    ...points.flat(),
  ],
  line: (x1: number, y1: number, x2: number, y2: number, color?: ColorInput): DrawLine =>
    withColor(['line', x1, y1, x2, y2] as const, color),
  rect: (x: number, y: number, w: number, h: number, color?: ColorInput): DrawRect =>
    withColor(['rect', x, y, w, h] as const, color),
  rectFill: (x: number, y: number, w: number, h: number, color?: ColorInput): DrawRectFill =>
    withColor(['rectFill', x, y, w, h] as const, color),
  circle: (cx: number, cy: number, r: number, color?: ColorInput): DrawCircle =>
    withColor(['circle', cx, cy, r] as const, color),
  circleFill: (cx: number, cy: number, r: number, color?: ColorInput): DrawCircleFill =>
    withColor(['circleFill', cx, cy, r] as const, color),
  /** Text whose baseline sits at `y + 5`. */
  text: (x: number, y: number, text: string, color?: ColorInput): DrawText => withColor(['text', x, y, text] as const, color),
  /** `data`: base64 RGB888 bytes or a row-major array of `w * h` colors. */
  bitmap: (x: number, y: number, w: number, h: number, data: string | readonly ColorInput[]): DrawBitmap => [
    'bitmap',
    x,
    y,
    w,
    h,
    data,
  ],
} as const;
