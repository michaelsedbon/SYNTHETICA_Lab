# ESP32-CAM API

| Field | Value |
|-------|-------|
| **Base URL** | `http://172.16.1.120` |
| **Device** | ESP32-CAM (AI-Thinker) |
| **Source** | [`experiments/EXP_005/firmware/esp32_cam_test/src/main.cpp`](../../experiments/EXP_005/firmware/esp32_cam_test/src/main.cpp) |
| **GitHub** | [esp32_cam_test](https://github.com/michaelsedbon/SYNTHETICA_Lab/tree/main/experiments/EXP_005/firmware/esp32_cam_test/) |

## Overview

Minimal camera HTTP server using `esp_http_server` (async, multi-client capable). Provides snapshot capture and live MJPEG streaming.

## Endpoints

### `GET /` (Port 80)
Web UI with embedded live stream viewer.

### `GET /capture` (Port 80)
Returns a single JPEG snapshot.

**Content-Type:** `image/jpeg`

```bash
# Save a snapshot
curl -o snapshot.jpg http://172.16.1.120/capture

# Use in Python
import requests
img = requests.get("http://172.16.1.120/capture").content
```

### `GET /stream` (Port 81)
MJPEG live video stream.

**Content-Type:** `multipart/x-mixed-replace;boundary=123456789000000000000987654321`

```bash
# View in browser
open http://172.16.1.120:81/stream

# Embed in HTML
<img src="http://172.16.1.120:81/stream" />

# OpenCV capture
import cv2
cap = cv2.VideoCapture("http://172.16.1.120:81/stream")
```

## Camera Settings

| Setting | Value |
|---------|-------|
| Resolution | VGA (640×480) |
| JPEG quality | 10 |
| Frame buffers | 2 |
| Pixel format | JPEG |

## Integration with Machine Controller

The Machine Controller dashboard embeds the camera stream directly via `<img>` tag. The camera operates independently — no serial communication or coordination with other devices.
