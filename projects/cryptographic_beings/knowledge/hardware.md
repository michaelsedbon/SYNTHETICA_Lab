# Hardware Inventory

> Last updated: 2026-03-12

## Devices

| ID | Device | MCU | Driver | Connection | IP / Port | Firmware | API |
|----|--------|-----|--------|------------|-----------|----------|-----|
| MOTOR_1 | Bottom Linear Actuator | Arduino Nano | DM556 (24V, NEMA23) | USB Serial `/dev/ttyUSB1` | — | [motor_nano_dm556](firmware/motor_nano_dm556.md) | [machine_controller](api/machine_controller.md) |
| LEVEL_1 | Slewing Bearing Motor | Arduino Nano + ESP8266 | ISD04 (24V, NEMA17 integrated) | WiFi + UART | `172.16.1.115:80` | [level_nano](firmware/level_nano_dm542.md), [level_esp](firmware/level_esp8266.md) | [esp8266_api](api/esp8266_level_motor.md) |
| CAM_1 | Main Camera | ESP32-CAM (AI-Thinker) | — | WiFi | `172.16.1.120:80` | [esp32_cam](firmware/esp32_cam.md) | [cam_api](api/esp32_cam.md) |
| — | LattePanda Alpha | x86 (Intel m3-8100Y) | — | Ethernet | `172.16.1.128` | Ubuntu 24.04 | [machine_controller](api/machine_controller.md) |

## Stepper Drivers

| Driver | Motor Type | Voltage | Current | Microstep | Used By |
|--------|-----------|---------|---------|-----------|---------|
| DM556 | NEMA23 | 24V DC | 5.6A peak | Configurable via DIP | MOTOR_1 |
| ISD04 | NEMA17 (integrated driver + motor) | 24V DC (range: 12–38V) | 1.0A | Built-in | LEVEL_1 |

## Datasheets & Product Links

| Component | Link |
|-----------|------|
| ISD04 Integrated Stepper | [OMC-StepperOnline ISD04-10](https://www.omc-stepperonline.com/fr/nema17-moteur-pas-a-pas-integre-126-ncm-178-4oz-in-w-conduire-isd04-12-38vdc-isd04-10) |
| DM556 Driver | [StepperOnline DM556](https://www.omc-stepperonline.com/digital-stepper-driver-1-0-5-6a-9-42vdc-for-nema-17-23-24-stepper-motor-dm556t) |
| ESP32-CAM (AI-Thinker) | [Espressif ESP32-CAM](https://docs.ai-thinker.com/en/esp32-cam) |
| LattePanda Alpha | [LattePanda Alpha](https://www.lattepanda.com/lattepanda-alpha) |

## Wiring Summary

### MOTOR_1 (Arduino Nano → DM556)

| Nano Pin | Function | DM556 Pin |
|----------|----------|-----------|
| D4 | STEP (PUL+) | PUL+ |
| D2 | DIR (DIR+) | DIR+ |
| D3 | Proximity Sensor | — (NPN NO sensor, LOW when triggered) |
| GND | Common ground | PUL−, DIR− |

### LEVEL_1 (ESP8266 → Arduino Nano → ISD04)

| ESP8266 Pin | Function |
|-------------|----------|
| TX → Nano RX (D0) | Serial commands |
| RX ← Nano TX (D1) | Serial responses |
| D5 (GPIO14) | Nano RESET |

| Nano Pin | Function | ISD04 Pin |
|----------|----------|-----------|
| D4 | STEP (PUL+) | PUL+ |
| D2 | DIR (DIR+) | DIR+ |
| D7 | Hall sensor | — (hall effect, LOW when triggered) |

