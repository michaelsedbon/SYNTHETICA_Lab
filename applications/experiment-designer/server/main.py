"""
Experiment Designer — FastAPI Backend

Protocol CRUD and validation for the EXP_010 Experiment Designer app.

Run with:
    cd server && python3 -m uvicorn main:app --port 8001 --reload
"""

from __future__ import annotations

import json
import logging
import uuid
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, validator

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

PROTOCOLS_DIR = Path(__file__).parent.parent / "protocols"
PROTOCOLS_DIR.mkdir(parents=True, exist_ok=True)


# ─── Pydantic Models ─────────────────────────────────────────────────

class Stimulus(BaseModel):
    type: str = Field(..., pattern=r"^(pulse|train)$")
    channel: Optional[int] = Field(None, ge=0, le=7)
    pwm: int = Field(..., ge=0, le=4095)
    duration_s: float = Field(..., ge=0.1, le=30)
    isi_s: Optional[float] = None
    repeat: int = Field(1, ge=1, le=200)
    train_count: Optional[int] = None
    train_interval_s: Optional[float] = None


class Block(BaseModel):
    label: str
    randomize: bool = False
    stimuli: List[Stimulus]

    @validator("stimuli")
    def at_least_one_stimulus(cls, v):
        if not v:
            raise ValueError("Block must have at least one stimulus")
        return v


class GlobalDefaults(BaseModel):
    isi_s: float = 20
    led_channel: int = Field(0, ge=0, le=7)
    led_driver_url: str = "http://leddriver.local"


class Baseline(BaseModel):
    pre_s: float = 300
    post_s: float = 300


class Protocol(BaseModel):
    name: str
    version: str = "1.0"
    created: Optional[str] = None
    description: str = ""
    literature_reference: str = ""
    global_defaults: GlobalDefaults = GlobalDefaults()
    baseline: Baseline = Baseline()
    blocks: List[Block]
    randomize_blocks: bool = False
    random_seed: int = 42

    @validator("blocks")
    def at_least_one_block(cls, v):
        if not v:
            raise ValueError("Protocol must have at least one block")
        return v


class ProtocolResponse(BaseModel):
    id: str
    name: str
    created: str
    description: str
    block_count: int
    total_stimuli: int
    total_duration_s: float


# ─── Helpers ──────────────────────────────────────────────────────────

def calc_total(protocol: Protocol) -> tuple[int, float]:
    """Return (total_stimuli, total_duration_s)."""
    total_stim = 0
    total_dur = protocol.baseline.pre_s + protocol.baseline.post_s
    isi = protocol.global_defaults.isi_s
    for block in protocol.blocks:
        for stim in block.stimuli:
            s_isi = stim.isi_s if stim.isi_s is not None else isi
            total_stim += stim.repeat
            total_dur += stim.repeat * (stim.duration_s + s_isi)
    return total_stim, total_dur


def protocol_response(pid: str, protocol: Protocol) -> ProtocolResponse:
    stim, dur = calc_total(protocol)
    return ProtocolResponse(
        id=pid,
        name=protocol.name,
        created=protocol.created or "",
        description=protocol.description,
        block_count=len(protocol.blocks),
        total_stimuli=stim,
        total_duration_s=dur,
    )


# ─── App ──────────────────────────────────────────────────────────────

app = FastAPI(
    title="Experiment Designer API",
    description="Protocol CRUD for EXP_010 light-evoked electrophysiology",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── Endpoints ────────────────────────────────────────────────────────

@app.get("/api/protocols", response_model=List[ProtocolResponse])
async def list_protocols():
    """List all saved protocols."""
    results = []
    for f in sorted(PROTOCOLS_DIR.glob("*.json")):
        try:
            data = json.loads(f.read_text())
            p = Protocol(**data)
            pid = f.stem
            results.append(protocol_response(pid, p))
        except Exception as e:
            logger.warning(f"Skipping invalid protocol {f.name}: {e}")
    return results


@app.get("/api/protocol/{protocol_id}")
async def get_protocol(protocol_id: str):
    """Get a protocol by ID."""
    path = PROTOCOLS_DIR / f"{protocol_id}.json"
    if not path.exists():
        raise HTTPException(404, "Protocol not found")
    return json.loads(path.read_text())


@app.post("/api/protocol", response_model=ProtocolResponse)
async def create_protocol(protocol: Protocol):
    """Create a new protocol."""
    pid = str(uuid.uuid4())[:8]
    protocol.created = datetime.now().isoformat()
    path = PROTOCOLS_DIR / f"{pid}.json"
    path.write_text(json.dumps(protocol.model_dump(), indent=2))
    logger.info(f"Created protocol {pid}: {protocol.name}")
    return protocol_response(pid, protocol)


@app.put("/api/protocol/{protocol_id}", response_model=ProtocolResponse)
async def update_protocol(protocol_id: str, protocol: Protocol):
    """Update an existing protocol."""
    path = PROTOCOLS_DIR / f"{protocol_id}.json"
    if not path.exists():
        raise HTTPException(404, "Protocol not found")
    path.write_text(json.dumps(protocol.model_dump(), indent=2))
    return protocol_response(protocol_id, protocol)


@app.delete("/api/protocol/{protocol_id}")
async def delete_protocol(protocol_id: str):
    """Delete a protocol."""
    path = PROTOCOLS_DIR / f"{protocol_id}.json"
    if not path.exists():
        raise HTTPException(404, "Protocol not found")
    path.unlink()
    return {"deleted": protocol_id}


@app.post("/api/protocol/validate")
async def validate_protocol(protocol: Protocol):
    """Validate a protocol without saving."""
    stim, dur = calc_total(protocol)
    return {
        "valid": True,
        "total_stimuli": stim,
        "total_duration_s": dur,
        "block_count": len(protocol.blocks),
    }
