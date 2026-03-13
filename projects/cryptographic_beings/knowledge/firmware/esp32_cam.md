# CAM_1 — ESP32-CAM Firmware

| Field | Value |
|-------|-------|
| **Device ID** | `CAM_1` |
| **MCU** | ESP32-CAM (AI-Thinker module) |
| **Camera sensor** | OV2640 |
| **IP** | `172.16.1.120` |
| **Source** | [`experiments/EXP_005/firmware/esp32_cam_test/`](../../experiments/EXP_005/firmware/esp32_cam_test/) |
| **GitHub** | [esp32_cam_test](https://github.com/michaelsedbon/SYNTHETICA_Lab/tree/main/experiments/EXP_005/firmware/esp32_cam_test/) |

## Pin Map (AI-Thinker)

| Pin | GPIO | Function |
|-----|------|----------|
| PWDN | 32 | Power down |
| XCLK | 0 | Clock |
| SIOD/SIOC | 26/27 | I²C (SCCB) |
| Y2–Y9 | 5,18,19,21,36,39,34,35 | Data bus |
| VSYNC | 25 | Vertical sync |
| HREF | 23 | Horizontal ref |
| PCLK | 22 | Pixel clock |
| Flash LED | 4 | White LED |

## HTTP API

See [ESP32-CAM API](../api/esp32_cam.md) for full endpoint documentation.

| Endpoint | Port | Description |
|----------|------|-------------|
| `/` | 80 | Web UI with embedded stream |
| `/capture` | 80 | Single JPEG snapshot |
| `/stream` | 81 | MJPEG live stream |

## Camera Config

| Parameter | Value |
|-----------|-------|
| Resolution | VGA (640×480) default |
| JPEG quality | 10 (higher = worse quality) |
| Frame size | `FRAMESIZE_VGA` |
| Pixel format | JPEG |
| Frame buffers | 2 (PSRAM available) |

## WiFi Config

| Parameter | Value |
|-----------|-------|
| SSID | `MEDICALEX` |
| Static IP | `172.16.1.120` |

## Build & Flash

```bash
# USB flash (requires FTDI adapter — no OTA on this firmware)
cd experiments/EXP_005/firmware/esp32_cam_test
pio run --target upload --upload-port /dev/ttyUSBx

# NOTE: ESP32-CAM requires GPIO0 held LOW during reset to enter flash mode
```

**PlatformIO config:** board: `esp32cam`, framework: `arduino`

## Changelog

| Date | Change | Experiment |
|------|--------|-----------|
| 2026-03-04 | Initial camera server with capture + MJPEG stream | EXP_005 |
