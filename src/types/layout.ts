/**
 * Native-pixel layouts (firmware 1.1.4+): a page split into regions, each with exactly one
 * kind of content. Boxes, fonts and images are checked against the active display; the
 * limits are in `capabilities.layouts`.
 */
import type { ColorInput } from './common.js';
import type { DrawCommand, FontName, TextCase, TextFragment } from './payload.js';
import type { EffectName, OverlayName, PaletteName, PalettePositionedStop, ScrollDirection, ScrollEntry, ScrollMode, ScrollWhenFits } from './visuals.js';

/** A palette name, up to 16 colors, or up to 16 positioned stops. */
export type NativePalette = PaletteName | readonly ColorInput[] | readonly PalettePositionedStop[];

/** Text motion of a region. Omitted fields and `null` inherit the device default. */
export type NativeScroll =
  | null
  | ScrollMode
  | {
      mode?: ScrollMode;
      direction?: ScrollDirection;
      entry?: ScrollEntry;
      whenFits?: ScrollWhenFits;
      /** `0..1000000`, percent of about 20.83 px/s. */
      speed?: number;
      /** `0..32767` px. */
      gap?: number;
      /** `0..1000000` ms. */
      holdMs?: number;
    };

/** `[x, y, width, height]` in native pixels; must fit entirely inside the active display. */
export type RegionBox = readonly [x: number, y: number, width: number, height: number];

export type RegionAlign = 'start' | 'center' | 'end';

interface PaletteFields {
  palette?: NativePalette;
  /** Needs `palette`. Default `true`. */
  paletteBlend?: boolean;
  /** Needs `palette`. `0..65535`, default `0`. */
  paletteSpan?: number;
  /** Needs `palette`. `0..10`, default `0`. */
  paletteSpeed?: number;
}

/** Either `color` or `textColor` (the same field under its pushed-app name) - not both. */
type RegionColor =
  | { color?: ColorInput | 'palette'; textColor?: never }
  | { textColor?: ColorInput | 'palette'; color?: never };

interface RegionBase extends PaletteFields {
  /** Unique ID, at most 64 UTF-8 bytes. */
  id: string;
  box: RegionBox;
  /** Default `center`. */
  align?: RegionAlign;
  /** Default `center`. */
  valign?: RegionAlign;
}

/** Keys that belong to a single content kind; forbidden on the others. */
interface ContentKeys {
  text: unknown;
  icon: unknown;
  chart: unknown;
  progress: unknown;
  draw: unknown;
  scroll: unknown;
  repeat: unknown;
  textCase: unknown;
  textBlinkMs: unknown;
  textFadeMs: unknown;
  font: unknown;
  trackColor: unknown;
}
type Without<K extends keyof ContentKeys> = { [P in Exclude<keyof ContentKeys, K>]?: never };

export type TextRegion = RegionBase &
  RegionColor & {
    /** Up to 8192 UTF-8 bytes summed across the layout. Fragments without color use the region color. */
    text: string | readonly TextFragment[];
    /** `inherit` follows the uppercase setting. */
    textCase?: TextCase;
    /** `0..1000000` ms. */
    textBlinkMs?: number;
    /** `0..1000000` ms; wins over `textBlinkMs`. */
    textFadeMs?: number;
    /** A name from `capabilities.fonts`. Default `small`. */
    font?: FontName;
    scroll?: NativeScroll;
    /** `0..1000000`. Omitted inherits the outer `repeat`; `0` does not hold the page for this region. */
    repeat?: number;
  } & Without<'text' | 'textCase' | 'textBlinkMs' | 'textFadeMs' | 'font' | 'scroll' | 'repeat'>;

/** `color` is accepted by the device but unused for images. */
export type IconRegion = RegionBase &
  RegionColor & {
  /** Icon ID (up to 64 chars) or a GIF/JPEG data URL, at most 8192 bytes. */
  icon: string;
} & Without<'icon'>;

export interface RegionChart {
  /** 1-128 integers in `-1e9..1e9`. */
  values: readonly number[];
  /** Default `line`. */
  type?: 'line' | 'bar';
}

/** Omit both bounds to autoscale including zero; otherwise both are needed and `min < max`. */
export type RegionChartSpec = RegionChart & ({ min?: never; max?: never } | { min: number; max: number });

export type ChartRegion = RegionBase &
  RegionColor & {
    chart: RegionChartSpec;
  } & Without<'chart'>;

export type ProgressRegion = RegionBase &
  RegionColor & {
    /** `0..100`. */
    progress: number;
    /** Default `#202020`. */
    trackColor?: ColorInput;
  } & Without<'progress' | 'trackColor'>;

export type DrawRegion = RegionBase &
  RegionColor & {
    /** Coordinates count from the top-left corner of the box; everything outside is cut off. */
    draw: readonly DrawCommand[];
    font?: FontName;
  } & Without<'draw' | 'font'>;

/** One region with exactly one kind of content. */
export type NativeRegion = TextRegion | IconRegion | ChartRegion | ProgressRegion | DrawRegion;

interface NativeLayoutBase extends PaletteFields {
  version: 1;
  /** Drawn on top of all regions instead of the global overlay. */
  overlay?: OverlayName;
  /** 1-16 regions. */
  regions: readonly NativeRegion[];
}

/** A region layout: a background color **or** a background effect. */
export type NativeLayout = NativeLayoutBase &
  (
    | { backgroundColor?: ColorInput; effect?: never; effectSpeed?: never }
    | {
        effect: EffectName;
        /** `0.1..10`, default `1`. */
        effectSpeed?: number;
        backgroundColor?: never;
      }
  );
