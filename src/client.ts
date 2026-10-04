import { AppsApi } from './api/apps.js';
import { AudioApi } from './api/audio.js';
import { DeviceApi } from './api/device.js';
import { DisplayApi } from './api/display.js';
import { FilesApi } from './api/files.js';
import { GamepadApi } from './api/gamepad.js';
import { IndicatorsApi } from './api/indicators.js';
import { NotificationsApi } from './api/notifications.js';
import { OAuthApi } from './api/oauth.js';
import { ScriptsApi } from './api/scripts.js';
import { SettingsApi } from './api/settings.js';
import { SystemApi } from './api/system.js';
import { VoiceApi } from './api/voice.js';
import { HttpTransport, type AwtrixClientOptions } from './http.js';

/**
 * Client for the AWTRIX NG HTTP API v1.
 *
 * ```ts
 * const awtrix = new AwtrixClient({ host: '192.168.1.50' });
 * await awtrix.notifications.send({ text: 'Hello', textColor: '#00FF00' });
 * ```
 *
 * Every method rejects with an {@link AwtrixError} subclass:
 * {@link AwtrixApiError} (non-2xx answer), {@link AwtrixConnectionError} (no answer) or
 * {@link AwtrixValidationError} (argument refused before sending).
 */
export class AwtrixClient {
  /** Base URL requests are sent to, e.g. `http://192.168.1.50`. */
  readonly baseUrl: string;

  /** Device state, version, capabilities, reboot, sleep, factory reset. */
  readonly device: DeviceApi;
  /** Saved preferences (`/api/v1/settings`). */
  readonly settings: SettingsApi;
  /** Panel power, global overlay, mood light, framebuffer. */
  readonly display: DisplayApi;
  /** App inventory, rotation, pushed apps. */
  readonly apps: AppsApi;
  /** Berry scripts and their settings. */
  readonly scripts: ScriptsApi;
  /** One-shot notifications. */
  readonly notifications: NotificationsApi;
  /** The three indicator pixels. */
  readonly indicators: IndicatorsApi;
  /** Sounds (stored files, melodies, speech, songs, tracks), clips and internet radio. */
  readonly audio: AudioApi;
  /** Device configuration, Wi-Fi scan, logs, firmware update, backup restore. */
  readonly system: SystemApi;
  /** File system and icon origins. */
  readonly files: FilesApi;
  /** Bluetooth gamepads in two slots (TC002). */
  readonly gamepad: GamepadApi;
  /** Home Assistant Voice settings and status (TC002). */
  readonly voice: VoiceApi;
  /** Script sign-ins to services via OAuth (TC002). */
  readonly oauth: OAuthApi;

  constructor(options: AwtrixClientOptions | string) {
    const transport = new HttpTransport(typeof options === 'string' ? { host: options } : options);
    this.baseUrl = transport.baseUrl;
    this.device = new DeviceApi(transport);
    this.settings = new SettingsApi(transport);
    this.display = new DisplayApi(transport);
    this.apps = new AppsApi(transport);
    this.scripts = new ScriptsApi(transport);
    this.notifications = new NotificationsApi(transport);
    this.indicators = new IndicatorsApi(transport);
    this.audio = new AudioApi(transport);
    this.system = new SystemApi(transport);
    this.files = new FilesApi(transport);
    this.gamepad = new GamepadApi(transport);
    this.voice = new VoiceApi(transport);
    this.oauth = new OAuthApi(transport);
  }
}
