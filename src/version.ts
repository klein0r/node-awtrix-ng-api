/** The AWTRIX NG HTTP API version this client speaks (all routes live under `/api/v1`). */
export const AWTRIX_API_VERSION = 'v1';

/**
 * The AWTRIX NG firmware release the types and routes were derived from: 1.2.2, with separate
 * documentation per device (TC002, ESP32, ESP32-S3). Fields that only one kind
 * of device has are optional. Sound, notification sounds, sound settings and the gamepad use
 * the 1.2.0 format and do not work with older firmware.
 */
export const AWTRIX_FIRMWARE_VERSION = '1.2.2';
