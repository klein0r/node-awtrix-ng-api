# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

`awtrix-ng-api`: a type-safe TypeScript client for the AWTRIX NG HTTP API v1 (LED matrix clock firmware, https://github.com/Blueforcer/awtrix-ng). axios is the only runtime dependency. It is meant to be consumed by other projects, notably ioBroker adapters (CommonJS), so it ships both CJS and ESM. Requires Node.js >= 22.

## Commands

```bash
npm run typecheck                          # tsc --noEmit over src AND test (test contains compile-time type tests)
npm test                                   # vitest run
npx vitest run test/api.test.ts            # single file
npx vitest run -t "manages melodies"       # single test by name
npm run build                              # clean, then tsc for dist/cjs and dist/esm, then writes a package.json {type} into each
```

`npm run typecheck` is part of the test contract: `test/helpers.test.ts` uses `// @ts-expect-error` to assert that invalid payloads fail to compile. An unused `@ts-expect-error` (the type became too loose) fails the typecheck, not vitest.

TypeScript is pinned to `~5.9`. TypeScript 7 removed `moduleResolution: Node10`, which `tsconfig.cjs.json` relies on.

## Architecture

- `src/http.ts` – `HttpTransport`, the only place that talks to axios. It:
  - sends every request with `validateStatus: () => true` and parses bodies itself (no axios JSON transform), so non-JSON error bodies never break parsing.
  - maps non-2xx answers to `AwtrixApiError`. It reads the device error shape `{"error":{"code","message","field"}}`, plus the odd `{"ok":false,"error":"..."}` from `/api/v1/restore`.
  - maps missing answers to `AwtrixConnectionError`, classified by `kind`.
  - retries `503 serviceBusy` according to `Retry-After` (`retryOnBusy`).
  - sets auth and timeout per request, so a user-supplied `axiosInstance` still gets them.
- `src/api/*.ts` – one class per namespace, each extending `ApiModule` (`base.ts`). `AwtrixClient` (`client.ts`) instantiates all of them on a shared transport. Upload helpers (`toFormData`, `UPLOAD_TIMEOUT`) also live in `base.ts`.
- `src/types/*.ts` – all request and response types, re-exported through `types/index.ts` and `src/index.ts`.
- `src/validation.ts` – client-side argument checks that throw `AwtrixValidationError`.
- `src/errors.ts` – error hierarchy, all extending `AwtrixError`.

## Conventions that are easy to break

- **Every public API method must be `async`.** Validation throws inside the method, so it must surface as a rejected promise, never as a synchronous throw. This is tested explicitly.
- Relative imports in `src` use the `.js` extension. The ESM build needs it.
- Every method takes an optional `options?: RequestOptions` (`signal`, `timeout`) as its last parameter.
- Client-side validation mirrors device rules only where a request can never succeed, or where the firmware would silently corrupt input. Examples: `brightness` for the moodlight and `blinkMs`/`fadeMs` wrap without error on the device, so they are range-checked here. Do not validate stricter than the device: `kelvin` is clamped by the firmware, so it is not checked.
- Bodyless requests explicitly set `'Content-Type': false`. Otherwise axios adds `application/x-www-form-urlencoded`.
- axios returns a `Buffer` (an `ArrayBufferView`), not an `ArrayBuffer`, for `responseType: 'arraybuffer'` in Node. Use `toBytes()` in `http.ts`.
- For a typed-array request body, axios sends `view.buffer`; for a Node.js Buffer that is the whole shared pool. `http.ts` therefore slices raw bytes into an exact `ArrayBuffer`. This is used by `audio.playClip()`.
- Script source upload (`PUT /api/v1/apps/script/{name}`) is raw text, not JSON. The firmware exempts it from the JSON Content-Type gate.
- Names that firmware may extend (effects, transitions, overlays, palettes) use `LooseString<Known>` so that new names are accepted while autocompletion is kept.
- Input and output types differ on purpose: responses have concrete `HexColor` values, while inputs accept `ColorInput` (hex, `[r,g,b]`, `["HSV",h,s,v]`, packed int). See `Settings` vs `SettingsUpdate`.

## API reference sources

The types track a specific firmware release, recorded in `src/version.ts` (`AWTRIX_FIRMWARE_VERSION`) and in the README's Compatibility table. When you sync with a newer firmware, update both, and use the firmware's `RELEASE_NOTES.md` to see what changed.

The `beta-1.1.7` branch targets firmware 1.1.7 (closed beta, Ulanzi TC002). Its docs are at https://ang.blueforcer.de/reference/http/. The raw OpenAPI spec is at https://ang.blueforcer.de/api/openapi.yaml, and plain text of every page is in https://ang.blueforcer.de/search/search_index.json.

Sound, notification sounds, sound settings and the gamepad follow 1.1.7 only, with no fallback to the older format: the user chose to implement only what the beta documents, because the ESP32 firmware is expected to follow. Only fields the documentation describes are typed. Fields a device sends beyond that (on 1.1.7: `gamepad.remote`, `capabilities.gamepadRemote`) are left out, also from the fixtures.

When the docs change, read the release notes first (https://ang.blueforcer.de/releases/), then diff the new spec against the previous one, not just against the code. A name-based check misses nested additions (e.g. `voice.config.device`). The payload keys are not in the OpenAPI spec at all; they live only on `reference/payload/` and must be compared separately (that is how `textAlign` replacing `textCenter` in 1.1.7 was found). Then:
- Compare each schema's keys both ways with the TS interfaces, so removed fields are caught too.
- `test/firmware-beta.test.ts` covers the beta-only routes.
- `test/fixtures/tc002-1.1.7.ts` holds real TC002 responses checked with `satisfies`. Refresh it from a device when the types change, and replace network names and addresses first.

Verified on a real TC002 (1.1.7):
- Every documented sound, gamepad, built-in config and MQTT TLS behaviour matched, including the error messages.
- `POST /api/v1/icons/rename` is documented but answers `404 unknown route` on 1.1.7.
- `textCenter` is no longer documented. The device still accepts it without even checking its type, but it is not typed; `textAlign` replaces it.

Verified on a real TC002 (1.1.5), still relevant:
- The script source upload accepts `Content-Type: text/plain`. The OpenAPI claim of `415` is wrong; `http.md` is right.
- `PUT /api/v1/apps/pushed/next` (a reserved name) was accepted by firmware up to 1.1.5, and such an app could then not be deleted (`DELETE /api/v1/apps/next` is `405`). 1.1.6 fixed this (`400 invalidName`). Keep the client-side reserved-name check for older devices.

The authoritative sources are in the firmware repo: `docs/reference/http.md`, `docs/reference/payload.md`, `docs/reference/settings.md` and `docs/api/openapi.yaml`. They contradict each other in places. When they do, the firmware source (`src/core/api/*.cpp`) was used to decide, and future changes should be checked the same way. Decisions made that way:
- a script `error` is an object `{message, line?, hook?}` or `null`
- `overlaySettings.blend` is a boolean
- `transitionDirection` is `normal`/`reverse`
- file deletion uses `?path=`
- settings have 42 keys

## Tests

Tests run against `test/mockServer.ts`, a real local `node:http` server that records requests (method, path, query, headers, raw and JSON body) and answers from a FIFO of queued replies (`reply()`), or a fallback (`replyAlways()`). Prefer this over mocking axios, because it exercises real header, multipart and timeout behaviour.

## Releasing

`npm version <patch|minor|major>` followed by `git push --follow-tags`. The `v*.*.*` tag triggers `.github/workflows/release.yml`, which publishes to npm through trusted publishing (OIDC, no token) and creates a GitHub release. Tags that contain a `-` (e.g. `v0.2.0-beta.1`) are published under the `next` dist-tag and marked as prereleases.
