import type { LooseString, PinRange } from './common.js';
import type { Soc } from './device.js';

export type PanelStart = 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight';
export type PanelWiring = 'rows' | 'columns';
export type PanelColorOrder = 'rgb' | 'rbg' | 'grb' | 'gbr' | 'brg' | 'bgr';

/** The three secrets. Omitted on read unless explicitly requested; `""` on write keeps them. */
export interface SystemSecrets {
  wifiPass: string;
  mqttPass: string;
  authPass: string;
}

/**
 * Device configuration as returned by `GET`/`PUT /api/v1/system` (secrets omitted).
 * Most changes, and all pin changes, apply after a reboot.
 */
export interface SystemConfig {
  /* --- Wi-Fi / network --- */
  /** Cannot be blanked; use a factory reset instead. */
  wifiSsid: string;
  netStatic: boolean;
  /** Dotted quad, optionally with a CIDR suffix on write (`192.168.1.50/24`). */
  ip: string;
  gateway: string;
  subnet: string;
  dns1: string;
  dns2: string;
  /** Boot join timeout in ms, `5000..120000`. */
  wifiConnectTimeout: number;
  /** Roam below this RSSI in dBm, `-90..0`; `0` = off. */
  wifiRoamRssi: number;

  /* --- MQTT --- */
  /** Requires a non-empty `mqttHost`. */
  mqttEnabled: boolean;
  mqttHost: string;
  /** `1..65535`. */
  mqttPort: number;
  mqttUser: string;
  /** Empty falls back to the device uid. */
  mqttPrefix: string;
  haDiscovery: boolean;
  haPrefix: string;

  /* --- Time --- */
  ntpServer: string;
  /** POSIX TZ string. */
  tz: string;
  /** IANA zone name, display only. */
  tzName: string;

  /* --- Identity / web / auth --- */
  /** Empty becomes `awtrixng-<uid>`. */
  hostname: string;
  /** `0..65535`; `0` falls back to 80. */
  webPort: number;
  /** Requires non-empty `authUser` and `authPass`. */
  authEnabled: boolean;
  authUser: string;

  /* --- Sensors / brightness / battery --- */
  /** °C, `-20..20`. */
  tempOffset: number;
  /** %, `-50..50`. */
  humOffset: number;
  /** V_cell / V_pin, `0.1..10`. */
  batteryDividerRatio: number;
  /** `0..255`. */
  minBrightness: number;
  /** `0..255`. */
  maxBrightness: number;
  /** `0..10`. */
  ldrFactor: number;
  /** `0.1..10`, `1` = neutral. */
  ldrGamma: number;
  ldrOnGround: boolean;
  /** ms, `0..60000`. */
  brightnessSmoothing: number;
  /** %, `0..100`; `0` = off. */
  lowBatteryThreshold: number;

  /* --- Panel --- */
  /** `1..128`; `panelWidth * panels` must be `32..128`. */
  panelWidth: number;
  /** Since 1.1.4. `8..32`, default `8`; total pixels at most 1024 (4096 with PSRAM). TC002: fixed at 16. */
  panelHeight?: number;
  /** `1..128`. */
  panels: number;
  panelStart: PanelStart;
  panelWiring: PanelWiring;
  panelColorOrder: PanelColorOrder;
  panelSerpentine: boolean;
  panelChainReverse?: boolean;
  panelChainSerpentine?: boolean;
  mirror: boolean;
  /** 180° rotation, also swaps the left/right buttons. */
  rotate: boolean;
  swapButtons: boolean;

  /* --- Peripherals / misc --- */
  dfplayer: boolean;
  /** HTTP webhook URL fired on a button press. */
  buttonCallback: string;
  artnet: boolean;

  /* --- Display mirroring (1.1.4+) --- */
  /** Let other clocks with the same panel size show this display (UDP 4212). */
  mirrorShare?: boolean;
  /** Apps to share, comma separated, case-insensitive. `"*"` = all, `""` = none. */
  mirrorShareApps?: string;
  /** Share notifications too. Default `true`. */
  mirrorShareNotifications?: boolean;
  /** IP or host name of the clock to mirror; `""` mirrors nothing. */
  mirrorFrom?: string;
  /** Apps of that clock to show, comma separated, case-insensitive. `"*"` = all. */
  mirrorFromApps?: string;
  /** Show that clock's notifications too. Default `true`. */
  mirrorFromNotifications?: boolean;

  /** ms, `1000..600000`. */
  statsInterval: number;
  /** `0..2`. */
  tempDecimals: number;
  debugMode: boolean;
  /** Applies after a reboot. */
  scriptingEnabled: boolean;

  /* --- GPIO map (-1 = disabled) --- */
  pinMatrix: number;
  pinBtnLeft: number;
  pinBtnSelect: number;
  pinBtnRight: number;
  pinBattery: number;
  pinLdr: number;
  pinBuzzer: number;
  pinI2cSda: number;
  pinI2cScl: number;
  pinDfRx: number;
  pinDfTx: number;
  /** ESP32-S3 only. Set all three I²S bus pins together or none. */
  pinI2sBclk: number;
  pinI2sLrclk: number;
  pinI2sDout: number;
  pinI2sMclk: number;
  pinAmpEnable: number;
}

/** `GET /api/v1/system?secrets=1`. */
export type SystemConfigWithSecrets = SystemConfig & SystemSecrets;

/** `PUT /api/v1/system` body: a partial merge. Secrets may be set, `""` leaves them alone. */
export type SystemConfigUpdate = Partial<SystemConfig & SystemSecrets>;

/** One network of a finished Wi-Fi scan. */
export interface WifiNetwork {
  ssid: string;
  rssi: number;
  /** `false` for an open network. */
  enc: boolean;
}

/** Outcome of one `GET /api/v1/system/wifi-scan` poll. */
export type WifiScanResult = { scanning: true } | { scanning: false; networks: WifiNetwork[] };

/** `GET /api/v1/logs`. */
export interface LogChunk {
  /** Sequence of the newest buffered line; pass it as `after` on the next poll. */
  next: number;
  lines: string[];
}

/* ------------------------------------------------------------------------------------------ */
/* Capabilities                                                                               */
/* ------------------------------------------------------------------------------------------ */

export interface AudioCapabilities {
  /** Melodies and inline RTTTL can be played. */
  buzzer: boolean;
  /** DFPlayer tracks can be played. */
  track: boolean;
  /** Stored MP3s can be played. */
  mp3: boolean;
  /** Internet radio can be streamed. */
  radio: boolean;
  /** Since 1.1.4: `sfx` and `loop` layer sounds (TC002). */
  mixer?: boolean;
  /** Since 1.1.4: a synthesizer plays song text via `song` and `fx` (TC002). */
  synth?: boolean;
  /** Since 1.1.4: scripts can hear the pitch of a note at the microphone (TC002). */
  pitch?: boolean;
  /** Since 1.1.4: scripts keep their own MP3s in `/SCRIPTS/<name>/`. */
  scriptSounds?: boolean;
}

export interface SensorCapabilities {
  /** A light sensor is configured; without one `autoBrightness` has no effect. */
  light: boolean;
  [sensor: string]: boolean;
}

/** Active dimensions and accepted geometry of the display. */
export interface DisplayCapabilities {
  width: number;
  height: number;
  requestedWidth?: number;
  requestedHeight?: number;
  minWidth?: number;
  maxWidth?: number;
  minHeight?: number;
  maxHeight?: number;
  maxPixels?: number;
  /** Serial LED chains only. */
  estimatedWireTimeUs?: number;
  configurable?: boolean;
  restartRequired?: boolean;
  ready?: boolean;
  wireTimeIsEstimate?: boolean;
}

export interface FontInfo {
  name: string;
  ascent: number;
  descent: number;
  lineHeight: number;
}

export interface LayoutCapabilities {
  version: number;
  limits: {
    regions: number;
    scrollers: number;
    assets: number;
    chartPoints: number;
    textBytes: number;
    preparedBytes: number;
    scriptHandles: number;
    scriptHandlesPerScript: number;
  };
}

export interface ReservedPinRange {
  lo: number;
  hi: number;
  why: string;
}

/** The pin rules of the chip the firmware was built for. */
export interface GpioCapabilities {
  soc: Soc;
  label: string;
  max: number;
  missing: PinRange[];
  inputOnly: PinRange[];
  reserved: ReservedPinRange[];
  adc1: PinRange[];
  strapping: PinRange[];
  rtc: PinRange[];
  /** The only values `pinMatrix` accepts. */
  matrix: number[];
  /** Factory pin map of this chip. */
  defaults: Record<string, number>;
}

/** `GET /api/v1/capabilities`. Keys marked "since 1.1.4" are absent on older firmware. */
export interface Capabilities {
  effects: string[];
  /** The subset of `effects` that honours a palette. */
  paletteEffects?: string[];
  transitions: string[];
  overlays: string[];
  /** Built-in palettes only. */
  palettes: string[];
  audio: AudioCapabilities;
  /** Whether `PUT /api/v1/apps/script-update/{name}` is available. */
  scriptUpdates?: boolean;
  /** Pin rules on configurable ESP32 boards; `null` on fixed hardware such as the TC002 (1.1.4+). */
  gpio: GpioCapabilities | null;
  /** Since 1.1.4. */
  sensors?: SensorCapabilities;
  /** Since 1.1.4, TC002 only: the values `settings.clockFace` accepts. */
  clockFaces?: string[];
  /** Since 1.1.4, e.g. `{ id: 'tc002' }`. */
  platform?: { id: LooseString<'esp32' | 'tc002' | 'linux'> };
  /** Present (and `true`) only where scripts can import `ble` (TC002). */
  ble?: true;
  /** Present (and `true`) only where a Bluetooth gamepad can be paired (TC002). */
  gamepad?: true;
  /** Present (and `true`) only where Home Assistant Voice can be set up (TC002). */
  voice?: true;
  /** Since 1.1.4. */
  display?: DisplayCapabilities;
  /** Since 1.1.4: fonts usable in payloads and layouts. */
  fonts?: FontInfo[];
  /** Since 1.1.4: limits of region layouts. */
  layouts?: LayoutCapabilities;
}

/* ------------------------------------------------------------------------------------------ */
/* Gamepad and voice (TC002)                                                                  */
/* ------------------------------------------------------------------------------------------ */

export type GamepadConnectionState = 'unpaired' | 'pairing' | 'waiting' | 'connecting' | 'ready';

/** `GET /api/v1/gamepad`. */
export interface GamepadState {
  state: LooseString<GamepadConnectionState>;
  /** Bluetooth name; `""` when none is paired. */
  name: string;
  /** Bluetooth address; `""` when none is paired. */
  address: string;
}

export type VoiceConnectionState = 'offline' | 'connecting' | 'ready' | 'starting' | 'listening' | 'processing' | 'speaking' | 'error';

/** `GET /api/v1/voice` - Home Assistant Voice settings and connection. */
export interface VoiceState {
  config: {
    enabled: boolean;
    /** Home Assistant address; `""` when none is set. */
    url: string;
    /** Assist pipeline ID; `""` for the default. */
    pipeline: string;
    /** Whether a token is stored. The token itself is never returned. */
    tokenSet: boolean;
  };
  state: LooseString<VoiceConnectionState>;
  /** Why the last attempt failed; `""` when all is well. */
  error: string;
  /** Home Assistant's Assist pipelines once connected. */
  pipelines: Record<string, unknown>[];
}
