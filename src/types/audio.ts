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
  /** Since 1.1.4. A stored MP3 as an overlapping sound effect (mixer, TC002); like `mp3` elsewhere. */
  sfx: string;
  /** Since 1.1.4. A stored MP3 looping under other sounds until stopped. Needs a mixer, else `503`. */
  loop: string;
  /** Since 1.1.4. Song text for the synthesizer, played on the loop layer. Needs a synthesizer (TC002). */
  song: string;
  /** Since 1.1.4. Song text played once as an effect. Needs a synthesizer (TC002). */
  fx: string;
  /** A station from the stored list, by name. */
  station: string;
  /** A station from the stored list, by position. */
  index: number;
  /** A stream URL (also `.m3u`/`.pls`), played without storing it. */
  url: string;
}

/** Sources that may name a script's own sound with `script`. */
export type ScriptSoundSource = 'mp3' | 'sfx' | 'loop';

/** Modifiers that are only valid next to certain sources. */
export interface AudioPlayModifiers {
  /** With `mp3`, `sfx` or `loop`: play `/SCRIPTS/<script>/<name>.mp3` instead of `/MP3/<name>.mp3`. */
  script: string;
  /** With `song`: let the playing song run to its next bar line before switching. */
  nextBar: boolean;
}

type PlayVariant<K extends keyof AudioSources> = { [P in K]-?: AudioSources[P] } & {
  [P in Exclude<keyof AudioSources, K>]?: never;
} & (K extends ScriptSoundSource ? { script?: string } : { script?: never }) &
  (K extends 'song' ? { nextBar?: boolean } : { nextBar?: never });

/**
 * `POST /api/v1/audio/play` body - exactly one source, plus `script` (only with
 * `mp3`/`sfx`/`loop`) or `nextBar` (only with `song`).
 */
export type AudioPlayRequest = { [K in keyof AudioSources]: PlayVariant<K> }[keyof AudioSources];

/**
 * `sounds` = melodies, MP3s, tracks, effects and the loop; `stream` = radio;
 * `loop` = only the looping MP3 or song (1.1.4+); `all` = everything.
 */
export type AudioStopScope = 'sounds' | 'stream' | 'loop' | 'all';

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
  /** Since 1.1.4: the script whose own sound plays; `""` for `/MP3` or when none plays. */
  script?: string;
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
  /** Since 1.1.4: one entry per script folder with at least one sound. */
  scripts?: ScriptSoundGroup[];
}
