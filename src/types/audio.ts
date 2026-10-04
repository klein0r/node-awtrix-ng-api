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

/** The source keys of a {@link SoundObject}, in the order the device reports conflicts. */
export interface SoundSources {
  /**
   * A stored name (`/MP3/<name>.mp3`, else `/MELODIES/<name>.txt`), `"Script/name"` for a
   * script's own sound, or an `http(s)://` address that is downloaded and played (up to 4 MB,
   * `capabilities.audio.url`). Names are 1-32 characters of `[A-Za-z0-9_-]`.
   */
  file: string;
  /** An RTTTL melody, at most 512 characters. */
  rtttl: string;
  /** Song text for the synthesizer (`capabilities.audio.song`). */
  song: string;
  /** Text read aloud, 1-512 bytes of UTF-8 (`capabilities.audio.speech`). */
  speech: string;
  /** A DFPlayer track, `1..2999` (`capabilities.audio.track`). */
  track: number;
  /**
   * Internet radio: a name from the stored list, a position in it (from 0), or a stream
   * address. Not allowed in a list or in a notification.
   */
  station: string | number;
}

export type SoundSourceKey = keyof SoundSources;

type SoundVariant<K extends SoundSourceKey> = { [P in K]-?: SoundSources[P] } & {
  [P in Exclude<SoundSourceKey, K>]?: never;
} & (K extends 'station'
    ? { loop?: never; nextBar?: never }
    : K extends 'song'
      ? // nextBar needs a looping song.
        { loop?: boolean; nextBar?: never } | { loop: true; nextBar?: boolean }
      : { loop?: boolean; nextBar?: never });

/**
 * Exactly one source key, plus `loop` (repeat until stopped or replaced; not with `station`)
 * and `nextBar` (only with a looping `song`: switch at the next bar line).
 */
export type SoundObject = { [K in SoundSourceKey]: SoundVariant<K> }[SoundSourceKey];

/** A sound object without `station`, as allowed in lists and notifications. */
export type ListSoundObject = Exclude<SoundObject, { station: string | number }>;

/** 1 to 4 entries of `T`. */
type OneToFour<T> = readonly [T] | readonly [T, T] | readonly [T, T, T] | readonly [T, T, T, T];

/** A list of 1-4 alternatives; the device plays the first one it can play. */
export type SoundList = OneToFour<string | ListSoundObject>;

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;
type NotificationSoundObject = DistributiveOmit<ListSoundObject, 'nextBar'>;

/**
 * `POST /api/v1/audio/play` body: a stored name (short for `{ file: name }`), one
 * {@link SoundObject}, or a list of 1-4 alternatives.
 */
export type AudioPlayRequest = string | SoundObject | SoundList;

/**
 * A notification's `sound`: like {@link AudioPlayRequest} but without `station` and `nextBar`.
 * `""` or `null` plays nothing.
 */
export type NotificationSound = string | NotificationSoundObject | OneToFour<string | NotificationSoundObject> | null;

/** Sound groups: `alert` (notifications, `audio.play`, clips), `app` (scripts), `radio`. */
export type AudioGroup = 'alert' | 'app' | 'radio';

export interface RadioStation {
  /** 1-24 characters, unique within the list. */
  name: string;
  /** `http://` or `https://`, at most 255 characters. */
  url: string;
}

export interface RadioPlaybackState {
  playing: boolean;
  /** The station name, or the address of a stream played by address. */
  station: string;
  /** Last track title the stream reported. */
  title: string;
  /** Why playback stopped; cleared on the next successful play. */
  error: string;
  /** Audible dropouts since boot; compare two polls. */
  underruns: number;
  /** Average decode time of one piece of audio in µs. */
  decodeUs: number;
  /** Milliseconds the player waited for stream data. */
  starvedMs: number;
  /** Bytes received from the stream and not played yet. */
  bufferBytes: number;
}

/** State of the `alert` or `app` sound group. */
export interface AudioGroupState {
  playing: boolean;
  /** What the group played last: the `file` value as sent, else the source key, or the track number as text. */
  name: string;
  /** Why the last sound from an address did not play, e.g. `HTTP 404`; cleared by the next sound. */
  error: string;
}

/** `GET /api/v1/audio`. */
export interface AudioState {
  radio: RadioPlaybackState;
  /** What scripts play. */
  app: AudioGroupState;
  /** What notifications, `audio.play()` and the other alerts play. */
  alert: AudioGroupState;
  stations: RadioStation[];
}

/** The sounds kept in one script's folder `/SCRIPTS/<name>/`. */
export interface ScriptSoundGroup {
  /** The script's install name. */
  name: string;
  /** Its `@name` header, or the install name without one. */
  title: string;
  /** True for sounds whose script was deleted without them. */
  orphan: boolean;
  files: StoredFile[];
}

/** `GET /api/v1/audio/mp3`. */
export interface Mp3List extends StorageUsage {
  /** The MP3s in `/MP3`. */
  files: StoredFile[];
  /** One entry per script folder with at least one sound. */
  scripts: ScriptSoundGroup[];
}
