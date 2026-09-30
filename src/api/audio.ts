import type { RequestOptions } from '../http.js';
import { AwtrixApiError, AwtrixValidationError } from '../errors.js';
import type {
  AudioPlayRequest,
  AudioSources,
  AudioState,
  AudioStopScope,
  MelodyList,
  MelodySaveResult,
  Mp3List,
  RadioStation,
  ScriptSoundSource,
} from '../types/audio.js';
import type { OkResponse } from '../types/common.js';
import type { UploadContent } from '../types/files.js';
import { assertAppName, assertInteger, assertMelodyName, assertNonEmptyString, normalizeMp3Name, segment } from '../validation.js';
import { ApiModule, toFormData, UPLOAD_TIMEOUT } from './base.js';

const SOURCE_KEYS: readonly (keyof AudioSources)[] = [
  'sound',
  'mp3',
  'melody',
  'track',
  'rtttl',
  'sfx',
  'loop',
  'song',
  'fx',
  'station',
  'index',
  'url',
];
const SCRIPT_SOUND_SOURCES: readonly string[] = ['mp3', 'sfx', 'loop'] satisfies readonly ScriptSoundSource[];
const STOP_SCOPES: readonly AudioStopScope[] = ['sounds', 'stream', 'loop', 'all'];
const MAX_STATIONS = 32;

/** Buzzer melodies, stored MP3s, DFPlayer tracks and internet radio. */
export class AudioApi extends ApiModule {
  /** `GET /api/v1/audio` - what is playing, plus the station list. */
  async getState(options?: RequestOptions): Promise<AudioState> {
    return this.json(this.read('/api/v1/audio', options));
  }

  /**
   * `POST /api/v1/audio/play` - plays exactly one source. With `soundEnabled` off every source
   * except the radio ones answers `200` and plays nothing.
   *
   * `sfx`, `loop`, `song` and `fx` need firmware 1.1.4 and a mixer / synthesizer (TC002);
   * without one the device answers `503`. `script` (with `mp3`/`sfx`/`loop`) plays a script's
   * own sound; `nextBar` (with `song`) switches songs at the next bar line.
   */
  async play(request: AudioPlayRequest, options?: RequestOptions): Promise<OkResponse> {
    if (typeof request !== 'object' || request === null) {
      throw new AwtrixValidationError('request', 'must be an object');
    }
    const input = request as Partial<AudioSources> & { script?: unknown; nextBar?: unknown };
    const keys = SOURCE_KEYS.filter((key) => input[key] !== undefined);
    if (keys.length !== 1) {
      throw new AwtrixValidationError('request', `exactly one of ${SOURCE_KEYS.join(', ')} is required`);
    }
    const key = keys[0]!;
    const value = input[key];
    if (key === 'track') assertInteger(value, 'track', 1, 2999);
    else if (key === 'index') assertInteger(value, 'index', 0, MAX_STATIONS - 1);
    else assertNonEmptyString(value, key);

    const json: Record<string, unknown> = { [key]: value };
    if (input.script !== undefined) {
      if (!SCRIPT_SOUND_SOURCES.includes(key)) {
        throw new AwtrixValidationError('script', `is only allowed with ${SCRIPT_SOUND_SOURCES.join(', ')}`);
      }
      assertAppName(input.script, 'script');
      json.script = input.script;
    }
    if (input.nextBar !== undefined) {
      if (key !== 'song') throw new AwtrixValidationError('nextBar', 'is only allowed with song');
      if (typeof input.nextBar !== 'boolean') throw new AwtrixValidationError('nextBar', 'must be a boolean');
      json.nextBar = input.nextBar;
    }
    return this.ok({ method: 'POST', path: '/api/v1/audio/play', json, options });
  }

  /** Plays a name resolved against every output: stored MP3, then melody, then DFPlayer track. */
  async playSound(name: string, options?: RequestOptions): Promise<OkResponse> {
    return this.play({ sound: name }, options);
  }

  /** Plays an inline RTTTL melody on the buzzer. */
  async playRtttl(rtttl: string, options?: RequestOptions): Promise<OkResponse> {
    return this.play({ rtttl }, options);
  }

  /** Tunes to a stored station by name. */
  async playStation(station: string, options?: RequestOptions): Promise<OkResponse> {
    return this.play({ station }, options);
  }

  /** Streams a URL without storing it. */
  async playUrl(url: string, options?: RequestOptions): Promise<OkResponse> {
    return this.play({ url }, options);
  }

  /** Plays a stored MP3 as an overlapping sound effect (1.1.4+; like `mp3` without a mixer). */
  async playSfx(name: string, sfxOptions: { script?: string } & RequestOptions = {}): Promise<OkResponse> {
    const { script, ...options } = sfxOptions;
    return this.play(script === undefined ? { sfx: name } : { sfx: name, script }, options);
  }

  /** Loops a stored MP3 under all other sounds until stopped (1.1.4+, needs a mixer). */
  async playLoop(name: string, loopOptions: { script?: string } & RequestOptions = {}): Promise<OkResponse> {
    const { script, ...options } = loopOptions;
    return this.play(script === undefined ? { loop: name } : { loop: name, script }, options);
  }

  /** Plays song text on the synthesizer in place of the loop (1.1.4+, TC002). */
  async playSong(song: string, songOptions: { nextBar?: boolean } & RequestOptions = {}): Promise<OkResponse> {
    const { nextBar, ...options } = songOptions;
    return this.play(nextBar === undefined ? { song } : { song, nextBar }, options);
  }

  /** Plays song text once as a synthesizer effect (1.1.4+, TC002). */
  async playFx(fx: string, options?: RequestOptions): Promise<OkResponse> {
    return this.play({ fx }, options);
  }

  /**
   * `POST /api/v1/audio/stop` - `sounds` stops one-shots, effects and the loop, `stream` the
   * radio, `loop` only the loop (1.1.4+), `all` (default) everything. Works even while
   * `soundEnabled` is off.
   */
  async stop(scope?: AudioStopScope, options?: RequestOptions): Promise<OkResponse> {
    if (scope !== undefined && !STOP_SCOPES.includes(scope)) {
      throw new AwtrixValidationError('scope', `must be one of ${STOP_SCOPES.join(', ')}`);
    }
    return this.ok({ method: 'POST', path: '/api/v1/audio/stop', json: scope ? { scope } : undefined, options });
  }

  /* --- Melodies --- */

  /** `GET /api/v1/audio/melodies` - every stored melody with its parse result. */
  async listMelodies(options?: RequestOptions): Promise<MelodyList> {
    return this.json(this.read('/api/v1/audio/melodies', options));
  }

  /**
   * `PUT /api/v1/audio/melodies/{name}` - stores a melody. The RTTTL title is normalised
   * to `name`. `created` tells a new melody from a replaced one.
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
   * (`[A-Za-z0-9_-]{1,32}`, `.mp3` is appended when missing).
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

  /**
   * The stored station list: `GET /api/v1/audio/stations` (1.1.4+), falling back to the list
   * in `GET /api/v1/audio` on older firmware.
   */
  async getStations(options?: RequestOptions): Promise<RadioStation[]> {
    try {
      const body = await this.json<{ stations: RadioStation[] }>(this.read('/api/v1/audio/stations', options));
      return body.stations;
    } catch (error) {
      if (error instanceof AwtrixApiError && (error.status === 404 || error.status === 405)) {
        return (await this.getState(options)).stations;
      }
      throw error;
    }
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
