import type { ColorInput, HexColor, LooseString } from './common.js';
import type { EffectSettings, EffectSettingsState, OverlayName } from './visuals.js';

export type Soc = 'esp32' | 'esp32s3';

/** `awtrixng` on every ESP32 board, `tc002` on the Ulanzi TC002, `linux` for headless Linux. */
export type BoardType = LooseString<'awtrixng' | 'tc002' | 'linux'>;

export type ResetReason =
  | 'poweron'
  | 'external'
  | 'software'
  | 'panic'
  | 'interruptWatchdog'
  | 'taskWatchdog'
  | 'watchdog'
  | 'deepSleep'
  | 'brownout'
  | 'sdio'
  | 'unknown';

/** State of display mirroring from another clock. */
export type MirrorSourceState =
  | 'off'
  | 'offline'
  | 'resolving'
  | 'notFound'
  | 'waiting'
  | 'idle'
  | 'filtered'
  | 'sizeMismatch'
  | 'noMemory'
  | 'showing';

/** What display mirroring is doing. */
export interface MirrorState {
  /** This clock shares its display and is on the network. */
  sharing: boolean;
  /** Clocks watching this display right now. */
  viewers: number;
  /** The clock this clock mirrors, as entered in `mirrorFrom`; `""` for none. */
  source: string;
  state: LooseString<MirrorSourceState>;
  /** Absent until the source clock answered. */
  sourceWidth?: number;
  sourceHeight?: number;
}

/** TC002 web update progress. */
export interface UpdateState {
  /** e.g. `idle`. */
  state: string;
  release: string;
  error: string;
}

export type ConnectionState = 'disabled' | 'offline' | 'connecting' | 'connected';

export type WifiConnectionError = 'hostNotFound' | 'badCredentials' | 'timeout' | 'lost';

export type MqttConnectionError =
  | 'noWifi'
  | 'hostNotFound'
  | 'refused'
  | 'badCredentials'
  | 'rejected'
  | 'timeout'
  | 'lost';

/** Connection state of a network link (Wi-Fi station or MQTT broker). */
export interface LinkState<ErrorReason extends string> {
  /** For Wi-Fi: a network is stored. For MQTT: mirrors `mqttEnabled`. */
  enabled: boolean;
  state: ConnectionState;
  /** Wi-Fi: the SSID. MQTT: the configured broker host. */
  host: string;
  /** The address in use; `""` while not connected / resolved. */
  endpoint: string;
  /** Consecutive failed attempts, `0` while connected. */
  attempts: number;
  /** Milliseconds until the next attempt, `0` while connected. */
  retryInMs: number;
  /** Successful connections since boot. */
  connects: number;
  /** Why the link is not up right now; `null` when it is. */
  error: ErrorReason | null;
  /** The last reason the link went down, kept after it recovers. */
  lastError: ErrorReason | null;
}

/** An indicator as reported by `GET /api/v1/device`. */
export interface IndicatorState {
  on: boolean;
  color: HexColor;
  blinkMs: number;
  fadeMs: number;
}

/** `GET /api/v1/device` - device state and statistics. */
export interface DeviceState {
  version: string;
  uid: string;
  boardType: BoardType;
  /** `esp32`/`esp32s3` on ESP32 boards; the system architecture (e.g. `armv7l`) on a TC002. */
  soc: LooseString<Soc>;
  /** The update file `POST /update` accepts, e.g. `firmware-awtrix-ng.bin` or `awtrix-ng-tc002.awup`; `""` where there is none. */
  updateImage?: string;
  ipAddress: string;
  hostname: string;
  wifiRssi: number;
  uptimeSeconds: number;
  resetReason: LooseString<ResetReason>;
  freeHeapBytes: number;
  minFreeHeapBytes: number;
  /** ESP32 only; omitted on a TC002. */
  largestFreeBlockBytes?: number;
  /** Absent on boards without PSRAM. */
  psramTotalBytes?: number;
  /** Absent on boards without PSRAM. */
  psramFreeBytes?: number;
  scriptingRunning: boolean;
  /** `system` on a TC002. */
  scriptHeapPool: 'internal' | 'psram' | 'system';
  scriptHeapBudgetBytes: number;
  fps: number;
  /** Effective brightness after auto-brightness, `0..255`. */
  brightness: number;
  matrixPower: boolean;
  currentApp: string;
  /** Always three entries: top, middle, bottom. */
  indicators: IndicatorState[];
  /** MQTT commands received since boot. */
  messageCount: number;
  wifi?: LinkState<WifiConnectionError>;
  mqtt: LinkState<MqttConnectionError>;
  mirror?: MirrorState;
  /** TC002 only: progress of a web update. */
  update?: UpdateState;

  /* --- Present only when the hardware provides them --- */
  /** Relative ambient light `0..100` % (not lux). Requires `pinLdr >= 0`. */
  lightLevel?: number;
  /** Raw light sensor reading `0..4095`. Requires `pinLdr >= 0`. */
  ldrRaw?: number;
  /** Requires `pinBattery >= 0`. */
  batteryPercent?: number;
  /** Cell voltage in V. Requires `pinBattery >= 0`. */
  batteryVoltage?: number;
  /** Millivolts at the pin before the divider. Requires `pinBattery >= 0`. */
  batteryPinMillivolts?: number;
  /** Requires `pinBattery >= 0`. */
  lowBattery?: boolean;
  /** °C, requires a detected I²C sensor. */
  temperature?: number;
  /** %, requires a humidity-capable sensor. */
  humidity?: number;
  /** hPa, requires a pressure-capable sensor. */
  pressureHpa?: number;
  /** TC002: `true` while on USB power and charging; present once the power supply was reported. */
  usbPower?: boolean;
}

/* ------------------------------------------------------------------------------------------ */
/* Display                                                                                    */
/* ------------------------------------------------------------------------------------------ */

export interface MoodlightState {
  color: HexColor;
  brightness: number;
}

/** `GET /api/v1/display`. */
export interface DisplayState {
  power: boolean;
  /** Effective brightness after auto-brightness. */
  brightness: number;
  /** Active global overlay, `null` when none. */
  overlay: string | null;
  overlaySettings: EffectSettingsState;
  /** `null` while the mood light is off. */
  moodlight: MoodlightState | null;
}

/** `PATCH /api/v1/display` body. */
export interface DisplayUpdate {
  /** `false` blanks the panel. */
  power?: boolean;
  /** Global weather overlay over all apps; `null` or `""` clears it. */
  overlay?: OverlayName | '' | null;
  overlaySettings?: EffectSettings;
}

interface MoodlightFields {
  /** Color temperature, `1000..40000` K. Wins over `color`. */
  kelvin: number;
  /** Ignored when `kelvin` is present. */
  color: ColorInput;
  /** `0..255`. Not range-checked by the firmware (wraps), so the client checks it. */
  brightness: number;
}

/** `PUT /api/v1/display/moodlight` body: at least one field. Omitted fields are sticky. */
export type MoodlightOptions = Partial<MoodlightFields> &
  ({ kelvin: number } | { color: ColorInput } | { brightness: number });

/** `GET /api/v1/display/screen` - the framebuffer, row-major, packed `0xRRGGBB` integers. */
export interface ScreenBuffer {
  width: number;
  height: number;
  pixels: number[];
}

/* ------------------------------------------------------------------------------------------ */
/* Indicators                                                                                 */
/* ------------------------------------------------------------------------------------------ */

/** 1 top, 2 middle, 3 bottom. */
export type IndicatorId = 1 | 2 | 3;

interface IndicatorFields {
  /** Any color turns the indicator on; `0` or `null` turns it off but keeps the stored color. */
  color: ColorInput | null;
  /** Blink period `0..65535` ms. Kept when omitted. */
  blinkMs: number;
  /** Fade period `0..65535` ms. Kept when omitted. */
  fadeMs: number;
}

/** `PUT /api/v1/indicators/{id}` body: at least one field. */
export type IndicatorUpdate = Partial<IndicatorFields> &
  ({ color: ColorInput | null } | { blinkMs: number } | { fadeMs: number });
