import type { RequestOptions } from '../http.js';
import type { OkResponse } from '../types/common.js';
import type { OAuthApp, OAuthCredentials, OAuthList } from '../types/oauth.js';
import { assertAppName, assertNonEmptyObject, assertNonEmptyString, segment } from '../validation.js';
import { ApiModule } from './base.js';

/**
 * Scripts that sign in to a service with OAuth (e.g. Spotify, Strava). Only where
 * `capabilities.oauth` is `true` (the TC002 with scripting on).
 *
 * The routes that change a sign-in accept requests only as the device's own web UI sends them;
 * this client adds the documented `X-Awtrix-OAuth` and `Origin` headers.
 */
export class OAuthApi extends ApiModule {
  /** `GET /api/v1/oauth` - every script that signs in, plus the redirect URI for the service. */
  async list(options?: RequestOptions): Promise<OAuthList> {
    return this.json(this.read('/api/v1/oauth', options));
  }

  /** `GET /api/v1/oauth/{name}` - one script's sign-in. `404` when the script does not sign in. */
  async get(name: string, options?: RequestOptions): Promise<OAuthApp> {
    assertAppName(name);
    return this.json(this.read(`/api/v1/oauth/${segment(name)}`, options));
  }

  /**
   * `POST /api/v1/oauth/{name}` - saves the client ID and/or secret. A new client ID ends the
   * sign-in.
   */
  async setCredentials(name: string, credentials: OAuthCredentials, options?: RequestOptions): Promise<OkResponse> {
    assertAppName(name);
    assertNonEmptyObject(credentials, 'credentials');
    return this.ok({ method: 'POST', path: `/api/v1/oauth/${segment(name)}`, json: credentials, headers: this.webUiHeaders('X-Awtrix-OAuth'), options });
  }

  /**
   * `POST /api/v1/oauth/{name}/start` - starts a sign-in and resolves with the service's sign-in
   * page. It expires after 10 minutes. The service sends the browser back with `code` and
   * `state`; pass them to {@link finishSignIn} (the device's web UI does that by itself).
   */
  async startSignIn(name: string, options?: RequestOptions): Promise<string> {
    assertAppName(name);
    const body = await this.json<{ url: string }>({
      method: 'POST',
      path: `/api/v1/oauth/${segment(name)}/start`,
      json: {},
      headers: this.webUiHeaders('X-Awtrix-OAuth'),
      options,
    });
    return body.url;
  }

  /**
   * `POST /api/v1/oauth/{name}/code` - finishes a sign-in with what the service sent back.
   * Answers `202`; a moment later `state` turns `signedIn` or `error`.
   */
  async finishSignIn(name: string, code: string, state: string, options?: RequestOptions): Promise<OkResponse> {
    assertAppName(name);
    assertNonEmptyString(code, 'code');
    assertNonEmptyString(state, 'state');
    return this.ok({
      method: 'POST',
      path: `/api/v1/oauth/${segment(name)}/code`,
      json: { code, state },
      headers: this.webUiHeaders('X-Awtrix-OAuth'),
      options,
    });
  }

  /** `DELETE /api/v1/oauth/{name}` - signs out. Client ID and secret stay. */
  async signOut(name: string, options?: RequestOptions): Promise<OkResponse> {
    assertAppName(name);
    return this.ok({ method: 'DELETE', path: `/api/v1/oauth/${segment(name)}`, headers: this.webUiHeaders('X-Awtrix-OAuth'), options });
  }
}

