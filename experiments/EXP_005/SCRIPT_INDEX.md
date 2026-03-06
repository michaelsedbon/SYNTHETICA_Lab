# EXP_005 — Script & File Index

Index of all scripts, firmware, data files, and generated artifacts.

---

## Firmware

| Directory | Description |
|-----------|-------------|
| `firmware/esp8266_ota/` | ESP8266 WiFi controller — OTA, REST API, web dashboard, serial bridge |
| `firmware/arduino_nano/` | Arduino Nano motor controller — AccelStepper, calibration, serial commands |

## Scripts

| Script | Description |
|--------|-------------|
| `firmware/flash_nano.py` | Remote Nano flasher via ESP TCP bridge (STK500v1 over WiFi) |
| `firmware/flash_nano_usb.py` | USB fallback Nano flasher |
| `firmware/calibrate_rotation.py` | Automated motor calibration via HTTP API |

## Documentation

| File | Description |
|------|-------------|
| `firmware/README.md` | Architecture, API reference, pin assignments, troubleshooting |
