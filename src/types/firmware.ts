/** Update images published for over-the-air updates, as named by `device.updateImage`. */
export const FIRMWARE_IMAGES = [
  'firmware-awtrix-ng.bin',
  'firmware-awtrix-ng-s3-octal.bin',
  'firmware-awtrix-ng-s3-quad.bin',
  'awtrix-ng-tc002.awup',
] as const;

export type FirmwareImageName = (typeof FIRMWARE_IMAGES)[number];

/** A published firmware image that is newer than the one installed. */
export interface AvailableFirmware {
  /** Release version without the `v` prefix, e.g. `1.2.3`. */
  version: string;
  /** The update file for this device. */
  image: FirmwareImageName;
  /** Download URL of the image. */
  url: string;
  /** Size in bytes, from the OTA manifest. */
  size: number;
  /** SHA-256 of the image (lower case hex), from the OTA manifest. */
  sha256: string;
}

/** Result of `FirmwareUpdater.check()`. */
export type FirmwareCheckResult =
  | {
      available: false;
      /** Version installed on the device. */
      currentVersion: string;
      /** Latest stable release. */
      latestVersion: string;
    }
  | {
      available: true;
      currentVersion: string;
      latestVersion: string;
      update: AvailableFirmware;
    };
