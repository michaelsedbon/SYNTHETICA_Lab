"""
Lab Monitor — FastAPI Backend
==============================
MQTT subscriber + REST API + WebSocket for real-time sensor data.

Endpoints:
  GET  /api/status                          → Backend health + MQTT status
  GET  /api/sensors                         → All sensors with latest readings
  GET  /api/sensors/{name}/history?range=   → Time-series data (24h|7d|30d)
  WS   /ws                                 → Real-time sensor data broadcast

Architecture:
  1. Background MQTT subscriber listens on lab/# topics
  2. Incoming readings → stored in SQLite + broadcast via WebSocket
  3. Dashboard connects via WebSocket for live updates
  4. REST endpoints for historical data and sensor listing

Run:
  python3 -m uvicorn main:app --host 0.0.0.0 --port 8006
"""

import asyncio
import json
import time
import logging
from contextlib import asynccontextmanager
from typing import Set

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Query
from fastapi.middleware.cors import CORSMiddleware

import database as db

# ── Logging ──
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(name)s] %(message)s")
logger = logging.getLogger("lab-monitor")

# ── MQTT Configuration ──
MQTT_BROKER = "localhost"
MQTT_PORT = 1883
MQTT_TOPIC = "lab/#"

# ── WebSocket clients ──
ws_clients: Set[WebSocket] = set()

# ── Latest readings cache (for immediate API response) ──
latest_readings: dict = {}  # {sensor_name: {metric: {value, timestamp}}}
sensor_status: dict = {}     # {sensor_name: "online" | "offline"}

# ── MQTT connection status ──
mqtt_connected = False


async def broadcast_ws(data: dict):
    """Send data to all connected WebSocket clients."""
    if not ws_clients:
        return
    message = json.dumps(data)
    disconnected = []
    for ws in list(ws_clients):
        try:
            await ws.send_text(message)
        except Exception:
            disconnected.append(ws)
    for ws in disconnected:
        ws_clients.discard(ws)


async def handle_mqtt_message(topic: str, payload: str):
    """Process an incoming MQTT message."""
    global latest_readings, sensor_status

    # Parse topic: lab/<sensor-name>/<metric>
    parts = topic.split("/")
    if len(parts) != 3 or parts[0] != "lab":
        return

    sensor_name = parts[1]
    metric = parts[2]

    # Handle status messages
    if metric == "status":
        sensor_status[sensor_name] = payload
        await db.upsert_sensor(sensor_name)
        await broadcast_ws({
            "type": "status",
            "sensor": sensor_name,
            "status": payload,
            "timestamp": time.time()
        })
        logger.info(f"Sensor {sensor_name} is {payload}")
        return

    # Handle numeric readings
    try:
        value = float(payload)
    except ValueError:
        logger.warning(f"Non-numeric payload on {topic}: {payload}")
        return

    # Update latest cache
    if sensor_name not in latest_readings:
        latest_readings[sensor_name] = {}
    latest_readings[sensor_name][metric] = {
        "value": value,
        "timestamp": time.time()
    }

    # Store in database
    await db.upsert_sensor(sensor_name)
    await db.insert_reading(sensor_name, metric, value)

    # Broadcast to WebSocket clients
    await broadcast_ws({
        "type": "reading",
        "sensor": sensor_name,
        "metric": metric,
        "value": value,
        "timestamp": time.time()
    })


async def mqtt_subscriber():
    """Background task: subscribe to MQTT and process messages."""
    global mqtt_connected

    try:
        import aiomqtt
    except ImportError:
        logger.error("aiomqtt not installed — MQTT subscriber disabled")
        logger.error("Install with: pip install aiomqtt")
        return

    while True:
        try:
            async with aiomqtt.Client(MQTT_BROKER, MQTT_PORT) as client:
                mqtt_connected = True
                logger.info(f"MQTT connected to {MQTT_BROKER}:{MQTT_PORT}")
                await client.subscribe(MQTT_TOPIC)
                logger.info(f"Subscribed to {MQTT_TOPIC}")

                async for message in client.messages:
                    topic = str(message.topic)
                    payload = message.payload.decode("utf-8", errors="replace")
                    await handle_mqtt_message(topic, payload)

        except Exception as e:
            mqtt_connected = False
            logger.warning(f"MQTT connection lost ({e}) — reconnecting in 5s...")
            await asyncio.sleep(5)


# ── FastAPI App ──

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events."""
    # Init database
    await db.init_db()
    logger.info("Database initialized")

    # Start background tasks
    mqtt_task = asyncio.create_task(mqtt_subscriber())
    maintenance_task = asyncio.create_task(db.maintenance_loop())
    logger.info("Background tasks started")

    yield

    # Shutdown
    mqtt_task.cancel()
    maintenance_task.cancel()
    logger.info("Shutting down")


app = FastAPI(
    title="Lab Monitor API",
    description="Environmental sensor monitoring for the SYNTHETICA Lab",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS — allow dashboard on any port
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── REST Endpoints ──

@app.get("/api/status")
async def get_status():
    """Backend health and MQTT connection status."""
    return {
        "ok": True,
        "mqtt_connected": mqtt_connected,
        "mqtt_broker": f"{MQTT_BROKER}:{MQTT_PORT}",
        "sensor_count": len(latest_readings),
        "ws_clients": len(ws_clients),
        "uptime_s": time.time() - app_start_time,
    }


@app.get("/api/sensors")
async def get_sensors():
    """List all known sensors with latest readings and online/offline status."""
    sensors = await db.get_sensors()

    # Merge with in-memory latest readings (faster than DB for live data)
    for sensor in sensors:
        name = sensor["name"]
        if name in latest_readings:
            sensor["latest"] = latest_readings[name]
        if name in sensor_status:
            sensor["mqtt_status"] = sensor_status[name]

    return {"sensors": sensors}


@app.get("/api/sensors/{sensor_name}/history")
async def get_sensor_history(sensor_name: str, range: str = Query("24h", regex="^(24h|7d|30d)$")):
    """Get historical time-series data for a sensor."""
    history = await db.get_sensor_history(sensor_name, range)
    return {"sensor": sensor_name, **history}


# ── WebSocket ──

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """Real-time sensor data broadcast."""
    await websocket.accept()
    ws_clients.add(websocket)
    logger.info(f"WebSocket client connected ({len(ws_clients)} total)")

    try:
        # Send current state on connect
        await websocket.send_json({
            "type": "init",
            "sensors": latest_readings,
            "status": sensor_status,
            "mqtt_connected": mqtt_connected,
        })

        # Keep alive — wait for client messages (ping/pong)
        while True:
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_json({"type": "pong"})
    except WebSocketDisconnect:
        pass
    finally:
        ws_clients.discard(websocket)
        logger.info(f"WebSocket client disconnected ({len(ws_clients)} total)")


# Track app start time
app_start_time = time.time()
