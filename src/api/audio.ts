import type { RequestOptions } from '../http.js';
import { AwtrixValidationError } from '../errors.js';
import type {
  AudioPlayRequest,
  AudioSources,
  AudioState,
  AudioStopScope,
  MelodyList,
  MelodySaveResult,
  Mp3List,
  RadioStation,
} from '../types/audio.js';
import type { OkResponse } from '../types/common.js';
import type { UploadContent } from '../types/files.js';
import { assertInteger, assertMelodyName, assertNonEmptyString, normalizeMp3Name, segment } from '../validation.js';
import { ApiModule, toFormData, UPLOAD_TIMEOUT } from './base.js';

const SOURCE_KEYS: readonly (keyof AudioSources)[] = ['sound', 'mp3', 'melody', 'track', 'rtttl', 'station', 'index', 'url'];
const STOP_SCOPES: readonly AudioStopScope[] = ['sounds', 'stream', 'all'];
const MAX_STATIONS = 32;

/** Buzzer melodies, stored MP3s, DFPlayer tracks and internet radio. */
export class AudioApi extends ApiModule {
  /** `GET /api/v1/audio` - what is playing, plus the station list. */
  async getState(options?: RequestOptions): Promise<AudioState> {
    return this.json(this.read('/api/v1/audio', options));
  }

  /**
   * `POST /api/v1/audio/play` - plays exactly one source. One-shots (`sound`, `mp3`,
   * `melody`, `track`, `rtttl`) are silenced while `soundEnabled` is off; streams are not.
   */
  async play(request: AudioPlayRequest, options?: RequestOptions): Promise<OkResponse> {
    if (typeof request !== 'object' || request === null) {
      throw new AwtrixValidationError('request', 'must be an object');
    }
    const keys = SOURCE_KEYS.filter((key) => (request as Partial<AudioSources>)[key] !== undefined);
    if (keys.length !== 1) {
      throw new AwtrixValidationError('request', `exactly one of ${SOURCE_KEYS.join(', ')} is required`);
    }
    const key = keys[0]!;
    const value = (request as Partial<AudioSources>)[key];
    if (key === 'track') assertInteger(value, 'track', 1, 2999);
    else if (key === 'index') assertInteger(value, 'index', 0, MAX_STATIONS - 1);
    else assertNonEmptyString(value, key);
    return this.ok({ method: 'POST', path: '/api/v1/audio/play', json: { [key]: value }, options });
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

  /**
   * `POST /api/v1/audio/stop` - `sounds` stops one-shots, `stream` the radio, `all`
   * (default) both. Works even while `soundEnabled` is off.
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

  /** The stored station list (read from `GET /api/v1/audio`). */
  async getStations(options?: RequestOptions): Promise<RadioStation[]> {
    return (await this.getState(options)).stations;
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
