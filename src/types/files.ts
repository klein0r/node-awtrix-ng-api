/** Storage figures reported by the listing routes; they cover the whole file system. */
export interface StorageUsage {
  usedBytes: number;
  totalBytes: number;
}

export interface StoredFile {
  name: string;
  size: number;
}

/** `GET /api/v1/files`. */
export interface FileList extends StorageUsage {
  files: StoredFile[];
}

/**
 * Binary content for uploads. A `Blob` (or `File`) is sent as is; bytes are wrapped in a
 * `Blob` together with the given file name.
 */
export type UploadContent = Blob | Uint8Array | ArrayBuffer;

/** A link between an installed icon and its published original. */
export interface IconOrigin {
  /** Existing local filename, `[A-Za-z0-9_-]{1,32}.(gif|jpg)`. */
  name: string;
  /** HTTPS base ending in `/icons/`, at most 240 characters. */
  hub: string;
  /** `[a-z0-9_-]{1,32}`. */
  slug: string;
  /** Lowercase SHA256 of the local file bytes at linkage time. */
  sha256: string;
}

/** Per-category counts of a backup restore. */
export interface RestoreApplied {
  wifi?: number;
  system?: number;
  settings?: number;
  appLoop?: number;
  radioStations?: number;
  icons?: number;
  melodies?: number;
  palettes?: number;
  MP3s?: number;
  sounds?: number;
  scripts?: number;
  /** Rejected entries. */
  skipped?: number;
  [category: string]: number | undefined;
}

/** `POST /api/v1/restore` success body. */
export interface RestoreResult {
  ok: true;
  applied: RestoreApplied;
  /** One string per skipped or rejected entry. */
  warnings: string[];
}
