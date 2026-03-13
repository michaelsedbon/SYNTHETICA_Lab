# LEVEL_1 — ESP8266 WiFi Bridge Firmware

| Field | Value |
|-------|-------|
| **Device ID** | `LEVEL_1` (ESP side) |
| **MCU** | ESP8266 (NodeMCU / Wemos D1 Mini) |
| **Hostname** | `cryptobeings` |
| **IP** | `172.16.1.115` |
| **Source** | [`experiments/EXP_005/firmware/esp8266_ota/`](../../experiments/EXP_005/firmware/esp8266_ota/) |
| **GitHub** | [esp8266_ota](https://github.com/michaelsedbon/SYNTHETICA_Lab/tree/main/experiments/EXP_005/firmware/esp8266_ota/) |

## Purpose

Bridges WiFi to the Arduino Nano's serial port. Provides:
- **REST API** on port 80 for motor control
- **Web dashboard** for manual operation
- **TCP bridge** on port 2323 for remote Nano firmware flashing
- **OTA updates** on port 8266

## Wiring

| ESP8266 Pin | Function |
|-------------|----------|
| TX → Nano D0 (RX) | Serial commands to Nano |
| RX ← Nano D1 (TX) | Serial responses from Nano |
| D5 (GPIO14) | Nano RESET (pull LOW to reset) |

## WiFi Config

| Parameter | Value |
|-----------|-------|
| SSID | `MEDICALEX` |
| Hostname | `cryptobeings` |
| mDNS | `cryptobeings.local` |
| OTA port | 8266 |

## HTTP API

See [ESP8266 Level Motor API](../api/esp8266_level_motor.md) for full endpoint documentation.

Quick reference:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Web dashboard |
| `/api/ping` | GET | Nano health check |
| `/api/status` | GET | Full motor status (JSON) |
| `/api/send?cmd=X` | GET | Send arbitrary command |
| `/api/move?steps=N` | GET | Relative move |
| `/api/home` | GET | Home to sensor |
| `/api/stop` | GET | Emergency stop |
| `/api/calibrate` | GET | Full calibration |
| `/api/half` | GET | Move to half revolution |
| `/api/speed?value=N` | GET | Set speed |
| `/api/accel?value=N` | GET | Set acceleration |
| `/api/log` | GET | Command log (last 40) |
| `/reset-nano` | GET | Reset Nano via GPIO14 |

## Build & Flash

```bash
# OTA update (over WiFi — no physical access needed)
cd experiments/EXP_005/firmware/esp8266_ota
pio run --target upload --upload-port 172.16.1.115

# First-time USB flash
pio run --target upload --upload-port /dev/ttyUSBx
```

**PlatformIO config:** board: `nodemcuv2`, framework: `arduino`, libs: `ESP8266WiFi`, `ESP8266mDNS`, `ArduinoOTA`, `ESP8266WebServer`

## Changelog

| Date | Change | Experiment |
|------|--------|-----------|
| 2026-03-04 | Initial version with REST API, dashboard, OTA, TCP bridge | EXP_005 |
