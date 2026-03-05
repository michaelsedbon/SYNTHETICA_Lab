# Camera Capture — ESP32-CAM

Capture images from the lab using the ESP32-CAM module.
The camera is at `http://172.16.1.120` on the local network.

## When to use
- Taking a photo of the experiment setup
- Visual inspection of algae tubes
- Documenting machine state before/after operations
- Time-lapse image sequences

---

## Tools

| Tool | Description |
|------|-------------|
| `camera_capture(filename)` | Capture JPEG and save to `experiments/EXP_002/captures/`. Filename auto-generated if omitted. |
| `camera_status()` | Check if camera is online and get memory/PSRAM info. |

### Examples
```python
camera_status()           # → "Camera online at 172.16.1.120 | PSRAM: YES | Heap: 172 KB"
camera_capture()          # → "OK — Captured 45.2 KB image → .../captures/capture_20260304_193000.jpg"
camera_capture("tube1")   # → "OK — Captured 45.2 KB image → .../captures/tube1.jpg"
```

### Using curl (for debugging)
```bash
curl -o capture.jpg http://172.16.1.120/capture
curl http://172.16.1.120/       # Web UI
```

---

## Hardware Details

- **Board:** Diymore ESP32-CAM-MB (AI-Thinker module + CH340G USB base)
- **Camera:** OV2640, 640×480 (VGA) with PSRAM
- **WiFi:** Connected to MEDICALEX, IP `172.16.1.120`
- **Power:** 5V via USB or external supply (max 5.25V)
- **Signal:** Weak (-79 dBm) — keep close to router
- **Firmware:** Custom, at `experiments/EXP_002/firmware/esp32_cam_test/`

### Endpoints

| Port | Path | Description |
|------|------|-------------|
| 80 | `/` | Web UI with stream/snapshot buttons |
| 80 | `/capture` | Single JPEG capture |
| 81 | `/stream` | MJPEG live stream |

---

## Troubleshooting

1. **Camera unreachable:** WiFi signal is weak. Try resetting the board (unplug/replug power) and wait 5 seconds for reconnection.
2. **Blurry images:** The OV2640 lens can be manually focused by gently twisting the barrel.
3. **No response from `/capture`:** The camera may have crashed. Power cycle the board.
4. **Stream on port 81 not loading:** Some network configurations block non-standard ports. Use `/capture` for individual frames.
