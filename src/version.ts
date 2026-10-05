/** The AWTRIX NG HTTP API version this client speaks (all routes live under `/api/v1`). */
export const AWTRIX_API_VERSION = 'v1';

/**
 * The AWTRIX NG firmware release the types and routes were derived from: 1.2.0, the first
 * release with separate documentation per device (TC002 and ESP32). Fields that only one kind
 * of device has are optional. Sound, notification sounds, sound settings and the gamepad use
 * the format introduced with the TC002 betas and do not work with firmware before that.
 */
export const AWTRIX_FIRMWARE_VERSION = '1.2.0';
