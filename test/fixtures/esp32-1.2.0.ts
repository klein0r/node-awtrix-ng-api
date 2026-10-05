/**
 * Real responses of an Ulanzi TC001 (ESP32) running AWTRIX NG 1.2.0, recorded 2026-10-05
 * (network names and addresses replaced). `satisfies` makes the typecheck fail when the
 * types drift from what the device sends, including unknown fields.
 */
import type { AppInfo, AudioState, BuiltinAppConfig, Capabilities, DeviceState, DisplayState, MelodyList, Mp3List, Settings, SystemConfig } from '../../src/index.js';

export const device = {
  "version": "1.2.0",
  "uid": "80646fecd438",
  "boardType": "awtrixng",
  "soc": "esp32",
  "updateImage": "firmware-awtrix-ng.bin",
  "ipAddress": "192.168.1.60",
  "hostname": "awtrixng-ecd438",
  "wifiRssi": -45,
  "uptimeSeconds": 491,
  "freeHeapBytes": 105264,
  "minFreeHeapBytes": 69016,
  "largestFreeBlockBytes": 86004,
  "scriptingRunning": true,
  "scriptHeapPool": "internal",
  "scriptHeapBudgetBytes": 98304,
  "resetReason": "software",
  "fps": 42,
  "brightness": 55,
  "lightLevel": 49.9,
  "ldrRaw": 2042,
  "batteryPercent": 88,
  "batteryVoltage": 4.1,
  "batteryPinMillivolts": 2291,
  "lowBattery": false,
  "temperature": 23.9,
  "humidity": 34.5,
  "matrixPower": true,
  "currentApp": "Date",
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
    "endpoint": "192.168.1.60",
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
  }
} satisfies DeviceState;

export const settings = {
  "autoBrightness": true,
  "brightness": 166,
  "autoTransition": true,
  "textColor": "#FFFFFF",
  "transitionEffect": "Random",
  "transitionDirection": "normal",
  "transitionDurationMs": 1000,
  "appDurationMs": 7000,
  "timeMode": 2,
  "calendarHeaderColor": "#E2671F",
  "calendarTextColor": "#000000",
  "calendarBodyColor": "#FFFFFF",
  "time24h": true,
  "timeLeadingZero": true,
  "timeShowSeconds": true,
  "timeShowAmPm": false,
  "timeSeparatorMode": "pulse",
  "dateOrder": "dayMonthYear",
  "dateSeparator": "dot",
  "dateYearMode": "none",
  "dateShowWeekday": false,
  "dateMonthNames": true,
  "useCelsius": true,
  "blockNavigation": false,
  "uppercase": false,
  "timeColor": null,
  "dateColor": null,
  "humidityColor": null,
  "temperatureColor": null,
  "batteryColor": null,
  "volume": 60,
  "radioVolume": 60,
  "appVolume": 100,
  "alertVolume": 100,
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
    "activeColor": "#E2671F",
    "inactiveColor": "#666666",
    "weekendActiveColor": "#E2671F",
    "weekendInactiveColor": "#666666"
  },
  "dateWeekdayBar": {
    "show": true,
    "startOnMonday": true,
    "weekendDays": [
      "sunday",
      "saturday"
    ],
    "activeColor": "#E2671F",
    "inactiveColor": "#666666",
    "weekendActiveColor": "#E2671F",
    "weekendInactiveColor": "#666666"
  }
} satisfies Settings;

export const display = {
  "power": true,
  "brightness": 55,
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
    "name": "Date",
    "enabled": true,
    "inLoop": true,
    "slot": 0,
    "present": true,
    "origin": "builtin",
    "config": true
  },
  {
    "name": "Battery",
    "enabled": true,
    "inLoop": true,
    "slot": 1,
    "present": true,
    "origin": "builtin",
    "config": true
  },
  {
    "name": "YouTube",
    "enabled": true,
    "inLoop": true,
    "slot": 2,
    "present": true,
    "origin": "script",
    "skipped": false,
    "headless": false,
    "ondemand": false,
    "config": false,
    "error": null,
    "meta": {
      "name": "YouTube",
      "desc": "YouTube subscriber count",
      "author": "Blueforcer",
      "version": "1.2",
      "icons": [],
      "requires": [],
      "needs": [],
      "display": null
    }
  },
  {
    "name": "Nummereins",
    "enabled": true,
    "inLoop": false,
    "slot": 3,
    "present": false,
    "origin": null
  },
  {
    "name": "Time",
    "enabled": false,
    "inLoop": false,
    "slot": null,
    "present": true,
    "origin": "builtin",
    "config": true
  },
  {
    "name": "Temperature",
    "enabled": false,
    "inLoop": false,
    "slot": null,
    "present": true,
    "origin": "builtin",
    "config": true
  },
  {
    "name": "Humidity",
    "enabled": false,
    "inLoop": false,
    "slot": null,
    "present": true,
    "origin": "builtin",
    "config": true
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
    "mp3": false,
    "rtttl": true,
    "song": false,
    "speech": false,
    "track": false,
    "radio": false,
    "url": false,
    "effect": false,
    "clip": false
  },
  "microphone": false,
  "scriptUpdates": true,
  "gpio": {
    "soc": "esp32",
    "label": "ESP32",
    "max": 39,
    "missing": [],
    "inputOnly": [
      [
        34,
        39
      ]
    ],
    "reserved": [
      {
        "lo": 6,
        "hi": 11,
        "why": "the SPI flash"
      }
    ],
    "adc1": [
      [
        32,
        39
      ]
    ],
    "strapping": [
      [
        0,
        0
      ],
      [
        2,
        2
      ],
      [
        5,
        5
      ],
      [
        12,
        12
      ],
      [
        15,
        15
      ]
    ],
    "rtc": [
      [
        0,
        0
      ],
      [
        2,
        2
      ],
      [
        4,
        4
      ],
      [
        12,
        15
      ],
      [
        25,
        27
      ],
      [
        32,
        39
      ]
    ],
    "matrix": [
      2,
      4,
      5,
      13,
      14,
      15,
      16,
      18,
      21,
      25,
      26,
      27,
      32,
      33
    ],
    "defaults": {
      "pinMatrix": 32,
      "pinBtnLeft": 26,
      "pinBtnSelect": 27,
      "pinBtnRight": 14,
      "pinBattery": 34,
      "pinLdr": 35,
      "pinBuzzer": 15,
      "pinI2cSda": 21,
      "pinI2cScl": 22,
      "pinDfRx": 23,
      "pinDfTx": 18,
      "pinI2sBclk": -1,
      "pinI2sLrclk": -1,
      "pinI2sDout": -1,
      "pinI2sMclk": -1,
      "pinAmpEnable": -1
    }
  },
  "platform": {
    "id": "esp32"
  },
  "sensors": {
    "light": true
  },
  "display": {
    "width": 32,
    "height": 8,
    "configurable": true,
    "requestedWidth": 32,
    "requestedHeight": 8,
    "restartRequired": false,
    "ready": true,
    "minWidth": 32,
    "maxWidth": 128,
    "minHeight": 8,
    "maxHeight": 8,
    "maxPixels": 1024,
    "estimatedWireTimeUs": 7680,
    "wireTimeIsEstimate": true
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
      "name": "matrix-light6",
      "ascent": 6,
      "descent": 0,
      "lineHeight": 6
    },
    {
      "name": "matrix-chunky8x6",
      "ascent": 8,
      "descent": 0,
      "lineHeight": 8
    }
  ]
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
  "tempOffset": -15,
  "humOffset": 0,
  "batteryDividerRatio": 1.789999962,
  "lowBatteryThreshold": 0,
  "minBrightness": 10,
  "maxBrightness": 220,
  "ldrFactor": 1,
  "ldrGamma": 2.200000048,
  "ldrOnGround": false,
  "brightnessSmoothing": 10000,
  "panelWidth": 32,
  "panels": 1,
  "panelStart": "topLeft",
  "panelWiring": "rows",
  "panelColorOrder": "grb",
  "panelSerpentine": true,
  "panelChainReverse": false,
  "panelChainSerpentine": false,
  "mirror": false,
  "rotate": false,
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
  "scriptingEnabled": true,
  "pinMatrix": 32,
  "pinBtnLeft": 26,
  "pinBtnSelect": 27,
  "pinBtnRight": 14,
  "pinBattery": 34,
  "pinLdr": 35,
  "pinBuzzer": 15,
  "pinI2cSda": 21,
  "pinI2cScl": 22,
  "pinDfRx": 23,
  "pinDfTx": 18,
  "pinI2sBclk": -1,
  "pinI2sLrclk": -1,
  "pinI2sDout": -1,
  "pinI2sMclk": -1,
  "pinAmpEnable": -1
} satisfies SystemConfig;

export const audio = {
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
  "app": {
    "playing": false,
    "name": "",
    "error": ""
  },
  "alert": {
    "playing": false,
    "name": "",
    "error": ""
  },
  "stations": []
} satisfies AudioState;

export const mp3 = {
  "files": [],
  "scripts": [],
  "usedBytes": 49152,
  "totalBytes": 524288
} satisfies Mp3List;

export const melodies = {
  "melodies": [
    {
      "name": "test",
      "rtttl": "test:d=4,o=5,b=120:c,e,g",
      "bytes": 24,
      "notes": 3,
      "durationMs": 1488,
      "valid": true
    }
  ],
  "usedBytes": 49152,
  "totalBytes": 524288
} satisfies MelodyList;

export const timeConfig = {
  "name": "Time",
  "fields": [
    {
      "key": "timeMode",
      "type": "select",
      "options": [
        0,
        1,
        2,
        3,
        4,
        5,
        6
      ],
      "group": "time",
      "path": [
        "timeMode"
      ],
      "default": 1,
      "value": 2
    },
    {
      "key": "time24h",
      "type": "bool",
      "group": "time",
      "path": [
        "time24h"
      ],
      "default": true,
      "value": true
    },
    {
      "key": "timeLeadingZero",
      "type": "bool",
      "group": "time",
      "path": [
        "timeLeadingZero"
      ],
      "default": true,
      "value": true
    },
    {
      "key": "timeShowSeconds",
      "type": "bool",
      "group": "time",
      "path": [
        "timeShowSeconds"
      ],
      "default": false,
      "value": true
    },
    {
      "key": "timeShowAmPm",
      "type": "bool",
      "group": "time",
      "path": [
        "timeShowAmPm"
      ],
      "default": false,
      "value": false
    },
    {
      "key": "timeSeparatorMode",
      "type": "select",
      "options": [
        "steady",
        "blink",
        "pulse"
      ],
      "group": "time",
      "path": [
        "timeSeparatorMode"
      ],
      "default": "pulse",
      "value": "pulse"
    },
    {
      "key": "timeColor",
      "type": "color",
      "nullable": true,
      "group": "time",
      "path": [
        "timeColor"
      ],
      "default": null,
      "value": null
    },
    {
      "key": "calendarHeaderColor",
      "type": "color",
      "group": "calendar",
      "path": [
        "calendarHeaderColor"
      ],
      "default": 16711680,
      "value": 14837535
    },
    {
      "key": "calendarTextColor",
      "type": "color",
      "group": "calendar",
      "path": [
        "calendarTextColor"
      ],
      "default": 0,
      "value": 0
    },
    {
      "key": "calendarBodyColor",
      "type": "color",
      "group": "calendar",
      "path": [
        "calendarBodyColor"
      ],
      "default": 16777215,
      "value": 16777215
    },
    {
      "key": "weekdayBar.show",
      "type": "bool",
      "group": "weekday",
      "path": [
        "weekdayBar",
        "show"
      ],
      "default": true,
      "value": true
    },
    {
      "key": "weekdayBar.startOnMonday",
      "type": "bool",
      "group": "weekday",
      "path": [
        "weekdayBar",
        "startOnMonday"
      ],
      "default": true,
      "value": true
    },
    {
      "key": "weekdayBar.weekendDays",
      "type": "days",
      "group": "weekday",
      "path": [
        "weekdayBar",
        "weekendDays"
      ],
      "default": [
        "sunday",
        "saturday"
      ],
      "value": [
        "sunday",
        "saturday"
      ]
    },
    {
      "key": "weekdayBar.activeColor",
      "type": "color",
      "group": "weekday",
      "path": [
        "weekdayBar",
        "activeColor"
      ],
      "default": 16777215,
      "value": 14837535
    },
    {
      "key": "weekdayBar.inactiveColor",
      "type": "color",
      "group": "weekday",
      "path": [
        "weekdayBar",
        "inactiveColor"
      ],
      "default": 6710886,
      "value": 6710886
    },
    {
      "key": "weekdayBar.weekendActiveColor",
      "type": "color",
      "group": "weekday",
      "path": [
        "weekdayBar",
        "weekendActiveColor"
      ],
      "default": 16777215,
      "value": 14837535
    },
    {
      "key": "weekdayBar.weekendInactiveColor",
      "type": "color",
      "group": "weekday",
      "path": [
        "weekdayBar",
        "weekendInactiveColor"
      ],
      "default": 6710886,
      "value": 6710886
    }
  ],
  "warnings": []
} satisfies BuiltinAppConfig;
