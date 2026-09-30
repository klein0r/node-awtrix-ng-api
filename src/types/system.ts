import type { PinRange } from './common.js';
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

/** `GET /api/v1/capabilities`. */
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
  gpio: GpioCapabilities;
}
