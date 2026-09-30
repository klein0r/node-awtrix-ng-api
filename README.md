# Awtrix NG - node API

Type-safe Node.js client for the [AWTRIX NG](https://github.com/Blueforcer/awtrix-ng) HTTP API v1, written in TypeScript on top of [axios](https://axios-http.com/).

- Covers every documented route of the [HTTP API reference](https://blueforcer.github.io/awtrix-ng/reference/http/)
- Full type definitions for all payloads, responses and optional parameters
- One error model: device errors, connection problems and invalid arguments are distinct classes
- Client-side checks where the firmware would silently wrap values or a request can never succeed
- Ships CommonJS and ES modules, so it works in ioBroker adapters as well as ESM projects

Requires Node.js 22 or newer.

## Compatibility

| | Version |
|---|---|
| AWTRIX NG HTTP API | v1 |
| AWTRIX NG firmware | built against 1.1.4 (closed beta, incl. Ulanzi TC002); compatible with [1.1.2](https://github.com/Blueforcer/awtrix-ng/releases/tag/v1.1.2) |

Older 1.x firmware works for everything it already supports. Response fields added in 1.1.4 are typed as optional, and `radioMeta` (removed in 1.1.4) is kept as a deprecated optional setting. Fields and routes a device does not know yet are rejected by it with `422` or `404`.

Added in 1.1.4:

- Region layouts: the `layout` key in pushed apps and notifications, as an alternative to the classic keys
- Icons as data URLs (`data:image/gif;base64,...`) instead of plain base64; fonts from `capabilities.fonts`
- Script data (`scripts.getData`/`updateData`) and a script's own sounds (`scripts.listSounds`, `uploadSound`, ...)
- Audio sources `sfx`, `loop`, `song` and `fx` (mixer and synthesizer on the TC002), stop scope `loop`
- Bluetooth gamepad (`gamepad`) and Home Assistant Voice status (`voice`) on the TC002
- Settings `clockFace` and `audioAnalysisSource`, system `panelHeight` and display mirroring
- TC002 firmware packages (`.awup`) via `system.updateFirmware`

Changing the Home Assistant Voice settings is not offered: the firmware accepts that only from the device's own web page.

You can read the versions at runtime:

```ts
import { AWTRIX_FIRMWARE_VERSION } from 'awtrix-ng-api';

const deviceVersion = await awtrix.device.version(); // e.g. "1.1.2"
console.log(`device runs ${deviceVersion}, client built against ${AWTRIX_FIRMWARE_VERSION}`);
```

## Installation

```bash
npm install awtrix-ng-api
```

## Quick start

```ts
import { AwtrixClient } from 'awtrix-ng-api';

const awtrix = new AwtrixClient({ host: '192.168.1.50' });

const device = await awtrix.device.get();
console.log(device.version, device.currentApp);

await awtrix.notifications.send({
  text: 'Doorbell',
  icon: '1234',
  textColor: '#FF0000',
  hold: true,
  soundRtttl: 'd:d=4,o=5,b=120:c,e,g',
});
```

CommonJS (e.g. an ioBroker adapter):

```js
const { AwtrixClient } = require('awtrix-ng-api');
```

### Options

```ts
new AwtrixClient({
  host: 'awtrixng-a1b2c3.local', // also "192.168.1.50:8080" or "http://..."
  port: 80,                      // optional, overrides a port in host
  protocol: 'http',              // used when host has no protocol
  auth: { username: 'admin', password: 'secret' }, // when authEnabled is on
  timeout: 5000,                 // ms per request, 0 = none
  retryOnBusy: 1,                // retries of 503 serviceBusy, honouring Retry-After
  headers: {},                   // extra headers for every request
  axiosInstance: undefined,      // bring your own axios instance (interceptors, proxy ...)
});
```

`new AwtrixClient('192.168.1.50')` is a shorthand for `{ host }`.

Every method accepts `{ signal, timeout }` as its last argument, so a request can be aborted (for example in an adapter's `onUnload`) or given its own timeout:

```ts
const controller = new AbortController();
await awtrix.device.get({ signal: controller.signal, timeout: 2000 });
```

## API

The client groups the routes into namespaces. All methods return promises.

| Namespace | Methods | Routes |
|---|---|---|
| `device` | `get`, `version`, `capabilities`, `reboot`, `sleep`, `factoryReset`, `ping`, `waitForOnline` | `/api/v1/device`, `/api/v1/version`, `/api/v1/capabilities`, `/version` |
| `settings` | `get`, `update`, `setBrightness`, `reset` | `/api/v1/settings` |
| `display` | `get`, `update`, `setPower`, `setOverlay`, `clearOverlay`, `setMoodlight`, `disableMoodlight`, `getScreen` | `/api/v1/display` |
| `apps` | `list`, `switchTo`, `next`, `previous`, `setOrder`, `disable`, `push`, `delete` | `/api/v1/apps` |
| `scripts` | `getSource`, `install`, `updateIfUnchanged`, `delete`, `getConfig`, `updateConfig`, `getData`, `updateData`, `listSounds`, `uploadSound`, `deleteSound`, `deleteAllSounds`, `getShared` | `/api/v1/apps/script`, `/api/v1/apps/{name}/config`, `/api/v1/apps/{name}/data`, `/api/v1/scripts/shared` |
| `notifications` | `send`, `dismiss`, `dismissByName` | `/api/v1/notifications` |
| `indicators` | `set`, `clear` | `/api/v1/indicators/{1-3}` |
| `audio` | `getState`, `play`, `playSound`, `playRtttl`, `playStation`, `playUrl`, `playSfx`, `playLoop`, `playSong`, `playFx`, `stop`, `listMelodies`, `saveMelody`, `deleteMelody`, `listMp3`, `uploadMp3`, `deleteMp3`, `getStations`, `setStations` | `/api/v1/audio` |
| `system` | `get`, `getWithSecrets`, `update`, `scanWifi`, `waitForWifiScan`, `getLogs`, `updateFirmware`, `restoreBackup` | `/api/v1/system`, `/api/v1/logs`, `/update`, `/api/v1/restore` |
| `files` | `list`, `upload`, `uploadIcon`, `delete`, `download`, `listIconOrigins`, `setIconOrigin`, `deleteIconOrigin` | `/api/v1/files`, `/api/v1/icons/origins`, static assets |
| `gamepad` | `get`, `pair`, `forget` | `/api/v1/gamepad` (TC002) |
| `voice` | `get` | `/api/v1/voice` (TC002) |

### Examples

Pushed apps, including an array that creates `stocks0`, `stocks1`:

```ts
import { Draw } from 'awtrix-ng-api';

await awtrix.apps.push('weather', {
  text: [{ text: 'Temp ', color: '#888888' }, { text: '21.5°', color: [0, 170, 255] }],
  icon: '2422',
  scroll: { mode: 'bounce', speed: 80 },
  lifetimeMs: 600_000,
  lifetimeExpiry: 'mark',
});

await awtrix.apps.push('stocks', [{ text: 'AAPL 189' }, { text: 'MSFT 402' }]);

await awtrix.apps.push('art', {
  draw: [Draw.rect(0, 0, 32, 8, '#202020'), Draw.circleFill(4, 4, 2, '#F00'), Draw.text(9, 1, 'HI')],
});

await awtrix.apps.delete('weather');
```

Settings, display and indicators:

```ts
const settings = await awtrix.settings.update({
  brightness: 80,
  transitionEffect: 'Fade',
  timeColor: null, // inherit textColor
  weekdayBar: { weekendDays: ['friday', 'saturday'] },
});

await awtrix.display.setMoodlight({ kelvin: 2700, brightness: 90 });
await awtrix.display.setOverlay('snow', { speed: 2 });
await awtrix.indicators.set(1, { color: '#FF0000', blinkMs: 500 });
```

Audio - `play()` accepts exactly one source, enforced by the type system:

```ts
await awtrix.audio.play({ rtttl: 'beep:d=4,o=5,b=120:c,e,g' });
await awtrix.audio.play({ station: 'SWR3' });
await awtrix.audio.stop('stream');
```

Scripts - a script that does not compile still installs, so check `error`:

```ts
const result = await awtrix.scripts.install('clock', source);
if (result.error) console.warn(`line ${result.error.line}: ${result.error.message}`);
```

Uploads accept a `Buffer`, `Uint8Array`, `ArrayBuffer` or `Blob`:

```ts
import { readFile } from 'node:fs/promises';

await awtrix.files.uploadIcon('1234.gif', await readFile('1234.gif'));
await awtrix.system.updateFirmware(await readFile('firmware-awtrix-ng.bin'));
await awtrix.device.waitForOnline({ timeoutMs: 120_000 });
```

## Error handling

All errors extend `AwtrixError`. Validation problems are reported as rejected promises too, never as synchronous throws.

| Class | When | Useful properties |
|---|---|---|
| `AwtrixApiError` | The device answered with a non-2xx status | `status`, `code`, `field`, `deviceMessage`, `retryAfterMs`, `isNotFound`, `isValidationError`, `isBusy`, ... |
| `AwtrixConnectionError` | No answer: timeout, refused, DNS, reset, aborted | `kind`, `code`, `isTimeout` |
| `AwtrixValidationError` | An argument was refused before sending | `field` |
| `AwtrixResponseError` | The device sent a body that could not be parsed | `status`, `body` |

```ts
import { AwtrixApiError, AwtrixConnectionError } from 'awtrix-ng-api';

try {
  await awtrix.settings.update({ transitionEffect: 'Wobble' });
} catch (error) {
  if (error instanceof AwtrixApiError && error.isValidationError) {
    console.log(`Rejected field ${error.field}: ${error.deviceMessage}`);
  } else if (error instanceof AwtrixConnectionError) {
    console.log(`Device unreachable (${error.kind})`);
  } else {
    throw error;
  }
}
```

A `503 serviceBusy` answer is retried automatically (`retryOnBusy`, default `1`) after the delay from the `Retry-After` header.

## Types and helpers

Every request and response type is exported, for example `AppPayload`, `NotificationPayload`, `Settings`, `SettingsUpdate`, `DeviceState`, `AppInfo` (a union discriminated by `origin`), `ScriptConfigField` (discriminated by `type`) and `SystemConfig`. The known effect, transition, overlay and palette names are exported as constants (`EFFECTS`, `TRANSITIONS`, `OVERLAYS`, `PALETTES`); the name types still accept any string, because newer firmware may add names. Use `awtrix.device.capabilities()` to get the list a device actually supports.

Color helpers: `rgb()`, `hsv()`, `packColor()`, `unpackColor()`, `toHexColor()`, `parseHexColor()`. `Draw` builds the commands of a payload's `draw` array.

## Development

```bash
npm install
npm run typecheck
npm test
npm run build
```

## License

MIT License

Copyright (c) 2026 Matthias Kleine <info@haus-automatisierung.com>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.