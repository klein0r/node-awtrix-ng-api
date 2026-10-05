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

The types track a specific firmware release, recorded in `src/version.ts` (`AWTRIX_FIRMWARE_VERSION`) and in the README's Compatibility table. When you sync with a newer firmware, update both.

Since firmware 1.2.0 the docs are split per device, and the library covers the union of both:
- TC002: `<docs>/tc002/` (spec `tc002/api/openapi.yaml`, index `tc002/search/search_index.json`, release notes `tc002/releases/`)
- ESP32 (also TC001 and ESP32-S3 DIY): `<docs>/esp32/` (spec `esp32/api/openapi.yaml`, index `esp32/search/search_index.json`, release notes `esp32/releases/`)

`<docs>` is the documentation site of AWTRIX NG (linked from https://github.com/Blueforcer/awtrix-ng). During the closed beta it ran on a temporary domain, so do not hard-code a doc domain anywhere; ask the user for the current one.

**A field that only one kind of device has must be optional in the types.** Examples: `clockFace` and `radioVolume` are TC002 only; `tempOffset`, `webPort` and the pins are ESP32 only. The ESP32 spec leaves out ESP32-S3 features (I²S pins, `pinAmpEnable`, PSRAM fields), but its reference pages still describe them, so they stay. Both devices use the 1.2.0 sound model (`file`/`rtttl`/`track` + `loop`, `stop` groups, `volume`); firmware 1.1.x is not supported for sound, notification sounds, sound settings and the gamepad.

Only fields the documentation describes are typed. A TC002 still sends some ESP32 fields in `/system` (e.g. `tempOffset`, `webPort`); they are optional anyway.

When the docs change:
- Read the release notes first.
- Diff each device's spec against the previous snapshot of the same spec, field by field incl. nested keys, enums and required (a flattening diff, not a name check; that is how `voice.config.device` was found).
- Check required/optional against both specs. The OpenAPI specs are incomplete: payload keys live only on `reference/payload/`, and some routes have at times been only in the route index of `reference/http/`. Compare both separately for each device.
- `test/tc002.test.ts` covers TC002-only routes. `test/fixtures/tc002-1.2.0.ts` holds real TC002 responses checked with `satisfies`. Refresh it from a device when the types change, and replace network names and addresses first.

**Live tests on a real device: never call `device.sleep`, `reboot`, `factoryReset`, `settings.reset`, firmware update or restore.** A TC002 still answers `POST /api/v1/device/sleep` with `200` and restarts its runtime, although its docs do not list the route.

Verified on a real TC002 (1.2.0):
- Every documented sound, gamepad (incl. phone sessions), built-in config, MQTT TLS, OAuth and voice behaviour matched, including the error messages.
- The OAuth and voice write routes answer `403 forbiddenOrigin` unless the request carries `X-Awtrix-OAuth: 1` / `X-Awtrix-Voice: 1` plus an `Origin` naming the device. The docs show exactly this for API clients (`ApiModule.webUiHeaders()`). OAuth checks that the script exists before the origin.
- `textCenter` is not documented. The device still accepts it without checking its type, but it is not typed; `textAlign` replaces it.
- The script source upload accepts `Content-Type: text/plain`. The OpenAPI claim of `415` is wrong.
- Firmware 1.1.x accepted `PUT /api/v1/apps/pushed/next` (a reserved name), and such an app could then not be deleted (`DELETE /api/v1/apps/next` is `405`). 1.2.0 answers `400 invalidName`. Keep the client-side reserved-name check.

The firmware repo (https://github.com/Blueforcer/awtrix-ng) has the docs sources and the firmware code. The doc pages and the OpenAPI spec contradict each other in places. When they do, check the firmware source (`src/core/api/*.cpp`) or a real device. Decisions made that way:
- a script `error` is an object `{message, line?, hook?}` or `null`
- `overlaySettings.blend` is a boolean
- `transitionDirection` is `normal`/`reverse`
- file deletion uses `?path=`
- the settings have 45 keys on a TC002 and 40 on an ESP32 (1.2.0)

## Tests

Tests run against `test/mockServer.ts`, a real local `node:http` server that records requests (method, path, query, headers, raw and JSON body) and answers from a FIFO of queued replies (`reply()`), or a fallback (`replyAlways()`). Prefer this over mocking axios, because it exercises real header, multipart and timeout behaviour.

## Releasing

`npm version <patch|minor|major>` followed by `git push --follow-tags`. The `v*.*.*` tag triggers `.github/workflows/release.yml`, which publishes to npm through trusted publishing (OIDC, no token) and creates a GitHub release. Tags that contain a `-` (e.g. `v0.2.0-beta.1`) are published under the `next` dist-tag and marked as prereleases.
