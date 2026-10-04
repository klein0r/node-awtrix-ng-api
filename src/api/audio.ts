import type { RequestOptions } from '../http.js';
import { AwtrixValidationError } from '../errors.js';
import type { AudioGroup, AudioPlayRequest, AudioState, MelodyList, MelodySaveResult, Mp3List, RadioStation } from '../types/audio.js';
import type { OkResponse } from '../types/common.js';
import type { UploadContent } from '../types/files.js';
import { assertMelodyName, assertNonEmptyString, assertSound, normalizeMp3Name, segment } from '../validation.js';
import { ApiModule, toFormData, UPLOAD_TIMEOUT } from './base.js';

const AUDIO_GROUPS: readonly AudioGroup[] = ['alert', 'app', 'radio'];
const MAX_STATIONS = 32;
const MAX_CLIP_BYTES = 2 * 1024 * 1024;

/** Options of the single-source shorthands. */
export interface PlayOptions extends RequestOptions {
  /** Repeat until stopped or replaced by a new alert. */
  loop?: boolean;
}

/** Melodies, MP3s, speech, songs, DFPlayer tracks, clips and internet radio. */
export class AudioApi extends ApiModule {
  /** `GET /api/v1/audio` - the alert, app and radio groups plus the station list. */
  async getState(options?: RequestOptions): Promise<AudioState> {
    return this.json(this.read('/api/v1/audio', options));
  }

  /**
   * `POST /api/v1/audio/play` - plays a sound: a stored name (short for `{ file: name }`), one
   * sound object (`file`, `rtttl`, `song`, `speech`, `track` or `station`, plus `loop`), or a
   * list of 1-4 alternatives of which the device plays the first it can.
   *
   * Everything except `station` plays as an alert at `volume × alertVolume`: it replaces a
   * playing alert and pauses the radio. `station` plays as the radio. A stored name that does
   * not exist answers `404`, a sound the device cannot play `503`.
   */
  async play(sound: AudioPlayRequest, options?: RequestOptions): Promise<OkResponse> {
    assertSound(sound, 'sound', { station: true, nextBar: true });
    return this.ok({ method: 'POST', path: '/api/v1/audio/play', json: sound, options });
  }

  /**
   * Plays a stored name (`/MP3/<name>.mp3`, else `/MELODIES/<name>.txt`), a script's own sound
   * (`"Script/name"`) or an `http(s)://` address (`capabilities.audio.url`).
   */
  async playFile(file: string, playOptions: PlayOptions = {}): Promise<OkResponse> {
    const { loop, ...options } = playOptions;
    return this.play(loop === undefined ? { file } : { file, loop }, options);
  }

  /** Plays an RTTTL melody (at most 512 characters). */
  async playRtttl(rtttl: string, playOptions: PlayOptions = {}): Promise<OkResponse> {
    const { loop, ...options } = playOptions;
    return this.play(loop === undefined ? { rtttl } : { rtttl, loop }, options);
  }

  /** Plays song text on the synthesizer (`capabilities.audio.song`), once or with `loop`. */
  async playSong(song: string, playOptions: PlayOptions = {}): Promise<OkResponse> {
    const { loop, ...options } = playOptions;
    return this.play(loop === undefined ? { song } : { song, loop }, options);
  }

  /** Reads text aloud, 1-512 bytes of UTF-8 (`capabilities.audio.speech`). */
  async speak(speech: string, options?: RequestOptions): Promise<OkResponse> {
    return this.play({ speech }, options);
  }

  /** Plays a DFPlayer track `1..2999` (`capabilities.audio.track`). */
  async playTrack(track: number, playOptions: PlayOptions = {}): Promise<OkResponse> {
    const { loop, ...options } = playOptions;
    return this.play(loop === undefined ? { track } : { track, loop }, options);
  }

  /**
   * Starts the radio: a station name from the stored list, a position in it (from 0) or a
   * stream address (`.m3u`/`.pls` play their first entry).
   */
  async playStation(station: string | number, options?: RequestOptions): Promise<OkResponse> {
    return this.play({ station }, options);
  }

  /**
   * `POST /api/v1/audio/clip` - plays a recording once without storing it
   * (`capabilities.audio.clip`, the TC002): WAV with 16-bit PCM (16-48 kHz, mono or stereo) or
   * MP3, at most 2 MiB. Plays as an alert.
   */
  async playClip(clip: UploadContent, contentType?: string, options?: RequestOptions): Promise<OkResponse> {
    const bytes = await toBytes(clip);
    if (bytes.byteLength === 0) throw new AwtrixValidationError('clip', 'must not be empty');
    if (bytes.byteLength > MAX_CLIP_BYTES) throw new AwtrixValidationError('clip', 'must be at most 2 MiB');
    return this.ok({
      method: 'POST',
      path: '/api/v1/audio/clip',
      body: bytes,
      contentType: contentType ?? sniffAudioType(bytes),
      options: { timeout: UPLOAD_TIMEOUT, ...options },
    });
  }

  /**
   * `POST /api/v1/audio/stop` - without a group everything stops, the radio included.
   * `alert` stops the playing alert, `app` every sound of the scripts, `radio` the radio.
   */
  async stop(group?: AudioGroup, options?: RequestOptions): Promise<OkResponse> {
    if (group !== undefined && !AUDIO_GROUPS.includes(group)) {
      throw new AwtrixValidationError('group', `must be one of ${AUDIO_GROUPS.join(', ')}`);
    }
    return this.ok({ method: 'POST', path: '/api/v1/audio/stop', json: group ? { group } : undefined, options });
  }

  /* --- Melodies --- */

  /** `GET /api/v1/audio/melodies` - every stored melody with its parse result. */
  async listMelodies(options?: RequestOptions): Promise<MelodyList> {
    return this.json(this.read('/api/v1/audio/melodies', options));
  }

  /**
   * `PUT /api/v1/audio/melodies/{name}` - stores a melody. The RTTTL title is normalised
   * to `name`. `created` tells a new melody from a replaced one. Rejects with `409 nameTaken`
   * when an MP3 of that name exists - an MP3 and a melody never share a name.
   */
  async saveMelody(name: string, rtttl: string, options?: RequestOptions): Promise<MelodySaveResult> {
    assertMelodyName(name);
    assertNonEmptyString(rtttl, 'rtttl');
    const res = await this.http.request<{ ok?: boolean } | undefined>({
      method: 'PUT',
      path: `/api/v1/audio/melodies/${segment(name)}`,
      json: { rtttl },
      options,
    });
    return { ok: true, created: res.status === 201 };
  }

  /** `DELETE /api/v1/audio/melodies/{name}`. Rejects with `404` for an unknown melody. */
  async deleteMelody(name: string, options?: RequestOptions): Promise<OkResponse> {
    assertMelodyName(name);
    return this.ok({ method: 'DELETE', path: `/api/v1/audio/melodies/${segment(name)}`, options });
  }

  /* --- MP3 --- */

  /** `GET /api/v1/audio/mp3` - stored MP3 files. */
  async listMp3(options?: RequestOptions): Promise<Mp3List> {
    return this.json(this.read('/api/v1/audio/mp3', options));
  }

  /**
   * `POST /api/v1/audio/mp3` - uploads one MP3. `name` is what it is played by
   * (`[A-Za-z0-9_-]{1,32}`, `.mp3` is appended when missing). Rejects with `409 nameTaken`
   * when a melody of that name exists.
   */
  async uploadMp3(name: string, content: UploadContent, options?: RequestOptions): Promise<OkResponse> {
    const fileName = `${normalizeMp3Name(name)}.mp3`;
    return this.ok({
      method: 'POST',
      path: '/api/v1/audio/mp3',
      body: toFormData('file', content, fileName, 'audio/mpeg'),
      options: { timeout: UPLOAD_TIMEOUT, ...options },
    });
  }

  /** `DELETE /api/v1/audio/mp3/{name}` - `name` with or without `.mp3`. */
  async deleteMp3(name: string, options?: RequestOptions): Promise<OkResponse> {
    return this.ok({ method: 'DELETE', path: `/api/v1/audio/mp3/${segment(normalizeMp3Name(name))}`, options });
  }

  /* --- Radio --- */

  /** `GET /api/v1/audio/stations` - the stored station list. */
  async getStations(options?: RequestOptions): Promise<RadioStation[]> {
    const body = await this.json<{ stations: RadioStation[] }>(this.read('/api/v1/audio/stations', options));
    return body.stations;
  }


  /**
   * `PUT /api/v1/audio/stations` - replaces the whole list: at most 32 stations, unique names
   * of 1-24 characters, `http(s)` URLs of at most 255 characters.
   */
  async setStations(stations: readonly RadioStation[], options?: RequestOptions): Promise<OkResponse> {
    if (!Array.isArray(stations)) throw new AwtrixValidationError('stations', 'must be an array');
    if (stations.length > MAX_STATIONS) {
      throw new AwtrixValidationError('stations', `at most ${MAX_STATIONS} stations are allowed`);
    }
    const names = new Set<string>();
    stations.forEach((station, i) => {
      const name = station?.name;
      if (typeof name !== 'string' || name.length < 1 || name.length > 24) {
        throw new AwtrixValidationError(`stations[${i}].name`, 'must be 1-24 characters');
      }
      if (names.has(name)) throw new AwtrixValidationError(`stations[${i}].name`, `duplicate name "${name}"`);
      names.add(name);
      const url = station.url;
      if (typeof url !== 'string' || url.length > 255 || !/^https?:\/\/\S+$/i.test(url)) {
        throw new AwtrixValidationError(`stations[${i}].url`, 'must be an http(s) URL of at most 255 characters');
      }
    });
    return this.ok({
      method: 'PUT',
      path: '/api/v1/audio/stations',
      json: { stations: stations.map(({ name, url }) => ({ name, url })) },
      options,
    });
  }
}

async function toBytes(content: UploadContent): Promise<Uint8Array> {
  if (typeof Blob !== 'undefined' && content instanceof Blob) return new Uint8Array(await content.arrayBuffer());
  if (content instanceof ArrayBuffer) return new Uint8Array(content);
  if (ArrayBuffer.isView(content)) return new Uint8Array(content.buffer, content.byteOffset, content.byteLength);
  throw new AwtrixValidationError('clip', 'must be a Blob, Buffer, Uint8Array or ArrayBuffer');
}

/** `audio/wav` for a RIFF header, otherwise `audio/mpeg`. The device accepts any type. */
function sniffAudioType(bytes: Uint8Array): string {
  const riff = bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46;
  return riff ? 'audio/wav' : 'audio/mpeg';
}
