import { AwtrixValidationError } from './errors.js';

const APP_NAME = /^[A-Za-z0-9_-]{1,32}$/;
const MELODY_NAME = /^[A-Za-z0-9_-]{1,24}$/;
const MP3_NAME = /^[A-Za-z0-9_-]{1,32}$/;
const ICON_FILE_NAME = /^[A-Za-z0-9_-]{1,32}\.(gif|jpg)$/;
const RESERVED_APP_NAMES = new Set(['active', 'next', 'previous', 'order']);

/** Checks an app / script name: `[A-Za-z0-9_-]{1,32}` and not one of the reserved route names. */
export function assertAppName(name: unknown, field = 'name'): asserts name is string {
  if (typeof name !== 'string' || !APP_NAME.test(name)) {
    throw new AwtrixValidationError(field, 'must match [A-Za-z0-9_-]{1,32}');
  }
  if (RESERVED_APP_NAMES.has(name)) {
    throw new AwtrixValidationError(field, `"${name}" is reserved by the device`);
  }
}

export function isValidAppName(name: unknown): name is string {
  return typeof name === 'string' && APP_NAME.test(name) && !RESERVED_APP_NAMES.has(name);
}

export function assertMelodyName(name: unknown): asserts name is string {
  if (typeof name !== 'string' || !MELODY_NAME.test(name)) {
    throw new AwtrixValidationError('name', 'must match [A-Za-z0-9_-]{1,24}');
  }
}

/** Strips an optional `.mp3` extension and checks the remaining name. */
export function normalizeMp3Name(name: unknown): string {
  if (typeof name !== 'string') throw new AwtrixValidationError('name', 'must be a string');
  const bare = name.replace(/\.mp3$/i, '');
  if (!MP3_NAME.test(bare)) {
    throw new AwtrixValidationError('name', 'must match [A-Za-z0-9_-]{1,32} (optionally followed by .mp3)');
  }
  return bare;
}

export function assertIconFileName(name: unknown): asserts name is string {
  if (typeof name !== 'string' || !ICON_FILE_NAME.test(name)) {
    throw new AwtrixValidationError('name', 'must match [A-Za-z0-9_-]{1,32}.(gif|jpg)');
  }
}

export function assertNonEmptyString(value: unknown, field: string): asserts value is string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new AwtrixValidationError(field, 'must be a non-empty string');
  }
}

export function assertInteger(value: unknown, field: string, min: number, max: number): asserts value is number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < min || value > max) {
    throw new AwtrixValidationError(field, `must be an integer between ${min} and ${max}`);
  }
}

/** Throws unless `value` is a plain object with at least one own key. */
export function assertNonEmptyObject(value: unknown, field: string): asserts value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value) || Object.keys(value).length === 0) {
    throw new AwtrixValidationError(field, 'must be an object with at least one key');
  }
}

/** Throws unless the (optional) numeric key of `obj` lies within the range. */
export function assertOptionalInteger(obj: Record<string, unknown>, key: string, min: number, max: number): void {
  if (obj[key] !== undefined) assertInteger(obj[key], key, min, max);
}

/** Encodes one path segment. */
export function segment(value: string | number): string {
  return encodeURIComponent(String(value));
}

const SOUND_SOURCE_KEYS = ['file', 'rtttl', 'song', 'speech', 'track', 'station'] as const;
const SOUND_NAME = /^[A-Za-z0-9_-]{1,32}$/;
const SCRIPT_SOUND = /^[A-Za-z0-9_-]{1,32}\/[A-Za-z0-9_-]{1,32}$/;
const SOUND_URL = /^https?:\/\/\S+$/i;

export interface SoundCheckOptions {
  /** `station` is allowed (only at the top level of `audio.play()`). */
  station: boolean;
  /** `nextBar` is allowed (not in notifications). */
  nextBar: boolean;
}

/** Checks a `file` value: a stored name, `Script/name` or an `http(s)://` address. */
export function assertSoundFile(value: unknown, field: string): void {
  if (typeof value !== 'string' || !(SOUND_NAME.test(value) || SCRIPT_SOUND.test(value) || SOUND_URL.test(value))) {
    throw new AwtrixValidationError(field, 'must be a name ([A-Za-z0-9_-]{1,32}), "Script/name" or an http(s):// address');
  }
}

/**
 * Checks a sound as `POST /api/v1/audio/play` and a notification's `sound` take it: a stored
 * name, one sound object, or a list of 1-4 of them. Field names follow the device
 * (`[1].rtttl`).
 */
export function assertSound(sound: unknown, field: string, options: SoundCheckOptions): void {
  if (typeof sound === 'string') {
    assertSoundFile(sound, field);
    return;
  }
  if (Array.isArray(sound)) {
    if (sound.length < 1 || sound.length > 4) throw new AwtrixValidationError(field, 'must have 1 to 4 entries');
    sound.forEach((entry, i) => {
      const entryField = `${field}[${i}]`;
      if (typeof entry === 'string') assertSoundFile(entry, entryField);
      else assertSoundObject(entry, entryField, { ...options, station: false });
    });
    return;
  }
  assertSoundObject(sound, field, options);
}

function assertSoundObject(sound: unknown, field: string, options: SoundCheckOptions): void {
  if (typeof sound !== 'object' || sound === null || Array.isArray(sound)) {
    throw new AwtrixValidationError(field, 'must be a string, object or list');
  }
  const obj = sound as Record<string, unknown>;
  const allowed: string[] = [...SOUND_SOURCE_KEYS, 'loop', ...(options.nextBar ? ['nextBar'] : [])];
  for (const key of Object.keys(obj)) {
    if (!allowed.includes(key)) throw new AwtrixValidationError(sub(field, key), 'unknown field');
  }
  const sources = SOUND_SOURCE_KEYS.filter((key) => obj[key] !== undefined);
  if (sources.length === 0) throw new AwtrixValidationError(field, `needs a sound key (${SOUND_SOURCE_KEYS.join(', ')})`);
  if (sources.length > 1) throw new AwtrixValidationError(sub(field, sources[0]!), 'one sound key only');
  const key = sources[0]!;
  const value = obj[key];
  switch (key) {
    case 'file':
      assertSoundFile(value, sub(field, key));
      break;
    case 'rtttl':
      if (typeof value !== 'string' || value.length === 0 || value.length > 512) {
        throw new AwtrixValidationError(sub(field, key), 'must be a melody of 1 to 512 characters');
      }
      break;
    case 'song':
      assertNonEmptyString(value, sub(field, key));
      break;
    case 'speech': {
      const bytes = typeof value === 'string' ? new TextEncoder().encode(value).length : 0;
      if (bytes < 1 || bytes > 512) throw new AwtrixValidationError(sub(field, key), 'must be 1..512 bytes');
      break;
    }
    case 'track':
      assertInteger(value, sub(field, key), 1, 2999);
      break;
    case 'station':
      if (!options.station) throw new AwtrixValidationError(sub(field, key), 'not here');
      if (!(typeof value === 'string' && value.length > 0) && !(typeof value === 'number' && Number.isInteger(value) && value >= 0)) {
        throw new AwtrixValidationError(sub(field, key), 'must be a station name, a position from 0 or a stream address');
      }
      break;
  }
  if (obj.loop !== undefined) {
    if (typeof obj.loop !== 'boolean') throw new AwtrixValidationError(sub(field, 'loop'), 'must be true or false');
    if (key === 'station') throw new AwtrixValidationError(sub(field, 'loop'), 'not with station');
  }
  if (obj.nextBar !== undefined) {
    if (typeof obj.nextBar !== 'boolean') throw new AwtrixValidationError(sub(field, 'nextBar'), 'must be true or false');
    if (key !== 'song' || obj.loop !== true) throw new AwtrixValidationError(sub(field, 'nextBar'), 'only with a looping song');
  }
}

function sub(field: string, key: string): string {
  return field ? `${field}.${key}` : key;
}
