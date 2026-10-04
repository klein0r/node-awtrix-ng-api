import type { ColorInput, HexColor } from './common.js';
import type { ScrollConfig, ScrollInput, TransitionName } from './visuals.js';

export type Weekday = 'sunday' | 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday';

/** Clock layout: 0 plain, 1-4 calendar box variants, 5 big clock, 6 binary clock. */
export type TimeMode = 0 | 1 | 2 | 3 | 4 | 5 | 6;
export type TimeSeparatorMode = 'steady' | 'blink' | 'pulse';
export type DateOrder = 'dayMonthYear' | 'monthDayYear' | 'yearMonthDay';
export type DateSeparator = 'dot' | 'slash' | 'dash';
export type DateYearMode = 'none' | 'twoDigit' | 'fourDigit';
export type TransitionDirection = 'normal' | 'reverse';
/** Ulanzi TC002 clock faces. */
export type ClockFace = 'sheet' | 'ring' | 'flap' | 'month' | 'big';
/** TC002 only: what music visualizers and `music.pitch()` react to. */
export type MusicSource = 'auto' | 'playback' | 'microphone';

/** The seven-segment weekday bar of the Time and Date apps. */
export interface WeekdayBar {
  show: boolean;
  /** Only rotates the display order; weekend membership follows the calendar day. */
  startOnMonday: boolean;
  /** Read back in calendar order, Sunday first. `[]` = no weekend. */
  weekendDays: Weekday[];
  /** Today, when today is a workday. */
  activeColor: HexColor;
  /** Any other workday. */
  inactiveColor: HexColor;
  /** Today, when today is a weekend day. */
  weekendActiveColor: HexColor;
  /** Any other weekend day. */
  weekendInactiveColor: HexColor;
}

/** Weekday bar on input: any subset, merged field by field. */
export interface WeekdayBarUpdate {
  show?: boolean;
  startOnMonday?: boolean;
  weekendDays?: readonly Weekday[];
  activeColor?: ColorInput;
  inactiveColor?: ColorInput;
  weekendActiveColor?: ColorInput;
  weekendInactiveColor?: ColorInput;
}

/** The full settings resource as returned by `GET`/`PATCH /api/v1/settings`. */
export interface Settings {
  /* --- Brightness --- */
  autoBrightness: boolean;
  /** Raw level `0..255`, not a percentage. Ignored while `autoBrightness` is on. */
  brightness: number;

  /* --- Panel --- */
  /** `0..100` %, `100` leaves colors untouched. */
  saturation: number;
  /** Strictly positive. */
  gamma: number;
  /** Per-channel multiplier, `null` = off. */
  colorCorrection: HexColor | null;
  /** Second per-channel multiplier (an RGB tint, not Kelvin), `null` = off. */
  colorTint: HexColor | null;

  /* --- Global text --- */
  textColor: HexColor;
  uppercase: boolean;
  scroll: ScrollConfig;

  /* --- App rotation --- */
  autoTransition: boolean;
  appDurationMs: number;
  transitionEffect: TransitionName;
  transitionDirection: TransitionDirection;
  transitionDurationMs: number;

  /* --- Clock app --- */
  /** Ignored on the TC002, which uses {@link clockFace}. */
  timeMode: TimeMode;
  /** Ulanzi TC002 only; other devices store it and ignore it. Default `sheet`. */
  clockFace: ClockFace;
  /** `null` = inherit `textColor`. */
  timeColor: HexColor | null;
  calendarHeaderColor: HexColor;
  calendarTextColor: HexColor;
  calendarBodyColor: HexColor;
  /** TC002 only: the sheet tears off when the clock appears and at midnight. Other devices store it. */
  calendarAnimation: boolean;

  /* --- Clock text --- */
  time24h: boolean;
  timeLeadingZero: boolean;
  timeShowSeconds: boolean;
  timeShowAmPm: boolean;
  timeSeparatorMode: TimeSeparatorMode;

  /* --- Date text --- */
  dateOrder: DateOrder;
  dateSeparator: DateSeparator;
  dateYearMode: DateYearMode;
  dateShowWeekday: boolean;
  dateMonthNames: boolean;
  /** `null` = inherit `textColor`. */
  dateColor: HexColor | null;

  /* --- Weekday bar --- */
  /**
   * The clock's weekday bar. In a `PATCH /api/v1/settings` it sets **both** bars (clock and Date
   * app); use `dateWeekdayBar`, or `apps.updateBuiltinConfig('Time', ...)`, to set one.
   */
  weekdayBar: WeekdayBar;
  /** The Date app's own weekday bar. A `PATCH` with it sets only this bar. */
  dateWeekdayBar: WeekdayBar;

  /* --- Sensor apps --- */
  useCelsius: boolean;
  temperatureColor: HexColor | null;
  humidityColor: HexColor | null;
  batteryColor: HexColor | null;

  /* --- Sound: every group plays at volume × group volume / 100 --- */
  /** Master volume `0..100`, default 60 (TC002: 90). `0` silences every sound. The TC002 knob sets it. */
  volume: number;
  /** Alert group share `0..100` (notification sounds, `audio.play()`, clips, boot sound, voice answer). Default 100. */
  alertVolume: number;
  /** App group share `0..100` (everything a script plays). Default 100. */
  appVolume: number;
  /** Radio group share `0..100`. Default 80. */
  radioVolume: number;
  /** TC002 only: play a sound at power-on (at the alert volume). Other devices store it. */
  bootSound: boolean;
  /** TC002 only. Default `auto`. */
  musicSource: MusicSource;

  /* --- Buttons --- */
  blockNavigation: boolean;
}

/** Keys of {@link Settings} whose value is a nullable color. */
type NullableColorKeys =
  | 'colorCorrection'
  | 'colorTint'
  | 'timeColor'
  | 'dateColor'
  | 'temperatureColor'
  | 'humidityColor'
  | 'batteryColor';

/** Keys of {@link Settings} whose value is a required color. */
type ColorKeys = 'textColor' | 'calendarHeaderColor' | 'calendarTextColor' | 'calendarBodyColor';

/**
 * A `PATCH /api/v1/settings` body: any subset of the keys, colors in any input form.
 * Applied completely or not at all.
 */
export type SettingsUpdate = Partial<
  Omit<Settings, NullableColorKeys | ColorKeys | 'scroll' | 'weekdayBar' | 'dateWeekdayBar'> & {
    [K in NullableColorKeys]: ColorInput | null;
  } & {
    [K in ColorKeys]: ColorInput;
  } & {
    scroll: ScrollInput;
    weekdayBar: WeekdayBarUpdate;
    dateWeekdayBar: WeekdayBarUpdate;
  }
>;
