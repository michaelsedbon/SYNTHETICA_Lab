# Lab Monitor

**Real-time environmental sensor monitoring for the SYNTHETICA Lab.**

Track temperature, humidity, and WiFi signal from ESP8266 sensor nodes via MQTT. First deployment: incubator monitoring at 25°C.

---

## Architecture

```
ESP8266 + DHT22  ──MQTT──▶  Mosquitto Broker  ──subscribe──▶  FastAPI Backend  ──WS──▶  Next.js Dashboard
(incubator-1)              (172.16.1.80:1883)                (port 8006)              (port 3008)
 172.16.1.129
```

## Tech Stack

| Layer | Technology |
|-------|------------|
| Sensor | Wemos D1 Mini (ESP8266) + DHT22 |
| Protocol | MQTT via Mosquitto |
| Backend | Python · FastAPI · aiomqtt · SQLite |
| Frontend | Next.js 16 · Tailwind 4 · Canvas charts |

## Wiring

```
DHT22 Module    Wemos D1 Mini
  +  (VCC)  →   5V
  out (DATA) →   D4 (GPIO2)
  -  (GND)  →   GND
```

Powered by external 5V supply. Sensor placed inside incubator.

## How to Run

```bash
# 1. Start Mosquitto (must be running first)
mosquitto -d

# 2. Backend (port 8006)
cd applications/lab-monitor/server
source .venv/bin/activate
python3 -m uvicorn main:app --host 0.0.0.0 --port 8006

# 3. Frontend (port 3008)
cd applications/lab-monitor/dashboard
npm run dev -- -p 3008
```

Open **http://172.16.1.80:3008**

## ESP Firmware

```bash
# First flash (USB)
cd applications/lab-monitor/firmware
pio run -e usb -t upload --upload-port /dev/cu.usbserial-XXXX

# Subsequent flashes (OTA — no USB needed)
pio run -e ota -t upload --upload-port 172.16.1.129
```

## MQTT Topics

All topics follow the pattern `lab/{sensor-name}/{metric}`:

| Topic | Type | Description |
|-------|------|-------------|
| `lab/incubator-1/temperature` | float | Temperature in °C |
| `lab/incubator-1/humidity` | float | Relative humidity % |
| `lab/incubator-1/rssi` | int | WiFi signal (dBm) |
| `lab/incubator-1/uptime` | int | Seconds since boot |
| `lab/incubator-1/status` | string | `online` / `offline` (retained, LWT) |

## Adding a New Sensor

1. Flash the firmware to a new ESP8266 (change `SENSOR_NAME` in `main.cpp`)
2. Wire the DHT22 (same pinout)
3. Power on — the sensor auto-registers when it publishes to MQTT
4. It appears on the dashboard automatically

## Data Retention

| Tier | Resolution | Retention |
|------|-----------|-----------|
| Raw | Every 30s | 7 days |
| Hourly average | 1 per hour | 90 days |

## Key Files

```
firmware/
  platformio.ini       — PlatformIO config (usb + ota envs)
  src/main.cpp         — ESP8266 firmware (WiFi, MQTT, DHT22, OTA)

server/
  main.py              — FastAPI app (MQTT subscriber, REST, WebSocket)
  database.py          — SQLite time-series storage + maintenance
  requirements.txt     — Python dependencies

dashboard/
  src/app/page.tsx     — Main dashboard (sensor list, chart, details)
  src/components/
    sensor-card.tsx    — Live reading card with gauges
    temperature-chart.tsx — Canvas dual-axis time-series chart
  src/lib/api.ts       — REST + WebSocket client
```

## Network Info

| Device | IP | mDNS |
|--------|----|------|
| Office Server | 172.16.1.80 | — |
| Incubator Sensor | 172.16.1.129 | incubator-1.local |
| MQTT Broker | 172.16.1.80:1883 | — |
| WiFi | MEDICALEX | — |
