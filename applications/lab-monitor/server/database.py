"""
Lab Monitor — Database Layer
=============================
SQLite time-series storage for sensor readings.

Tables:
  - sensors:         Registry of known sensors (auto-discovered via MQTT)
  - readings:        Raw readings (kept 7 days)
  - hourly_averages: Downsampled hourly data (kept 90 days)

Background tasks:
  - downsample_hourly(): runs every hour, aggregates raw → hourly
  - purge_old_data():    runs every hour, deletes old raw + hourly data
"""

import aiosqlite
import asyncio
import time
import logging
from pathlib import Path
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

DB_DIR = Path(__file__).parent / "data"
DB_PATH = DB_DIR / "lab_monitor.db"

# Retention policy
RAW_RETENTION_DAYS = 7
HOURLY_RETENTION_DAYS = 90


async def get_db() -> aiosqlite.Connection:
    """Get a database connection."""
    DB_DIR.mkdir(parents=True, exist_ok=True)
    db = await aiosqlite.connect(str(DB_PATH))
    db.row_factory = aiosqlite.Row
    await db.execute("PRAGMA journal_mode=WAL")
    await db.execute("PRAGMA synchronous=NORMAL")
    return db


async def init_db():
    """Create tables if they don't exist."""
    db = await get_db()
    try:
        await db.executescript("""
            CREATE TABLE IF NOT EXISTS sensors (
                name        TEXT PRIMARY KEY,
                first_seen  REAL NOT NULL,
                last_seen   REAL NOT NULL,
                location    TEXT DEFAULT '',
                notes       TEXT DEFAULT ''
            );

            CREATE TABLE IF NOT EXISTS readings (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                sensor_name TEXT NOT NULL,
                timestamp   REAL NOT NULL,
                metric      TEXT NOT NULL,
                value       REAL NOT NULL,
                FOREIGN KEY (sensor_name) REFERENCES sensors(name)
            );

            CREATE INDEX IF NOT EXISTS idx_readings_sensor_time
                ON readings(sensor_name, timestamp);

            CREATE INDEX IF NOT EXISTS idx_readings_time
                ON readings(timestamp);

            CREATE TABLE IF NOT EXISTS hourly_averages (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                sensor_name TEXT NOT NULL,
                hour        TEXT NOT NULL,
                metric      TEXT NOT NULL,
                avg_value   REAL NOT NULL,
                min_value   REAL NOT NULL,
                max_value   REAL NOT NULL,
                count       INTEGER NOT NULL,
                FOREIGN KEY (sensor_name) REFERENCES sensors(name),
                UNIQUE(sensor_name, hour, metric)
            );

            CREATE INDEX IF NOT EXISTS idx_hourly_sensor_hour
                ON hourly_averages(sensor_name, hour);
        """)
        await db.commit()
        logger.info(f"Database initialized at {DB_PATH}")
    finally:
        await db.close()


async def upsert_sensor(name: str):
    """Register a sensor or update its last_seen timestamp."""
    now = time.time()
    db = await get_db()
    try:
        await db.execute("""
            INSERT INTO sensors (name, first_seen, last_seen)
            VALUES (?, ?, ?)
            ON CONFLICT(name) DO UPDATE SET last_seen = ?
        """, (name, now, now, now))
        await db.commit()
    finally:
        await db.close()


async def insert_reading(sensor_name: str, metric: str, value: float):
    """Insert a raw sensor reading."""
    now = time.time()
    db = await get_db()
    try:
        await db.execute(
            "INSERT INTO readings (sensor_name, timestamp, metric, value) VALUES (?, ?, ?, ?)",
            (sensor_name, now, metric, value)
        )
        await db.commit()
    finally:
        await db.close()


async def get_sensors():
    """Get all registered sensors with their latest readings."""
    db = await get_db()
    try:
        # Get sensor list
        cursor = await db.execute("SELECT * FROM sensors ORDER BY name")
        sensors = [dict(row) for row in await cursor.fetchall()]

        # For each sensor, get the latest reading per metric
        for sensor in sensors:
            cursor = await db.execute("""
                SELECT metric, value, timestamp
                FROM readings
                WHERE sensor_name = ?
                AND timestamp = (
                    SELECT MAX(timestamp) FROM readings
                    WHERE sensor_name = ? AND metric = readings.metric
                )
                GROUP BY metric
            """, (sensor["name"], sensor["name"]))
            rows = await cursor.fetchall()
            sensor["latest"] = {row["metric"]: {"value": row["value"], "timestamp": row["timestamp"]} for row in rows}
            
            # Determine online/offline status (offline if no data for 2 minutes)
            sensor["online"] = (time.time() - sensor["last_seen"]) < 120

        return sensors
    finally:
        await db.close()


async def get_sensor_history(sensor_name: str, range_str: str = "24h"):
    """Get time-series data for a sensor.
    
    For ranges <= 24h: returns raw readings
    For ranges > 24h: returns hourly averages
    """
    db = await get_db()
    try:
        # Parse range
        if range_str == "24h":
            since = time.time() - 86400
            use_raw = True
        elif range_str == "7d":
            since = time.time() - 7 * 86400
            use_raw = False
        elif range_str == "30d":
            since = time.time() - 30 * 86400
            use_raw = False
        else:
            since = time.time() - 86400
            use_raw = True

        if use_raw:
            cursor = await db.execute("""
                SELECT timestamp, metric, value
                FROM readings
                WHERE sensor_name = ? AND timestamp > ?
                ORDER BY timestamp ASC
            """, (sensor_name, since))
            rows = await cursor.fetchall()
            
            # Group by metric
            data = {}
            for row in rows:
                metric = row["metric"]
                if metric not in data:
                    data[metric] = {"timestamps": [], "values": []}
                data[metric]["timestamps"].append(row["timestamp"])
                data[metric]["values"].append(row["value"])
            
            return {"type": "raw", "range": range_str, "data": data}
        else:
            since_hour = datetime.fromtimestamp(since).strftime("%Y-%m-%d %H:00")
            cursor = await db.execute("""
                SELECT hour, metric, avg_value, min_value, max_value
                FROM hourly_averages
                WHERE sensor_name = ? AND hour >= ?
                ORDER BY hour ASC
            """, (sensor_name, since_hour))
            rows = await cursor.fetchall()

            data = {}
            for row in rows:
                metric = row["metric"]
                if metric not in data:
                    data[metric] = {"hours": [], "avg": [], "min": [], "max": []}
                data[metric]["hours"].append(row["hour"])
                data[metric]["avg"].append(row["avg_value"])
                data[metric]["min"].append(row["min_value"])
                data[metric]["max"].append(row["max_value"])

            return {"type": "hourly", "range": range_str, "data": data}
    finally:
        await db.close()


async def downsample_hourly():
    """Aggregate raw readings into hourly averages."""
    db = await get_db()
    try:
        # Get the current hour boundary
        now = datetime.now()
        current_hour = now.strftime("%Y-%m-%d %H:00")
        
        # Aggregate all readings older than current hour
        await db.execute("""
            INSERT OR REPLACE INTO hourly_averages (sensor_name, hour, metric, avg_value, min_value, max_value, count)
            SELECT
                sensor_name,
                strftime('%Y-%m-%d %H:00', timestamp, 'unixepoch', 'localtime') as hour,
                metric,
                AVG(value) as avg_value,
                MIN(value) as min_value,
                MAX(value) as max_value,
                COUNT(*) as count
            FROM readings
            WHERE strftime('%Y-%m-%d %H:00', timestamp, 'unixepoch', 'localtime') < ?
            GROUP BY sensor_name, hour, metric
        """, (current_hour,))
        await db.commit()
        logger.info("Hourly downsampling complete")
    finally:
        await db.close()


async def purge_old_data():
    """Delete old raw readings and hourly averages based on retention policy."""
    db = await get_db()
    try:
        # Purge raw readings older than retention period
        raw_cutoff = time.time() - RAW_RETENTION_DAYS * 86400
        cursor = await db.execute("DELETE FROM readings WHERE timestamp < ?", (raw_cutoff,))
        raw_deleted = cursor.rowcount

        # Purge hourly averages older than retention period
        hourly_cutoff = (datetime.now() - timedelta(days=HOURLY_RETENTION_DAYS)).strftime("%Y-%m-%d %H:00")
        cursor = await db.execute("DELETE FROM hourly_averages WHERE hour < ?", (hourly_cutoff,))
        hourly_deleted = cursor.rowcount

        await db.commit()
        if raw_deleted or hourly_deleted:
            logger.info(f"Purged {raw_deleted} raw readings, {hourly_deleted} hourly averages")
    finally:
        await db.close()


async def maintenance_loop():
    """Background task that runs downsampling and purging every hour."""
    while True:
        try:
            await downsample_hourly()
            await purge_old_data()
        except Exception as e:
            logger.error(f"Maintenance task error: {e}")
        await asyncio.sleep(3600)  # 1 hour
