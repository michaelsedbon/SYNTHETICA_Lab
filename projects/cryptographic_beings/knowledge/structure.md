# System Architecture

> Last updated: 2026-03-13

## Quick Access

| Interface | URL | Description |
|-----------|-----|-------------|
| **🖥️ Machine Controller Dashboard** | **[http://172.16.1.128:8000](http://172.16.1.128:8000)** | **Main control interface — motors, cameras, relays** |
| ESP8266 Level Motor API | [http://172.16.1.115](http://172.16.1.115) | Direct ESP8266 web dashboard & REST API |
| ESP32-CAM Stream | [http://172.16.1.120:81/stream](http://172.16.1.120:81/stream) | Live MJPEG camera stream |
| ESP32-CAM Capture | [http://172.16.1.120/capture](http://172.16.1.120/capture) | Single frame capture |
| LattePanda SSH | `ssh lp` | SSH access to Ubuntu 24.04 controller |

## Network Topology

```
┌────────────────────────────────────┐
│  Lab Network (MEDICALEX WiFi)      │
│  Subnet: 172.16.1.0/24            │
│                                    │
│  ┌──────────────────────────────┐  │
│  │ Lab Server                    │  │
│  │ IP: 172.16.1.80               │  │
│  │ Experiment Viewer (:3000)     │  │
│  │ App Launcher (:3100)          │  │
│  └──────────────────────────────┘  │
│                                    │
│  ┌──────────────────────────────┐  │
│  │ LattePanda Alpha             │  │
│  │ IP: 172.16.1.128             │  │
│  │ OS: Ubuntu 24.04             │  │
│  │ Machine Controller (:8000)   │  │
│  │ ├─ USB → Arduino Nano        │  │
│  │ │       (MOTOR_1: DM556)     │  │
│  │ └─ HTTP → ESP8266            │  │
│  │           (LEVEL_1: ISD04)   │  │
│  └──────────────────────────────┘  │
│                                    │
│  ┌────────────────┐                │
│  │ ESP8266         │                │
│  │ IP: 172.16.1.115│                │
│  │ hostname:        │               │
│  │  cryptobeings   │                │
│  │ HTTP API (:80)  │                │
│  │ OTA (:8266)     │                │
│  │ TCP Bridge      │                │
│  │   (:2323)       │                │
│  │ ├─ UART →       │                │
│  │ │  Arduino Nano │                │
│  │ │ (LEVEL motor) │                │
│  │ └─ D5 → Nano    │                │
│  │      RESET      │                │
│  └────────────────┘                │
│                                    │
│  ┌────────────────┐                │
│  │ ESP32-CAM       │                │
│  │ IP: 172.16.1.120│                │
│  │ Capture (:80)   │                │
│  │ Stream (:81)    │                │
│  └────────────────┘                │
└────────────────────────────────────┘
```

## Data Flow

```
User/Agent
   │
   ▼
Machine Controller (FastAPI :8000)
   │─ USB serial (/dev/motor_1) ──→ Arduino Nano (MOTOR_1)
   │                                   └─ DM556 stepper driver
   │                                       └─ Bottom linear actuator
   ├─ HTTP (172.16.1.115) ──→ ESP8266
   │                             └─ UART ──→ Arduino Nano (LEVEL_1)
   │                                          └─ ISD04 integrated stepper
   │                                              └─ Slewing bearing motor
   └─ HTTP (172.16.1.120) ──→ ESP32-CAM
                                  └─ Camera sensor (OV2640)
```

## Communication Protocols

| Link | Protocol | Baud/Port | Notes |
|------|----------|-----------|-------|
| LattePanda → MOTOR_1 Nano | USB Serial | 115200 | `/dev/motor_1` (udev symlink) |
| LattePanda → LEVEL_1 ESP | HTTP REST | Port 80 | Via WiFi |
| ESP8266 → LEVEL_1 Nano | UART Serial | 115200 | Wired, D5 = Nano reset |
| LattePanda → CAM_1 | HTTP | Port 80/81 | Capture + MJPEG stream |
| Dashboard ↔ Server | WebSocket | Port 8000 `/ws` | Real-time status updates |
