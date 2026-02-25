from __future__ import annotations
"""SQLite database for persisting sequences and their annotations."""

import aiosqlite
import json
import os
from pathlib import Path

DB_PATH = Path(__file__).parent / "plasmid_viewer.db"


async def get_db() -> aiosqlite.Connection:
    db = await aiosqlite.connect(DB_PATH)
    db.row_factory = aiosqlite.Row
    await db.execute("PRAGMA journal_mode=WAL")
    await db.execute("PRAGMA foreign_keys=ON")
    return db


async def init_db():
    db = await get_db()
    try:
        await db.executescript("""
            CREATE TABLE IF NOT EXISTS sequences (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                name        TEXT NOT NULL,
                description TEXT DEFAULT '',
                sequence    TEXT NOT NULL,
                topology    TEXT DEFAULT 'circular',
                length      INTEGER NOT NULL,
                organism    TEXT DEFAULT '',
                created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS features (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                seq_id      INTEGER NOT NULL REFERENCES sequences(id) ON DELETE CASCADE,
                type        TEXT NOT NULL DEFAULT 'misc_feature',
                label       TEXT DEFAULT '',
                start       INTEGER NOT NULL,
                end         INTEGER NOT NULL,
                strand      INTEGER DEFAULT 1,
                color       TEXT DEFAULT '#4A90D9',
                qualifiers  TEXT DEFAULT '{}',
                source      TEXT DEFAULT 'imported',
                created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE INDEX IF NOT EXISTS idx_features_seq ON features(seq_id);
        """)
        await db.commit()
    finally:
        await db.close()


# ── Sequence CRUD ──────────────────────────────────────────────────

async def insert_sequence(name: str, description: str, sequence: str,
                          topology: str, organism: str) -> int:
    db = await get_db()
    try:
        cursor = await db.execute(
            "INSERT INTO sequences (name, description, sequence, topology, length, organism) "
            "VALUES (?, ?, ?, ?, ?, ?)",
            (name, description, sequence, topology, len(sequence), organism),
        )
        await db.commit()
        return cursor.lastrowid
    finally:
        await db.close()


async def get_all_sequences() -> list[dict]:
    db = await get_db()
    try:
        cursor = await db.execute(
            "SELECT id, name, description, topology, length, organism, created_at FROM sequences ORDER BY created_at DESC"
        )
        rows = await cursor.fetchall()
        return [dict(r) for r in rows]
    finally:
        await db.close()


async def get_sequence(seq_id: int) -> dict | None:
    db = await get_db()
    try:
        cursor = await db.execute("SELECT * FROM sequences WHERE id = ?", (seq_id,))
        row = await cursor.fetchone()
        if not row:
            return None
        seq = dict(row)
        # Fetch features
        cursor = await db.execute(
            "SELECT * FROM features WHERE seq_id = ? ORDER BY start", (seq_id,)
        )
        features = await cursor.fetchall()
        seq["features"] = [
            {**dict(f), "qualifiers": json.loads(f["qualifiers"])} for f in features
        ]
        return seq
    finally:
        await db.close()


async def delete_sequence(seq_id: int) -> bool:
    db = await get_db()
    try:
        cursor = await db.execute("DELETE FROM sequences WHERE id = ?", (seq_id,))
        await db.commit()
        return cursor.rowcount > 0
    finally:
        await db.close()


# ── Feature CRUD ───────────────────────────────────────────────────

async def insert_feature(seq_id: int, type: str, label: str, start: int,
                         end: int, strand: int, color: str,
                         qualifiers: dict, source: str = "imported") -> int:
    db = await get_db()
    try:
        cursor = await db.execute(
            "INSERT INTO features (seq_id, type, label, start, end, strand, color, qualifiers, source) "
            "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (seq_id, type, label, start, end, strand, color,
             json.dumps(qualifiers), source),
        )
        await db.commit()
        return cursor.lastrowid
    finally:
        await db.close()


async def update_feature(feature_id: int, **kwargs) -> bool:
    db = await get_db()
    try:
        if "qualifiers" in kwargs:
            kwargs["qualifiers"] = json.dumps(kwargs["qualifiers"])
        sets = ", ".join(f"{k} = ?" for k in kwargs)
        vals = list(kwargs.values()) + [feature_id]
        cursor = await db.execute(
            f"UPDATE features SET {sets} WHERE id = ?", vals
        )
        await db.commit()
        return cursor.rowcount > 0
    finally:
        await db.close()


async def delete_feature(feature_id: int) -> bool:
    db = await get_db()
    try:
        cursor = await db.execute("DELETE FROM features WHERE id = ?", (feature_id,))
        await db.commit()
        return cursor.rowcount > 0
    finally:
        await db.close()


async def insert_features_batch(features: list[dict]) -> list[int]:
    """Insert multiple features at once. Returns list of new IDs."""
    db = await get_db()
    try:
        ids = []
        for f in features:
            cursor = await db.execute(
                "INSERT INTO features (seq_id, type, label, start, end, strand, color, qualifiers, source) "
                "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                (f["seq_id"], f["type"], f["label"], f["start"], f["end"],
                 f["strand"], f["color"], json.dumps(f.get("qualifiers", {})),
                 f.get("source", "orf_detection")),
            )
            ids.append(cursor.lastrowid)
        await db.commit()
        return ids
    finally:
        await db.close()


async def rename_sequence(seq_id: int, name: str) -> bool:
    db = await get_db()
    try:
        cursor = await db.execute(
            "UPDATE sequences SET name = ? WHERE id = ?", (name, seq_id)
        )
        await db.commit()
        return cursor.rowcount > 0
    finally:
        await db.close()


async def duplicate_sequence(seq_id: int) -> int | None:
    """Duplicate a sequence and all its features. Returns new sequence ID."""
    db = await get_db()
    try:
        cursor = await db.execute("SELECT * FROM sequences WHERE id = ?", (seq_id,))
        row = await cursor.fetchone()
        if not row:
            return None
        seq = dict(row)
        # Insert copy
        cursor = await db.execute(
            "INSERT INTO sequences (name, description, sequence, topology, length, organism) "
            "VALUES (?, ?, ?, ?, ?, ?)",
            (seq["name"] + " (copy)", seq["description"], seq["sequence"],
             seq["topology"], seq["length"], seq["organism"]),
        )
        new_id = cursor.lastrowid
        # Copy features
        feat_cursor = await db.execute(
            "SELECT * FROM features WHERE seq_id = ? ORDER BY start", (seq_id,)
        )
        features = await feat_cursor.fetchall()
        for f in features:
            await db.execute(
                "INSERT INTO features (seq_id, type, label, start, end, strand, color, qualifiers, source) "
                "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                (new_id, f["type"], f["label"], f["start"], f["end"],
                 f["strand"], f["color"], f["qualifiers"], f["source"]),
            )
        await db.commit()
        return new_id
    finally:
        await db.close()

