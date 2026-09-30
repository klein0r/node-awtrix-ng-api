/**
 * Real responses of an Ulanzi TC002 running AWTRIX NG 1.1.5, recorded 2026-09-30
 * (network names and addresses replaced). `satisfies` makes the typecheck fail when the
 * types drift from what the device sends, including unknown fields.
 */
import type { AppInfo, AudioState, Capabilities, DeviceState, DisplayState, GamepadState, MelodyList, Mp3List, Settings, SystemConfig, VoiceState } from '../../src/index.js';

export const device = {
  "version": "1.1.5",
  "uid": "ccc4b277a755",
  "boardType": "tc002",
  "soc": "armv7l",
  "updateImage": "awtrix-ng-tc002.awup",
  "ipAddress": "192.168.1.50",
  "hostname": "awtrixng-77a755",
  "wifiRssi": -33,
  "uptimeSeconds": 212,
  "freeHeapBytes": 14696448,
  "minFreeHeapBytes": 14495744,
  "scriptingRunning": true,
  "scriptHeapPool": "system",
  "scriptHeapBudgetBytes": 4194304,
  "resetReason": "poweron",
  "fps": 42,
  "brightness": 141,
  "batteryPercent": 91,
  "batteryVoltage": 4.14,
  "lowBattery": false,
  "matrixPower": true,
  "currentApp": "Status",
  "indicators": [
    {
      "on": false,
      "color": "#000000",
      "blinkMs": 0,
      "fadeMs": 0
    },
    {
      "on": false,
      "color": "#000000",
      "blinkMs": 0,
      "fadeMs": 0
    },
    {
      "on": false,
      "color": "#000000",
      "blinkMs": 0,
      "fadeMs": 0
    }
  ],
  "messageCount": 0,
  "wifi": {
    "enabled": true,
    "state": "connected",
    "host": "MyWifi",
    "endpoint": "192.168.1.50",
    "attempts": 0,
    "retryInMs": 0,
    "connects": 1,
    "error": null,
    "lastError": null
  },
  "mqtt": {
    "enabled": false,
    "state": "disabled",
    "host": "",
    "endpoint": "",
    "attempts": 0,
    "retryInMs": 0,
    "connects": 0,
    "error": null,
    "lastError": null
  },
  "mirror": {
    "sharing": false,
    "viewers": 0,
    "source": "",
    "state": "off"
  },
  "update": {
    "state": "confirmed",
    "release": "1.1.5-g6e19de7d216f-b88414ca7daa",
    "error": ""
  }
} satisfies DeviceState;

export const settings = {
  "autoBrightness": false,
  "brightness": 141,
  "autoTransition": true,
  "textColor": "#FFFFFF",
  "transitionEffect": "Rain",
  "transitionDirection": "normal",
  "transitionDurationMs": 1000,
  "appDurationMs": 7000,
  "timeMode": 1,
  "clockFace": "sheet",
  "calendarHeaderColor": "#FF0000",
  "calendarTextColor": "#000000",
  "calendarBodyColor": "#FFFFFF",
  "time24h": true,
  "timeLeadingZero": true,
  "timeShowSeconds": false,
  "timeShowAmPm": false,
  "timeSeparatorMode": "pulse",
  "dateOrder": "dayMonthYear",
  "dateSeparator": "dot",
  "dateYearMode": "twoDigit",
  "dateShowWeekday": false,
  "dateMonthNames": false,
  "useCelsius": true,
  "blockNavigation": false,
  "soundEnabled": true,
  "uppercase": true,
  "timeColor": null,
  "dateColor": null,
  "humidityColor": null,
  "temperatureColor": null,
  "batteryColor": null,
  "buzzerVolume": 80,
  "dfplayerVolume": 80,
  "mp3Volume": 90,
  "radioVolume": 71,
  "audioAnalysisSource": "auto",
  "saturation": 100,
  "gamma": 1.899999976,
  "colorCorrection": null,
  "colorTint": null,
  "scroll": {
    "mode": "wrap",
    "direction": "left",
    "entry": "inline",
    "whenFits": "static",
    "speed": 100,
    "gap": 8,
    "holdMs": 1000
  },
  "weekdayBar": {
    "show": true,
    "startOnMonday": true,
    "weekendDays": [
      "sunday",
      "saturday"
    ],
    "activeColor": "#FFFFFF",
    "inactiveColor": "#666666",
    "weekendActiveColor": "#FFFFFF",
    "weekendInactiveColor": "#666666"
  }
} satisfies Settings;

export const display = {
  "power": true,
  "brightness": 141,
  "overlay": null,
  "overlaySettings": {
    "speed": 1,
    "palette": null,
    "blend": true
  },
  "moodlight": null
} satisfies DisplayState;

export const apps = [
  {
    "name": "Status",
    "enabled": true,
    "inLoop": true,
    "slot": 0,
    "present": true,
    "origin": "builtin"
  },
  {
    "name": "mynumber",
    "enabled": true,
    "inLoop": false,
    "slot": 1,
    "present": false,
    "origin": null
  },
  {
    "name": "mygraph",
    "enabled": true,
    "inLoop": false,
    "slot": 2,
    "present": false,
    "origin": null
  },
  {
    "name": "Time",
    "enabled": false,
    "inLoop": false,
    "slot": null,
    "present": true,
    "origin": "builtin"
  }
] satisfies AppInfo[];

export const capabilities = {
  "effects": [
    "BrickBreaker",
    "Checkerboard",
    "ColorWaves",
    "Fade",
    "Fireworks",
    "LookingEyes",
    "Matrix",
    "MovingLine",
    "Pacifica",
    "PingPong",
    "Plasma",
    "PlasmaCloud",
    "Radar",
    "Ripple",
    "Snake",
    "SwirlIn",
    "SwirlOut",
    "TheaterChase",
    "TwinklingStars"
  ],
  "paletteEffects": [
    "BrickBreaker",
    "Checkerboard",
    "ColorWaves",
    "Fade",
    "Fireworks",
    "MovingLine",
    "Pacifica",
    "Plasma",
    "PlasmaCloud",
    "Radar",
    "Ripple",
    "Snake",
    "SwirlIn",
    "SwirlOut",
    "TheaterChase",
    "TwinklingStars"
  ],
  "transitions": [
    "Random",
    "Slide",
    "Dim",
    "Zoom",
    "Rotate",
    "Pixelate",
    "Curtain",
    "Ripple",
    "Blink",
    "Reload",
    "Fade",
    "Cover",
    "Uncover",
    "Split",
    "Blinds",
    "Blocks",
    "Flash",
    "Diamond",
    "Wave",
    "Rain",
    "Melt",
    "Interlace"
  ],
  "overlays": [
    "drizzle",
    "frost",
    "rain",
    "snow",
    "storm",
    "thunder"
  ],
  "palettes": [
    "Cloud",
    "Lava",
    "Ocean",
    "Forest",
    "Stripe",
    "Party",
    "Heat",
    "Rainbow"
  ],
  "audio": {
    "buzzer": true,
    "track": false,
    "mp3": true,
    "radio": true,
    "mixer": true,
    "synth": true,
    "pitch": true,
    "scriptSounds": true
  },
  "scriptUpdates": true,
  "gpio": null,
  "platform": {
    "id": "tc002"
  },
  "sensors": {
    "light": false
  },
  "ble": true,
  "gamepad": true,
  "voice": true,
  "audioInputs": {
    "microphone": true
  },
  "clockFaces": [
    "sheet",
    "ring",
    "flap",
    "month",
    "big"
  ],
  "display": {
    "width": 52,
    "height": 16,
    "configurable": false,
    "requestedWidth": 52,
    "requestedHeight": 16,
    "restartRequired": false,
    "ready": true,
    "minWidth": 52,
    "maxWidth": 52,
    "minHeight": 16,
    "maxHeight": 16,
    "maxPixels": 832
  },
  "fonts": [
    {
      "name": "small",
      "ascent": 6,
      "descent": 1,
      "lineHeight": 7
    },
    {
      "name": "large",
      "ascent": 6,
      "descent": 2,
      "lineHeight": 9
    },
    {
      "name": "matrix-chunky6",
      "ascent": 6,
      "descent": 0,
      "lineHeight": 6
    },
    {
      "name": "matrix-chunky6x",
      "ascent": 6,
      "descent": 0,
      "lineHeight": 6
    },
    {
      "name": "matrix-light6",
      "ascent": 6,
      "descent": 0,
      "lineHeight": 6
    },
    {
      "name": "matrix-light6x",
      "ascent": 6,
      "descent": 0,
      "lineHeight": 6
    },
    {
      "name": "matrix-chunky8",
      "ascent": 8,
      "descent": 0,
      "lineHeight": 8
    },
    {
      "name": "matrix-chunky8x",
      "ascent": 8,
      "descent": 0,
      "lineHeight": 8
    },
    {
      "name": "matrix-chunky8x6",
      "ascent": 8,
      "descent": 0,
      "lineHeight": 8
    },
    {
      "name": "matrix-light8",
      "ascent": 8,
      "descent": 0,
      "lineHeight": 8
    },
    {
      "name": "matrix-light8x",
      "ascent": 8,
      "descent": 0,
      "lineHeight": 8
    },
    {
      "name": "matrix-light8x6",
      "ascent": 8,
      "descent": 0,
      "lineHeight": 8
    }
  ],
  "layouts": {
    "version": 1,
    "limits": {
      "regions": 16,
      "scrollers": 8,
      "assets": 4,
      "chartPoints": 128,
      "textBytes": 8192,
      "preparedBytes": 262144,
      "scriptHandles": 8,
      "scriptHandlesPerScript": 4
    }
  }
} satisfies Capabilities;

export const system = {
  "wifiSsid": "MyWifi",
  "netStatic": false,
  "ip": "",
  "gateway": "",
  "subnet": "",
  "dns1": "",
  "dns2": "",
  "wifiConnectTimeout": 15000,
  "wifiRoamRssi": 0,
  "mqttEnabled": false,
  "mqttHost": "",
  "mqttPort": 1883,
  "mqttUser": "",
  "mqttPrefix": "",
  "haDiscovery": false,
  "haPrefix": "homeassistant",
  "ntpServer": "pool.ntp.org",
  "tz": "CET-1CEST,M3.5.0,M10.5.0/3",
  "tzName": "Europe/Berlin",
  "hostname": "",
  "webPort": 80,
  "authEnabled": false,
  "authUser": "",
  "tempOffset": -9,
  "humOffset": 0,
  "batteryDividerRatio": 1.789999962,
  "lowBatteryThreshold": 0,
  "minBrightness": 10,
  "maxBrightness": 220,
  "ldrFactor": 1,
  "ldrGamma": 2.200000048,
  "ldrOnGround": false,
  "brightnessSmoothing": 10000,
  "swapButtons": false,
  "dfplayer": false,
  "buttonCallback": "",
  "artnet": false,
  "mirrorShare": false,
  "mirrorShareApps": "*",
  "mirrorShareNotifications": true,
  "mirrorFrom": "",
  "mirrorFromApps": "*",
  "mirrorFromNotifications": true,
  "statsInterval": 10000,
  "tempDecimals": 0,
  "debugMode": false,
  "scriptingEnabled": true
} satisfies SystemConfig;

export const audio = {
  "available": true,
  "mp3": {
    "playing": false,
    "name": "",
    "script": ""
  },
  "radio": {
    "playing": false,
    "station": "",
    "title": "",
    "error": "",
    "underruns": 0,
    "decodeUs": 0,
    "starvedMs": 0,
    "bufferBytes": 0
  },
  "stations": [
    {
      "name": "WDR",
      "url": "https://wdr-1live-chillout.icecast.wdr.de/wdr/1live/chillout/mp3/128/stream.mp3"
    }
  ]
} satisfies AudioState;

export const mp3 = {
  "files": [],
  "scripts": [],
  "usedBytes": 2381,
  "totalBytes": 6912333
} satisfies Mp3List;

export const melodies = {
  "melodies": [],
  "usedBytes": 2381,
  "totalBytes": 6912333
} satisfies MelodyList;

export const gamepad = {
  "state": "unpaired",
  "name": "",
  "address": ""
} satisfies GamepadState;

export const voice = {
  "config": {
    "enabled": false,
    "url": "",
    "pipeline": "",
    "tokenSet": false
  },
  "state": "offline",
  "error": "",
  "pipelines": []
} satisfies VoiceState;
