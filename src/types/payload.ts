import type { ColorInput, LooseString } from './common.js';
import type { NotificationSound } from './audio.js';
import type { NativeLayout } from './layout.js';
import type { EffectName, OverlayName, Palette, ScrollInput } from './visuals.js';

/** A color field that can also be painted from the app's palette. */
export type PaletteColorInput = ColorInput | 'palette';

/** A run of text in its own color. */
export interface TextFragment {
  text: string;
  /** White when omitted. */
  color?: ColorInput;
}

/** An additional, independently animated icon at an absolute position. */
export interface PlacedIcon {
  /** Icon ID (up to 64 chars) or a data URL (`data:image/gif;base64,...` / `data:image/jpeg;base64,...`). */
  icon: string;
  /** `-65535..65535`, default `0`. */
  x?: number;
  /** `-65535..65535`, default `0`. */
  y?: number;
}

export type TextCase = 'inherit' | 'upper' | 'asTyped';
/** `small`, `large` or (since 1.1.4) any name from `capabilities.fonts`. */
export type FontName = LooseString<'small' | 'large'>;
export type IconMode = 'fixed' | 'pushOnce' | 'push';
export type LifetimeExpiry = 'remove' | 'mark';

/* ------------------------------------------------------------------------------------------ */
/* Draw commands                                                                              */
/* ------------------------------------------------------------------------------------------ */

/** One pixel. */
export type DrawPixel = readonly ['pixel', x: number, y: number, color?: ColorInput];
/** Many pixels in one color: `['pixels', color, x1, y1, x2, y2, ...]`. `null` uses the text color. */
export type DrawPixels = readonly ['pixels', color: ColorInput | null, ...coordinates: number[]];
/** A line, both endpoints included. */
export type DrawLine = readonly ['line', x1: number, y1: number, x2: number, y2: number, color?: ColorInput];
/** A 1px outline spanning `x .. x+w-1`. */
export type DrawRect = readonly ['rect', x: number, y: number, w: number, h: number, color?: ColorInput];
/** A filled rectangle. */
export type DrawRectFill = readonly ['rectFill', x: number, y: number, w: number, h: number, color?: ColorInput];
/** A circle outline. */
export type DrawCircle = readonly ['circle', cx: number, cy: number, r: number, color?: ColorInput];
/** A filled circle. */
export type DrawCircleFill = readonly ['circleFill', cx: number, cy: number, r: number, color?: ColorInput];
/** Text whose baseline sits at `y + 5`. */
export type DrawText = readonly ['text', x: number, y: number, text: string, color?: ColorInput];
/** A `w x h` bitmap: base64 RGB888 bytes or a row-major array of colors. */
export type DrawBitmap = readonly [
  'bitmap',
  x: number,
  y: number,
  w: number,
  h: number,
  data: string | readonly ColorInput[],
];

export type DrawCommand =
  | DrawPixel
  | DrawPixels
  | DrawLine
  | DrawRect
  | DrawRectFill
  | DrawCircle
  | DrawCircleFill
  | DrawText
  | DrawBitmap;

/* ------------------------------------------------------------------------------------------ */
/* Payload                                                                                    */
/* ------------------------------------------------------------------------------------------ */

/** Keys that control how long a page lives; allowed with and without a `layout`. */
export interface PayloadTiming {
  /** How long to show the page in ms; `<= 0` uses the global `appDurationMs`. */
  durationMs?: number;
  /** Pushed apps only: auto-expire after this many ms, `0` = never. */
  lifetimeMs?: number;
  /** What happens when {@link lifetimeMs} runs out. Default `remove`. */
  lifetimeExpiry?: LifetimeExpiry;
  /** How many times scrolling text runs across the screen, `0` = off. */
  repeat?: number;
}

/**
 * The classic page description shared by pushed apps and notifications. Every key is
 * optional; unknown keys are rejected by the device with `422 validationFailed`.
 */
export interface ClassicAppPayload extends PayloadTiming {
  /* --- Text --- */
  /** The page text, or an array of individually colored fragments. */
  text?: string | readonly TextFragment[];
  /** `inherit` follows the global `uppercase` setting. Default `inherit`. */
  textCase?: TextCase;
  /** Default `small`. `large` is seven rows tall. */
  font?: FontName;
  /** Text color, or `"palette"` to paint it from {@link palette}. */
  textColor?: PaletteColorInput;
  /** Blink period in ms, `0` = off. */
  textBlinkMs?: number;
  /** Sinusoidal fade period in ms, `0` = off. */
  textFadeMs?: number;
  /** Center text that fits (default `true`); `false` left-aligns. */
  textCenter?: boolean;
  /** Text motion; every omitted field is inherited from the global setting. */
  scroll?: ScrollInput;
  /** X shift in px applied after positioning. */
  textOffsetX?: number;
  /** Paint the text above draw commands, progress bar and charts. Default `false`. */
  textInFront?: boolean;

  /* --- Icon --- */
  /**
   * Icon ID (resolved as `/ICONS/<id>.gif`, then `.jpg`) or the image as a data URL
   * (`data:image/gif;base64,...` / `data:image/jpeg;base64,...`). Firmware before 1.1.4 took
   * plain base64 longer than 64 characters instead.
   */
  icon?: string;
  /** Whether approaching text shoves the icon aside. Default `fixed`. */
  iconMode?: IconMode;
  /** X shift of the icon in px. */
  iconOffsetX?: number;
  /** Empty columns between icon and text, integer `0..128`. Default `1`. */
  iconGap?: number;
  /** Up to 4 additional icons at absolute positions. `[]` removes them. */
  icons?: readonly PlacedIcon[];

  /* --- Background --- */
  /** Solid canvas fill; ignored when an {@link effect} is set. */
  backgroundColor?: ColorInput;

  /* --- Charts --- */
  /** Bar chart values, max 16 entries. */
  barChart?: readonly number[];
  /** Line chart values, 2-16 entries. */
  lineChart?: readonly number[];
  /** Scale to the data (default `true`), else fix the range at `0..8`. */
  chartAutoscale?: boolean;
  /** Color of bars and line, or `"palette"`. */
  chartColor?: PaletteColorInput;

  /* --- Progress bar --- */
  /** Fill percentage `0..100`; below `0` hides the bar. Default `-1`. */
  progress?: number;
  /** Filled portion, or `"palette"`. Default `#00FF00`. */
  progressColor?: PaletteColorInput;
  /** Unfilled portion. Default `#FFFFFF`. */
  progressTrackColor?: ColorInput;

  /* --- Effect --- */
  /** Animated background effect; `""` = none. Unknown names are rejected. */
  effect?: EffectName | '';
  /** Pace multiplier for effect and overlay, clamped to `0.1..10`. Default `1`. */
  effectSpeed?: number;

  /* --- Palette --- */
  /** Palette used by text, charts, progress bar and effect. */
  palette?: Palette;
  /** Interpolate between entries (default `true`); `false` gives hard bands. */
  paletteBlend?: boolean;
  /** Pixels per palette pass when painting text, `0` = stretch across the text. */
  paletteSpan?: number;
  /** Palette passes per second when painting text, `0..10`. */
  paletteSpeed?: number;

  /* --- Overlay --- */
  /** Weather overlay on top of everything; `""` falls back to the global overlay. */
  overlay?: OverlayName | '';

  /* --- Drawing --- */
  /** Drawing commands, painted in array order. */
  draw?: readonly DrawCommand[];

  /** Not allowed together with the classic keys - see {@link LayoutAppPayload}. */
  layout?: never;
}

/** Keys of {@link ClassicAppPayload} that a `layout` replaces. */
export type ClassicVisualKey = Exclude<keyof ClassicAppPayload, keyof PayloadTiming | 'layout'>;

/**
 * A page made of regions (firmware 1.1.4+). The layout replaces every classic visual key;
 * only the timing keys stay in the outer object.
 */
export type LayoutAppPayload = PayloadTiming & {
  layout: NativeLayout;
} & { [K in ClassicVisualKey]?: never };

/** A pushed-app page: either the classic keys, or a `layout`. */
export type AppPayload = ClassicAppPayload | LayoutAppPayload;

/** The 5 keys only notifications accept. */
export interface NotificationOptions {
  /** Identifier for targeted dismissal. `active` cannot be addressed. */
  name?: string;
  /** Keep on screen until dismissed. Default `false`. */
  hold?: boolean;
  /** Queue behind other notifications (default `true`); `false` replaces the current one. */
  stack?: boolean;
  /** Render even while the matrix is switched off. Default `false`. */
  wakeup?: boolean;
  /**
   * A sound to play when the notification appears, as an alert: a stored name, a sound object
   * or a list of 1-4 alternatives (no `station`). `loop: true` repeats it while the notification
   * is shown. `""` or `null` plays nothing. A name that is not stored is not an error.
   */
  sound?: NotificationSound;
}

/** Everything `POST /api/v1/notifications` accepts. */
export type NotificationPayload = AppPayload & NotificationOptions;
