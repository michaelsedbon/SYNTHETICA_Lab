# LED-DRV8 — 8-Channel LED Driver Firmware

| Field | Value |
|-------|-------|
| **Device ID** | `LED_DRV8` |
| **MCU** | ESP32-S3-WROOM-1 (dual-core 240 MHz, WiFi, USB-C) |
| **PWM Driver** | PCA9685PW (I²C, 16-ch 12-bit, address 0x40) |
| **Output Drivers** | 8× DRV8870DDAR H-bridge |
| **Function** | UV/Blue light stimulation of mycelium via 8 independently controllable LED channels |
| **Source** | [`experiments/EXP_009/firmware/`](../../../experiments/EXP_009/firmware/) |
| **GitHub** | [EXP_009/firmware](https://github.com/michaelsedbon/SYNTHETICA_Lab/tree/main/experiments/EXP_009/firmware/) |
| **Framework** | PlatformIO + Arduino |

## Pin Map

| ESP32-S3 Pin | Function | Connected To |
|-------------|----------|-------------|
| GPIO6 | I²C SDA | PCA9685 SDA |
| GPIO1 | I²C SCL | PCA9685 SCL |
| USB-C | Serial (CDC) | Debug output 115200 baud |
| — | WiFi STA | MEDICALEX network |

## I²C Bus

| Address | Device |
|---------|--------|
| 0x40 | PCA9685 PWM driver |

## Features

- **WiFi STA** mode with mDNS (`leddriver.local`)
- **ArduinoOTA** on port 3232 (firmware + filesystem)
- **REST API** with CORS enabled (12 endpoints)
- **LittleFS** dashboard served from flash
- **5 Patterns:** constant, pulse, blink, fade, sweep
- **Master brightness** control (0–100%)
- **Heartbeat** ping to dev machine every 15s
- **WiFi log** ring buffer (50 lines, accessible via API)
- **Debug tools:** I²C bus scanner, PCA9685 register dump, GPIO pin scanner

## Communication Protocol

The PCA9685 runs at 1 kHz PWM. Each output channel uses 2 PCA9685 LED channels (IN1 for PWM, IN2 held LOW for unidirectional LED driving):

```
Channel 0 → PCA9685 LED0 (IN1=PWM), LED1 (IN2=0)
Channel 1 → PCA9685 LED2 (IN1=PWM), LED3 (IN2=0)
...
Channel 7 → PCA9685 LED14 (IN1=PWM), LED15 (IN2=0)
```

PWM range: 0–4095 (12-bit). Values scaled by master brightness before output.

## Pattern Engine

| Pattern | Behavior |
|---------|----------|
| `pulse` | Sine wave on all channels simultaneously |
| `blink` | Square wave toggle (ON/OFF) |
| `fade` | Sawtooth ramp up then reset |
| `sweep` | One channel at a time, sequential |

Speed (0–100) maps to tick interval: 100ms (slow) → 5ms (fast).

## WiFi Fallback

If STA connection fails after 20s, the board starts AP mode:
- SSID: `LED-Driver-Setup`
- Password: `12345678`

## Build & Flash

### First flash (USB)

```bash
cd experiments/EXP_009/firmware
pio run -e usb -t upload       # Flash firmware
pio run -e usb -t uploadfs     # Flash LittleFS dashboard
```

USB port: `/dev/cu.usbmodem*`

### OTA update (wireless)

```bash
cd experiments/EXP_009/firmware
pio run -e ota -t upload       # Flash firmware
pio run -e ota -t uploadfs     # Flash dashboard
```

Requires board to be on MEDICALEX WiFi. OTA port: 3232.

### Dependencies

```ini
lib_deps =
    adafruit/Adafruit PWM Servo Driver Library@^3.0.2
    bblanchon/ArduinoJson@^7.0.0
    esp32async/ESPAsyncWebServer@^3.10.0
```

## Serial Monitor

```bash
pio device monitor -e usb
```

Heartbeat output every 15s: `[HB] uptime=XXXs WiFi=OK IP=172.16.1.126 RSSI=-XX pat=none`
