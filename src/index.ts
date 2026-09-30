export { AwtrixClient } from './client.js';
export { AWTRIX_API_VERSION, AWTRIX_FIRMWARE_VERSION } from './version.js';
export type { AwtrixAuth, AwtrixClientOptions, RequestOptions } from './http.js';

export {
  AwtrixError,
  AwtrixApiError,
  AwtrixConnectionError,
  AwtrixValidationError,
  AwtrixResponseError,
  isAwtrixError,
  isAwtrixApiError,
  isAwtrixConnectionError,
} from './errors.js';
export type { AwtrixErrorCode, AwtrixApiErrorDetails, AwtrixConnectionErrorKind } from './errors.js';

export { AppsApi, type SwitchAppOptions } from './api/apps.js';
export { AudioApi } from './api/audio.js';
export { DeviceApi, type WaitForOnlineOptions } from './api/device.js';
export { DisplayApi } from './api/display.js';
export { FilesApi } from './api/files.js';
export { GamepadApi } from './api/gamepad.js';
export { IndicatorsApi } from './api/indicators.js';
export { NotificationsApi } from './api/notifications.js';
export { ScriptsApi } from './api/scripts.js';
export { SettingsApi } from './api/settings.js';
export { SystemApi, type WifiScanWaitOptions } from './api/system.js';
export { VoiceApi } from './api/voice.js';

export { rgb, hsv, packColor, unpackColor, toHexColor, parseHexColor } from './color.js';
export { Draw } from './draw.js';
export { isValidAppName } from './validation.js';

export * from './types/index.js';
