# Lab Monitor — Catchup

## 2026-03-13 — Initial build

- Created full app: ESP8266 firmware + FastAPI backend + Next.js dashboard
- **Firmware:** DHT22 + MQTT + OTA on Wemos D1 Mini
  - WiFi: MEDICALEX, MQTT broker: 172.16.1.80, sensor name: incubator-1
  - Flashed via USB (460800 baud), then OTA confirmed working
  - ESP IP: 172.16.1.129, mDNS: incubator-1.local
- **Backend:** FastAPI with aiomqtt subscriber, SQLite time-series DB, WebSocket broadcast
  - Auto-discovers sensors from MQTT topics
  - Data retention: 7 days raw, 90 days hourly averages
- **Dashboard:** Next.js 16 + Tailwind 4, Canvas chart with dual Y-axes (temp + humidity)
  - Sensor cards with live gauges, online/offline status
  - Time range selector (24h/7d/30d), crosshair tooltip
- **Pending:** Mosquitto install on server, end-to-end test with live sensor
