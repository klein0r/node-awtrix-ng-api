/** The AWTRIX NG HTTP API version this client speaks (all routes live under `/api/v1`). */
export const AWTRIX_API_VERSION = 'v1';

/**
 * The AWTRIX NG firmware release the types and routes were derived from (1.1.4 is in closed
 * beta). Older 1.x firmware lacks some newer fields and routes; the device answers those with
 * `422` or `404`. Response fields added after 1.1.2 are typed as optional.
 */
export const AWTRIX_FIRMWARE_VERSION = '1.1.4';
