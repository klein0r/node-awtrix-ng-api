import type { LooseString } from './common.js';

export type OAuthState = 'signedOut' | 'pending' | 'signedIn' | 'error';

/** One script that signs in to a service. */
export interface OAuthApp {
  /** The script's install name. */
  name: string;
  /** The service, as the host of its sign-in page. */
  provider: string;
  /** What the script asks for. */
  scope: string;
  /** `true`: the service may not need a client secret. */
  pkce: boolean;
  /** The saved client ID, `""` when none is set. */
  clientId: string;
  /** A client secret is saved; the secret itself is never returned. */
  clientSecretSet: boolean;
  state: LooseString<OAuthState>;
  /** Why the last sign-in failed (e.g. `invalid_grant`); only after a failure. */
  error?: string;
  /** Why the script's sign-in header is unusable; only then. */
  invalid?: string;
}

/** `GET /api/v1/oauth`. */
export interface OAuthList {
  /** The address to enter in the developer app at the service. */
  redirectUri: string;
  apps: OAuthApp[];
}

/** `POST /api/v1/oauth/{name}` body. Omitted fields keep their value. */
export interface OAuthCredentials {
  clientId?: string;
  /** An empty string keeps the saved secret. */
  clientSecret?: string;
  /** `true` deletes the saved secret. */
  clearSecret?: true;
}
