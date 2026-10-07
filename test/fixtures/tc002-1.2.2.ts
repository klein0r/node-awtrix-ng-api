/**
 * Real responses of an Ulanzi TC002 running AWTRIX NG 1.2.2, recorded 2026-10-07
 * (network names, addresses and device IDs replaced). `satisfies` makes the typecheck fail
 * when the types drift from what the device sends, including unknown fields.
 */
import type { AppInfo, AudioState, BuiltinAppConfig, Capabilities, DeviceState, DisplayState, GamepadState, MelodyList, Mp3List, MqttTlsState, OAuthList, Settings, SystemConfig, VoiceState } from '../../src/index.js';

export const device = {
  "version": "1.2.2",
  "uid": "a4cf120b3c7d",
  "boardType": "tc002",
  "soc": "armv7l",
  "updateImage": "awtrix-ng-tc002.awup",
  "ipAddress": "192.168.1.50",
  "macAddress": "A4:CF:12:0B:3C:7D",
  "hostname": "awtrixng-0b3c7d",
  "wifiRssi": -40,
  "uptimeSeconds": 266,
  "freeHeapBytes": 13467648,
  "minFreeHeapBytes": 13422592,
  "scriptingRunning": true,
  "scriptHeapPool": "system",
  "scriptHeapBudgetBytes": 4194304,
  "resetReason": "poweron",
  "fps": 42,
  "brightness": 140,
  "batteryPercent": 0,
  "batteryVoltage": 0,
  "lowBattery": false,
  "matrixPower": true,
  "currentApp": "plasma",
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
    "enabled": true,
    "state": "connected",
    "host": "192.168.1.10",
    "endpoint": "192.168.1.10:1883",
    "attempts": 0,
    "retryInMs": 0,
    "connects": 1,
    "error": null,
    "lastError": "noWifi"
  },
  "mirror": {
    "sharing": false,
    "viewers": 0,
    "source": "",
    "state": "off"
  },
  "usbPower": true,
  "update": {
    "state": "confirmed",
    "release": "1.2.2-ga02f3ab66cd8-c701ad018299",
    "error": ""
  }
} satisfies DeviceState;

export const settings = {
  "autoBrightness": false,
  "brightness": 140,
  "autoTransition": true,
  "textColor": "#FFFFFF",
  "transitionEffect": "Rain",
  "transitionDirection": "normal",
  "transitionDurationMs": 1000,
  "appDurationMs": 7000,
  "timeMode": 1,
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
  "uppercase": true,
  "timeColor": null,
  "dateColor": null,
  "humidityColor": null,
  "temperatureColor": null,
  "batteryColor": null,
  "volume": 100,
  "radioVolume": 65,
  "appVolume": 100,
  "alertVolume": 100,
  "saturation": 100,
  "gamma": 1.899999976,
  "colorCorrection": null,
  "colorTint": null,
  "clockFace": "sheet",
  "musicSource": "auto",
  "calendarAnimation": true,
  "bootSound": false,
  "enlargeApps": true,
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
  },
  "dateWeekdayBar": {
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
  "brightness": 140,
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
    "name": "plasma",
    "enabled": true,
    "inLoop": true,
    "slot": 0,
    "present": true,
    "origin": "script",
    "skipped": false,
    "headless": false,
    "ondemand": false,
    "config": false,
    "error": null,
    "meta": {
      "name": "Plasma",
      "desc": "Classic rolling rainbow plasma, every pixel alive and shifting.",
      "author": "Stipple",
      "version": "1.0",
      "icons": [],
      "requires": [],
      "needs": [],
      "display": {
        "width": 52,
        "height": 16,
        "fits": true
      }
    }
  },
  {
    "name": "pvpower",
    "enabled": true,
    "inLoop": false,
    "slot": 1,
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
    "name": "Status",
    "enabled": false,
    "inLoop": false,
    "slot": null,
    "present": true,
    "origin": "builtin",
    "config": false
  },
  {
    "name": "flappy",
    "enabled": false,
    "inLoop": false,
    "slot": null,
    "present": true,
    "origin": "script",
    "skipped": false,
    "headless": false,
    "ondemand": false,
    "config": true,
    "error": null,
    "meta": {
      "name": "Flappy Pixel",
      "desc": "One-button Flappy on the full panel: several pipes at once, a parallax skyline, a live score and a bird that actually flaps",
      "author": "Galadril",
      "version": "2.1",
      "icons": [],
      "requires": [],
      "needs": [
        {
          "name": "audio.song",
          "missing": false
        },
        {
          "name": "audio.effect",
          "missing": false
        }
      ],
      "display": {
        "width": 52,
        "height": 16,
        "fits": true
      }
    }
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
    "mp3": true,
    "rtttl": true,
    "song": true,
    "speech": true,
    "track": false,
    "radio": true,
    "url": true,
    "effect": true,
    "clip": true
  },
  "microphone": true,
  "scriptUpdates": true,
  "gpio": null,
  "platform": {
    "id": "tc002"
  },
  "sensors": {
    "light": false
  },
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
  "ble": true,
  "gamepad": true,
  "oauth": true,
  "crypto": true,
  "tcp": true,
  "layout": true,
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
  },
  "gamepadRemote": true,
  "voice": true,
  "clockFaces": [
    "sheet",
    "ring",
    "flap",
    "month",
    "big"
  ],
  "mqttTls": true,
  "bootSound": true,
  "enlargeApps": true
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
  "mqttEnabled": true,
  "mqttHost": "192.168.1.10",
  "mqttPort": 1883,
  "mqttUser": "mqtt-user",
  "mqttPrefix": "awtrixng1",
  "haDiscovery": true,
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
  "scriptingEnabled": true,
  "mqttTls": false,
  "mqttTlsPin": ""
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
  "stations": [
    {
      "name": "WDRa",
      "url": "https://wdr-1live-chillout.icecast.wdr.de/wdr/1live/chillout/mp3/128/stream.mp3"
    }
  ]
} satisfies AudioState;

export const mp3 = {
  "files": [
    {
      "name": "shine_ding.mp3",
      "size": 56562
    }
  ],
  "scripts": [],
  "usedBytes": 75337,
  "totalBytes": 6895177
} satisfies Mp3List;

export const melodies = {
  "melodies": [
    {
      "name": "hihi",
      "rtttl": "hihi:d=4,o=5,b=120:c,e,g",
      "bytes": 24,
      "notes": 3,
      "durationMs": 1488,
      "valid": true
    }
  ],
  "usedBytes": 75337,
  "totalBytes": 6895177
} satisfies MelodyList;

export const gamepad = {
  "devices": [
    {
      "id": 1,
      "state": "unpaired",
      "name": "",
      "address": "",
      "player": null
    },
    {
      "id": 2,
      "state": "unpaired",
      "name": "",
      "address": "",
      "player": null
    }
  ],
  "remotes": []
} satisfies GamepadState;

export const voice = {
  "config": {
    "enabled": true,
    "url": "http://192.168.1.10:8123",
    "pipeline": "",
    "device": "",
    "tokenSet": true
  },
  "state": "ready",
  "error": "",
  "pipelines": [
    {
      "conversation_engine": "conversation.home_assistant",
      "conversation_language": "en",
      "language": "en",
      "name": "Home Assistant",
      "stt_engine": null,
      "stt_language": null,
      "tts_engine": "tts.home_assistant_cloud",
      "tts_language": "en-US",
      "tts_voice": "JennyNeural",
      "wake_word_entity": null,
      "wake_word_id": null,
      "prefer_local_intents": false,
      "id": "01j4rtkj9h20gxge71fm3ydd1k"
    },
    {
      "conversation_engine": "conversation.home_assistant",
      "conversation_language": "de",
      "language": "de",
      "name": "Home Assistant Cloud",
      "stt_engine": "stt.home_assistant_cloud",
      "stt_language": "de-DE",
      "tts_engine": "tts.home_assistant_cloud",
      "tts_language": "de-DE",
      "tts_voice": "KatjaNeural",
      "wake_word_entity": null,
      "wake_word_id": null,
      "prefer_local_intents": false,
      "id": "01j6cg58tcnw52b1tq9yfm6w7w"
    },
    {
      "conversation_engine": "conversation.chatgpt",
      "conversation_language": "*",
      "language": "de",
      "name": "OpenAI",
      "stt_engine": "stt.home_assistant_cloud",
      "stt_language": "de-DE",
      "tts_engine": "tts.home_assistant_cloud",
      "tts_language": "de-DE",
      "tts_voice": "KatjaNeural",
      "wake_word_entity": null,
      "wake_word_id": null,
      "prefer_local_intents": true,
      "id": "01jjsac37wdt7hf03184xxydc8"
    }
  ]
} satisfies VoiceState;

export const mqttTls = {
  "ca": "public",
  "pending": null
} satisfies MqttTlsState;

export const oauth = {
  "redirectUri": "https://awtrix.de/oauth/callback",
  "apps": []
} satisfies OAuthList;

export const timeConfig = {
  "name": "Time",
  "fields": [
    {
      "key": "clockFace",
      "type": "select",
      "options": [
        "sheet",
        "ring",
        "flap",
        "month",
        "big"
      ],
      "group": "time",
      "path": [
        "clockFace"
      ],
      "default": "sheet",
      "value": "sheet"
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
      "value": 16711680
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
      "key": "calendarAnimation",
      "type": "bool",
      "group": "calendar",
      "path": [
        "calendarAnimation"
      ],
      "default": true,
      "value": true
    },
    {
      "key": "dateOrder",
      "type": "select",
      "options": [
        "dayMonthYear",
        "monthDayYear",
        "yearMonthDay"
      ],
      "group": "calendar",
      "path": [
        "dateOrder"
      ],
      "default": "dayMonthYear",
      "value": "dayMonthYear"
    },
    {
      "key": "dateSeparator",
      "type": "select",
      "options": [
        "dot",
        "slash",
        "dash"
      ],
      "group": "calendar",
      "path": [
        "dateSeparator"
      ],
      "default": "dot",
      "value": "dot"
    },
    {
      "key": "dateYearMode",
      "type": "select",
      "options": [
        "none",
        "twoDigit",
        "fourDigit"
      ],
      "group": "calendar",
      "path": [
        "dateYearMode"
      ],
      "default": "twoDigit",
      "value": "twoDigit"
    },
    {
      "key": "dateMonthNames",
      "type": "bool",
      "group": "calendar",
      "path": [
        "dateMonthNames"
      ],
      "default": false,
      "value": false
    },
    {
      "key": "dateColor",
      "type": "color",
      "nullable": true,
      "group": "calendar",
      "path": [
        "dateColor"
      ],
      "default": null,
      "value": null
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
      "value": 16777215
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
      "value": 16777215
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
