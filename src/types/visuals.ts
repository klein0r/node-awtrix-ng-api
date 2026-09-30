import type { ColorInput, HexColor, LooseString } from './common.js';

/** The 19 background effects of the current firmware. Matched case-insensitively. */
export const EFFECTS = [
  'BrickBreaker',
  'Checkerboard',
  'ColorWaves',
  'Fade',
  'Fireworks',
  'LookingEyes',
  'Matrix',
  'MovingLine',
  'Pacifica',
  'PingPong',
  'Plasma',
  'PlasmaCloud',
  'Radar',
  'Ripple',
  'Snake',
  'SwirlIn',
  'SwirlOut',
  'TheaterChase',
  'TwinklingStars',
] as const;
export type KnownEffect = (typeof EFFECTS)[number];
/** Background effect name. `GET /api/v1/capabilities` lists what the device really supports. */
export type EffectName = LooseString<KnownEffect>;

/** The 22 app transitions of the current firmware. Matched case-insensitively. */
export const TRANSITIONS = [
  'Random',
  'Slide',
  'Dim',
  'Zoom',
  'Rotate',
  'Pixelate',
  'Curtain',
  'Ripple',
  'Blink',
  'Reload',
  'Fade',
  'Cover',
  'Uncover',
  'Split',
  'Blinds',
  'Blocks',
  'Flash',
  'Diamond',
  'Wave',
  'Rain',
  'Melt',
  'Interlace',
] as const;
export type KnownTransition = (typeof TRANSITIONS)[number];
export type TransitionName = LooseString<KnownTransition>;

/** The 6 weather overlays. Matched case-insensitively. */
export const OVERLAYS = ['drizzle', 'frost', 'rain', 'snow', 'storm', 'thunder'] as const;
export type KnownOverlay = (typeof OVERLAYS)[number];
export type OverlayName = LooseString<KnownOverlay>;

/** The 8 built-in palettes. A `/PALETTES/<name>.txt` file may add more or replace one. */
export const PALETTES = ['Cloud', 'Lava', 'Ocean', 'Forest', 'Stripe', 'Party', 'Heat', 'Rainbow'] as const;
export type KnownPalette = (typeof PALETTES)[number];
export type PaletteName = LooseString<KnownPalette>;

/** A palette stop placed at a percentage of the ramp. */
export interface PalettePositionedStop {
  color: ColorInput;
  /** Position on the ramp, `0..100`. */
  pos: number;
}

/**
 * A palette: a name (file first, then built-in), 1-16 evenly spread colors, or 1-16
 * positioned stops. The two array forms cannot be mixed. `null` or `""` clears it.
 */
export type Palette = PaletteName | readonly ColorInput[] | readonly PalettePositionedStop[] | null;

/** Tuning shared by background effects and weather overlays. */
export interface EffectSettings {
  /** Pace multiplier, clamped to `0.1..10`. */
  speed?: number;
  palette?: Palette;
  /** Interpolate between palette entries instead of hard bands. Inert without a `palette`. */
  blend?: boolean;
}

/** Effect settings as the device reports them for the global overlay. */
export interface EffectSettingsState {
  /** `1` when never set. */
  speed: number;
  /** The resolved 16-entry palette, or `null` when none is set. */
  palette: HexColor[] | null;
  blend: boolean;
}

export type ScrollMode = 'static' | 'wrap' | 'loop' | 'bounce';
export type ScrollDirection = 'left' | 'right';
export type ScrollEntry = 'inline' | 'offscreen';
export type ScrollWhenFits = 'static' | 'scroll';

/** Text motion. In the settings every field is concrete. */
export interface ScrollConfig {
  /** `static` never moves, `wrap` restarts after the exit, `loop` is a seamless marquee, `bounce` sweeps back and forth. */
  mode: ScrollMode;
  direction: ScrollDirection;
  /** `offscreen` scrolls in from outside the panel and skips the initial hold. */
  entry: ScrollEntry;
  /** Whether text that already fits still animates. */
  whenFits: ScrollWhenFits;
  /** Percent of the 21 px/s base rate, `>= 0`. */
  speed: number;
  /** `loop` only: pixels between repetitions, `>= 0`. */
  gap: number;
  /** Pause before moving and at each `bounce` turn, `>= 0`. */
  holdMs: number;
}

/**
 * Text motion on input: any subset of {@link ScrollConfig} (every omitted field is inherited
 * on its own), or a bare mode string as shorthand for `{ mode }`.
 */
export type ScrollInput = ScrollMode | Partial<ScrollConfig>;
