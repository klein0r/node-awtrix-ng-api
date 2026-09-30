import type { ExactlyOne } from './common.js';
import type { StorageUsage, StoredFile } from './files.js';

/** One stored melody. `error` and `index` are present only when `valid` is `false`. */
export interface Melody {
  /** The file is `/MELODIES/<name>.txt`. */
  name: string;
  /** The file contents, verbatim. */
  rtttl: string;
  bytes: number;
  /** `0` when the melody does not parse. */
  notes: number;
  /** `0` when the melody does not parse. */
  durationMs: number;
  valid: boolean;
  /** Parse error, only when `valid` is `false`. */
  error?: string;
  /** Byte offset of the parse error, only when `valid` is `false`. */
  index?: number;
}

/** `GET /api/v1/audio/melodies`. */
export interface MelodyList extends StorageUsage {
  melodies: Melody[];
}

/** Result of `PUT /api/v1/audio/melodies/{name}`. */
export interface MelodySaveResult {
  ok: true;
  /** `true` for `201 Created`, `false` when an existing melody was replaced. */
  created: boolean;
}

/** All sources `POST /api/v1/audio/play` knows. Exactly one may be sent. */
export interface AudioSources {
  /** A name resolved against every output: MP3 first, then melody, then DFPlayer track. */
  sound: string;
  /** A stored MP3 `/MP3/<name>.mp3` (name without extension). */
  mp3: string;
  /** A stored melody `/MELODIES/<name>.txt`. */
  melody: string;
  /** A DFPlayer track, `1..2999`. */
  track: number;
  /** An inline RTTTL melody. */
  rtttl: string;
  /** A station from the stored list, by name. */
  station: string;
  /** A station from the stored list, by position. */
  index: number;
  /** A stream URL (also `.m3u`/`.pls`), played without storing it. */
  url: string;
}

/** `POST /api/v1/audio/play` body - exactly one source. */
export type AudioPlayRequest = ExactlyOne<AudioSources>;

/** `sounds` = melodies, MP3s and tracks; `stream` = radio; `all` = both. */
export type AudioStopScope = 'sounds' | 'stream' | 'all';

export interface RadioStation {
  /** 1-24 characters, unique within the list. */
  name: string;
  /** `http://` or `https://`, at most 255 characters. */
  url: string;
}

export interface Mp3PlaybackState {
  playing: boolean;
  /** Without `.mp3`; `""` when none. */
  name: string;
}

export interface RadioPlaybackState {
  playing: boolean;
  /** The station name, or the URL for an ad-hoc play. */
  station: string;
  /** Last track title the stream reported. */
  title: string;
  /** Why playback stopped; cleared on the next successful play. */
  error: string;
  /** Audible dropouts since the radio service started. */
  underruns: number;
  /** Rolling average decode time of one MP3 frame in µs. */
  decodeUs: number;
  /** Milliseconds the audio task waited for data. */
  starvedMs: number;
  /** Undecoded bytes still buffered. */
  bufferBytes: number;
}

/** `GET /api/v1/audio`. */
export interface AudioState {
  /** Whether this build and hardware can play at all. */
  available: boolean;
  mp3: Mp3PlaybackState;
  radio: RadioPlaybackState;
  stations: RadioStation[];
}

/** `GET /api/v1/audio/mp3`. */
export interface Mp3List extends StorageUsage {
  files: StoredFile[];
}
