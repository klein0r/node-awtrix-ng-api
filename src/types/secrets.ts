/** `GET /api/v1/secrets` - installed scripts with an `@secret` line, also invalid ones (TC002, 1.2.3+). */
export interface SecretList {
  apps: string[];
}

/** One API key a script declares. The value itself is never returned. */
export interface SecretKey {
  /** The name the script uses. */
  key: string;
  /** The name of the field; `""` when the line has none. */
  label: string;
  /** The line of explanation; `""` when the line has none. */
  help: string;
  /** A value is saved. */
  set: boolean;
  /** The only hosts the key may be sent to, 1 to 8. */
  hosts: string[];
}

/**
 * `GET /api/v1/secrets/{name}` - a script's API keys, or why its `@secret` lines are unusable
 * (then no key can be saved).
 */
export type SecretKeys = { keys: SecretKey[]; invalid?: never } | { invalid: string; keys?: never };

/** `PUT /api/v1/secrets/{name}` body: key → value. `""` erases a key; keys left out keep their value. */
export type SecretValues = Record<string, string>;
