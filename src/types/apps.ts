import type { AppName } from './common.js';
import type { Weekday, WeekdayBarUpdate } from './settings.js';

export type AppOrigin = 'builtin' | 'pushed' | 'script' | 'module';

/** Built-in app names. Temperature, Humidity and Battery depend on the hardware. */
export type BuiltinAppName = 'Time' | 'Date' | 'Temperature' | 'Humidity' | 'Battery' | 'Status';

/** A script error, as reported in the app inventory and by script writes. */
export interface ScriptError {
  /** Human-readable text with any source position lifted out. */
  message: string;
  /** 1-based line in the submitted source, when known. */
  line?: number;
  /** The method that raised it, when known. */
  hook?: 'setup' | 'loop' | 'draw' | 'on_show' | 'on_hide' | 'on_button' | 'should_show' | (string & {});
}

/** A `@requires` header entry: a script or module this script needs. */
export interface ScriptRequirement {
  /** A script's install name or a module's import name. */
  name: string;
  /** AWTRIX Hub ID, when the header gives one. */
  hub?: string;
  /** True while nothing installed provides it. */
  missing: boolean;
}

/** A `@needs` header entry: a capability this script asks for. */
export interface ScriptNeed {
  /** Dotted path of a boolean in `GET /api/v1/capabilities`, e.g. `gamepad` or `audio.mixer`. */
  name: string;
  /** True while this display does not have it. */
  missing: boolean;
}

/** The smallest panel from the `@display` header. */
export interface ScriptDisplayRequirement {
  width: number;
  height: number;
  /** True when this display is at least that large. */
  fits: boolean;
}

/** Metadata from a script's `@` header lines; each string is `""` when absent. */
export interface ScriptMeta {
  name: string;
  desc: string;
  author: string;
  version: string;
  /** Icon IDs from the `@icons` header. */
  icons: string[];
  /** The `@requires` header lines. */
  requires?: ScriptRequirement[];
  /** The `@needs` header lines. */
  needs?: ScriptNeed[];
  /** The `@display` header line; `null` when the script runs on any panel. */
  display?: ScriptDisplayRequirement | null;
}

interface AppInfoBase {
  name: string;
  /** Whether the app runs at all. */
  enabled: boolean;
  /** Whether it takes turns in the rotation. */
  inLoop: boolean;
  /** Whether the app is on the device right now. */
  present: boolean;
  /** 0-based arranged position, `null` when the app has no place of its own. */
  slot: number | null;
}

export interface BuiltinAppInfo extends AppInfoBase {
  origin: 'builtin';
  /** The app offers settings under `apps.getBuiltinConfig()`. */
  config?: boolean;
}

export interface PushedAppInfo extends AppInfoBase {
  origin: 'pushed';
  /** Only present when the pushed spec set a non-empty icon. */
  icon?: string;
}

export interface ScriptAppInfo extends AppInfoBase {
  origin: 'script';
  /** `should_show()` last answered false, so the rotation walks past it. */
  skipped?: boolean;
  /** Carries `@headless true` and never draws. */
  headless?: boolean;
  /** Carries `@ondemand` - runs only when started via `switchTo()` or the device menu. */
  ondemand?: boolean;
  /** Declares settings, so `GET /api/v1/apps/{name}/config` has fields. */
  config?: boolean;
  /** `null` while healthy. */
  error?: ScriptError | null;
  meta?: ScriptMeta;
}

/** A Berry module other scripts import. Never draws, so it has no loop state. */
export interface ModuleInfo {
  name: string;
  origin: 'module';
  present?: boolean;
  /** The name scripts write in their `import` line. */
  import: string;
  config?: boolean;
  error?: ScriptError | null;
  meta?: ScriptMeta;
}

/** A name the rotation holds a place for while the app itself is away. */
export interface AbsentAppInfo extends AppInfoBase {
  origin: null;
  present: false;
}

/** One entry of `GET /api/v1/apps`, discriminated by `origin`. */
export type AppInfo = BuiltinAppInfo | PushedAppInfo | ScriptAppInfo | ModuleInfo | AbsentAppInfo;

/** `PUT /api/v1/apps/order` body. Apps named in neither list keep their state. */
export interface AppOrder {
  /** What runs, in drawing order. Duplicates rotate multiple times per cycle. */
  order?: readonly AppName[];
  /** What is switched off. Always required by the device (may be `[]`). */
  disabled: readonly AppName[];
}

/* ------------------------------------------------------------------------------------------ */
/* Scripts                                                                                    */
/* ------------------------------------------------------------------------------------------ */

/** Reply of a script install or a script settings change. */
export interface ScriptWriteResult {
  ok: true;
  name: string;
  /** `null` = compiled / restarted cleanly. Anything else: installed, but broken. */
  error: ScriptError | null;
}

interface ScriptConfigFieldBase {
  /** The name the script reads its value under. */
  key: string;
  label: string;
  /** One line of explanation under the label. */
  help?: string;
  /** The part of the settings form the field belongs to. */
  group?: string;
}

export interface ScriptConfigBoolField extends ScriptConfigFieldBase {
  type: 'bool';
  default: boolean;
  value: boolean;
}

export interface ScriptConfigTextField extends ScriptConfigFieldBase {
  type: 'text';
  /** Longest value accepted, at most 256. */
  maxlen?: number;
  default: string;
  value: string;
}

export interface ScriptConfigNumberField extends ScriptConfigFieldBase {
  type: 'number' | 'slider';
  unit?: string;
  min?: number;
  max?: number;
  step?: number;
  default: number;
  value: number;
}

export interface ScriptConfigSelectField extends ScriptConfigFieldBase {
  type: 'select';
  options: string[];
  default: string;
  value: string;
}

export interface ScriptConfigColorField extends ScriptConfigFieldBase {
  type: 'color';
  /** Packed `0xRRGGBB`, `0..16777215`. */
  default: number;
  /** Packed `0xRRGGBB`, `0..16777215`. */
  value: number;
}

/** One declared script setting, discriminated by `type`. */
export type ScriptConfigField =
  | ScriptConfigBoolField
  | ScriptConfigTextField
  | ScriptConfigNumberField
  | ScriptConfigSelectField
  | ScriptConfigColorField;

export type ScriptConfigFieldType = ScriptConfigField['type'];

/** `GET /api/v1/apps/{name}/config`. */
export interface ScriptConfig {
  name: string;
  fields: ScriptConfigField[];
  /** `@config` lines the device could not read, each with its line number. */
  warnings: string[];
}

/**
 * `PATCH /api/v1/apps/{name}/config` body: setting key to new value. A `color` accepts the
 * packed number or a `"#RRGGBB"` string; numbers outside `min`/`max` are clamped.
 */
export type ScriptConfigUpdate = Record<string, string | number | boolean>;

/** A JSON value as stored by a script with `store.set()`. */
export type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

/** `GET /api/v1/apps/{name}/data` - what a script saved, without its `@config` settings. */
export type ScriptData = Record<string, JsonValue>;

/** `PATCH /api/v1/apps/{name}/data` body - a value replaces or adds a key, `null` removes it. */
export type ScriptDataUpdate = Record<string, JsonValue>;

/** One of a script's own sounds. */
export interface ScriptSoundFile {
  /** With `.mp3`. */
  name: string;
  size: number;
  /** Lowercase hex SHA-256 of the stored bytes. */
  sha256: string;
}

/** `GET /api/v1/apps/script/{name}/sounds`. */
export interface ScriptSoundList {
  files: ScriptSoundFile[];
  usedBytes: number;
  totalBytes: number;
}

/* ------------------------------------------------------------------------------------------ */
/* Built-in app settings                                                                      */
/* ------------------------------------------------------------------------------------------ */

/** The part of a built-in app's form a setting belongs to. */
export type BuiltinConfigGroup = 'time' | 'calendar' | 'date' | 'weekday';

interface BuiltinConfigFieldBase {
  /** The setting's name; a weekday bar member is dotted, e.g. `weekdayBar.show`. */
  key: string;
  /** Where the value goes in a `PATCH`: `['weekdayBar', 'show']` is sent as `{ weekdayBar: { show } }`. */
  path: string[];
  /** Omitted for apps with one part. */
  group?: BuiltinConfigGroup | (string & {});
}

export interface BuiltinConfigBoolField extends BuiltinConfigFieldBase {
  type: 'bool';
  default: boolean;
  value: boolean;
}

export interface BuiltinConfigSelectField extends BuiltinConfigFieldBase {
  type: 'select';
  /** The accepted values; `timeMode` offers numbers, the other settings strings. */
  options: (string | number)[];
  default: string | number;
  value: string | number;
}

export interface BuiltinConfigColorField extends BuiltinConfigFieldBase {
  type: 'color';
  /** `true` where `null` ("use the global text color") is allowed. */
  nullable?: boolean;
  /** Packed `0xRRGGBB`, or `null` where nullable. */
  default: number | null;
  value: number | null;
}

export interface BuiltinConfigDaysField extends BuiltinConfigFieldBase {
  type: 'days';
  /** Lowercase weekday names, Sunday first. */
  default: Weekday[];
  value: Weekday[];
}

/** One setting of a built-in app, discriminated by `type`. */
export type BuiltinConfigField = BuiltinConfigBoolField | BuiltinConfigSelectField | BuiltinConfigColorField | BuiltinConfigDaysField;

/** `GET /api/v1/apps/builtin/{name}/config`. */
export interface BuiltinAppConfig {
  name: string;
  /** Depends on the device; empty for an app without settings (e.g. the TC002's Status). */
  fields: BuiltinConfigField[];
  warnings: string[];
}

/**
 * `PATCH /api/v1/apps/builtin/{name}/config` body: each setting at its field's `path`. Colors
 * take any color form, `null` only where `nullable`.
 */
export type BuiltinAppConfigUpdate = Record<string, string | number | boolean | null | WeekdayBarUpdate>;

/** Reply of a built-in app settings change; `error` is always `null`. */
export interface BuiltinConfigWriteResult {
  ok: true;
  name: string;
  error: null;
}

interface SharedValueBase {
  /** Install name of the script that wrote it. */
  owner: string;
  /** Bare key inside the owner's namespace; scripts address it as `owner.key`. */
  key: string;
  /** Milliseconds since it was last written. */
  ageMs: number;
}

/** One entry of `GET /api/v1/scripts/shared`, discriminated by `type`. */
export type SharedValue =
  | (SharedValueBase & { type: 'int'; value: number })
  | (SharedValueBase & { type: 'real'; value: number | null })
  | (SharedValueBase & { type: 'bool'; value: boolean })
  | (SharedValueBase & { type: 'string'; value: string });
