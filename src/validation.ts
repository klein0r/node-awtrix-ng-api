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
