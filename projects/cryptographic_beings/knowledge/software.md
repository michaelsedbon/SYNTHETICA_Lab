# Software & Deployment

> Last updated: 2026-03-13

## Machine Controller Dashboard

| Field | Value |
|-------|-------|
| **URL** | `http://172.16.1.128:8000` |
| **Framework** | FastAPI + vanilla HTML/JS |
| **Source** | [`experiments/EXP_014/server/`](../../experiments/EXP_014/server/) |
| **Runs on** | LattePanda Alpha (Ubuntu 24.04) |

### Structure

```
experiments/EXP_014/server/
  main.py              ← FastAPI application
  devices.yaml         ← Device registry (motors, cameras)
  static/
    index.html         ← Tabbed dashboard UI
    app.js             ← Frontend JavaScript
```

### Dashboard Tabs

| Tab | Purpose |
|-----|---------|
| Motors | Motor controls, status, level %, homing, calibration |
| Cameras | Live MJPEG streams from ESP32-CAM devices |
| Relays | (Future) Relay control for lights/pumps |

### Screenshots

![Motors tab — showing MOTOR_1 (linear actuator, /dev/ttyUSB1) and LEVEL_1 (slewing bearing, 172.16.1.115) with position, speed, level %, and control buttons](images/dashboard_motors_tab.png)

![Cameras tab — showing CAM_1 (ESP32-CAM at 172.16.1.120) with Stream, Capture, and Stop controls](images/dashboard_cameras_tab.png)

### Running the Server

```bash
# SSH to LattePanda
ssh lp

# Via systemd (auto-starts on boot)
sudo systemctl start machine-controller
sudo systemctl status machine-controller
sudo journalctl -u machine-controller -f   # live logs

# Or start manually
cd ~/machine-controller-app
~/machine-controller/bin/uvicorn main:app --host 0.0.0.0 --port 8000
```

### Dependencies

```
fastapi
uvicorn
pyserial
pyserial-asyncio
pyyaml
aiohttp
websockets
```

## Device Registry (`devices.yaml`)

The server reads `devices.yaml` at startup to discover and configure devices:

```yaml
esp_devices:           # ESP8266/ESP32 devices accessed via HTTP
  - id: LEVEL_1
    host: 172.16.1.115
    type: isd04_level

usb_devices:           # Arduino devices accessed via USB serial
  - id: MOTOR_1
    port: /dev/motor_1
    type: dm556_stepper

camera_devices:        # ESP32-CAM devices
  - id: CAM_1
    host: 172.16.1.120
```

Each entry can include `experiment`, `firmware`, and `notes` fields for traceability.

## Deployment from Workstation

```bash
# One-command deploy (from experiments/EXP_014/server/)
./deploy.sh

# Or manually:
scp -r experiments/EXP_014/server/ lp:~/machine-controller-app/
ssh lp "sudo systemctl restart machine-controller"
```

## GitHub

All source lives in the main lab repo:  
`https://github.com/michaelsedbon/SYNTHETICA_Lab`

Relevant paths:
- `experiments/EXP_014/server/` — Machine controller
- `experiments/EXP_005/firmware/` — ESP8266, Arduino Nano, ESP32-CAM firmware
- `experiments/EXP_014/firmware/` — MOTOR_1 production firmware
- `experiments/EXP_012/pcb/` — Motor controller PCB design
