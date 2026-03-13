# Lab Monitor API Documentation

**Slug:** `lab-monitor`
**Status:** ✅ Working
**Ports:** 8006 (API) · 3008 (UI)

---

## Purpose

Real-time environmental monitoring dashboard for the SYNTHETICA Lab. Collects temperature, humidity, and signal data from ESP8266 sensor nodes via MQTT, stores in SQLite, and displays on a web dashboard with live WebSocket updates.

---

## API Endpoints

### REST

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/status` | Backend health + MQTT connection status |
| GET | `/api/sensors` | All sensors with latest readings + online/offline |
| GET | `/api/sensors/{name}/history?range=24h\|7d\|30d` | Time-series data |

### WebSocket

| Path | Description |
|------|-------------|
| `ws://host:8006/ws` | Real-time sensor data broadcast |

#### WebSocket Messages

**Server → Client:**

```json
{"type": "init", "sensors": {...}, "status": {...}, "mqtt_connected": true}
{"type": "reading", "sensor": "incubator-1", "metric": "temperature", "value": 25.3, "timestamp": 1710345600}
{"type": "status", "sensor": "incubator-1", "status": "online", "timestamp": 1710345600}
{"type": "pong"}
```

**Client → Server:**

```
ping
```

---

## MQTT Topic Structure

Pattern: `lab/{sensor-name}/{metric}`

| Metric | Payload | Frequency |
|--------|---------|-----------|
| `temperature` | float (°C) | Every 30s |
| `humidity` | float (%RH) | Every 30s |
| `rssi` | int (dBm) | Every 30s |
| `uptime` | int (seconds) | Every 30s |
| `status` | "online"/"offline" | On connect (retained) + LWT |

---

## Database Schema

**`sensors`** — Auto-discovered sensor registry

| Column | Type | Description |
|--------|------|-------------|
| name | TEXT PK | Sensor name from MQTT topic |
| first_seen | REAL | Unix timestamp |
| last_seen | REAL | Unix timestamp |
| location | TEXT | User-assigned location |
| notes | TEXT | User notes |

**`readings`** — Raw time-series data (7-day retention)

| Column | Type | Description |
|--------|------|-------------|
| sensor_name | TEXT | FK → sensors |
| timestamp | REAL | Unix timestamp |
| metric | TEXT | temperature, humidity, rssi, uptime |
| value | REAL | Reading value |

**`hourly_averages`** — Downsampled data (90-day retention)

| Column | Type | Description |
|--------|------|-------------|
| sensor_name | TEXT | FK → sensors |
| hour | TEXT | "YYYY-MM-DD HH:00" |
| metric | TEXT | Metric name |
| avg/min/max_value | REAL | Aggregated values |
| count | INT | Number of raw readings |
