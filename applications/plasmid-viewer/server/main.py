"""Plasmid Viewer — FastAPI backend.

Provides endpoints for GenBank file upload/parsing, sequence management,
feature editing, and ORF detection.
"""

from typing import Optional, List, Dict
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from contextlib import asynccontextmanager
import json

from database import init_db, insert_sequence, get_all_sequences, get_sequence, \
    delete_sequence, insert_feature, update_feature, delete_feature, insert_features_batch
from genbank_parser import parse_genbank
from orf_finder import find_orfs


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield

app = FastAPI(title="Plasmid Viewer API", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Models ─────────────────────────────────────────────────────────

class FeatureUpdate(BaseModel):
    type: Optional[str] = None
    label: Optional[str] = None
    start: Optional[int] = None
    end: Optional[int] = None
    strand: Optional[int] = None
    color: Optional[str] = None
    qualifiers: Optional[Dict] = None

class FeatureCreate(BaseModel):
    type: str = "misc_feature"
    label: str = ""
    start: int
    end: int
    strand: int = 1
    color: str = "#95A5A6"
    qualifiers: Dict = {}

class OrfDetectParams(BaseModel):
    min_length: int = 300
    start_codons: List[str] = ["ATG"]
    include_reverse: bool = True

class OrfCommit(BaseModel):
    orfs: List[Dict]  # Each has start, end, strand, frame, length, protein, color


# ── Endpoints ──────────────────────────────────────────────────────

@app.get("/api/health")
async def health():
    return {"status": "ok"}


@app.post("/api/sequences/upload")
async def upload_sequence(file: UploadFile = File(...)):
    """Upload a GenBank file, parse it, store in DB, return full data."""
    if not file.filename:
        raise HTTPException(400, "No filename provided")

    ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else ""
    if ext not in ("gb", "gbk", "genbank", "seq"):
        raise HTTPException(400, f"Unsupported file type: .{ext}. Use .gb or .gbk")

    content = await file.read()
    text = content.decode("utf-8", errors="replace")

    try:
        parsed = parse_genbank(text)
    except Exception as e:
        raise HTTPException(422, f"Failed to parse GenBank file: {str(e)}")

    # Store sequence
    seq_id = await insert_sequence(
        name=parsed["name"],
        description=parsed["description"],
        sequence=parsed["sequence"],
        topology=parsed["topology"],
        organism=parsed["organism"],
    )

    # Store features
    for feat in parsed["features"]:
        await insert_feature(
            seq_id=seq_id,
            type=feat["type"],
            label=feat["label"],
            start=feat["start"],
            end=feat["end"],
            strand=feat["strand"],
            color=feat["color"],
            qualifiers=feat["qualifiers"],
            source="imported",
        )

    # Return full sequence data
    result = await get_sequence(seq_id)
    return result


@app.get("/api/sequences")
async def list_sequences():
    """List all stored sequences (without full sequence data)."""
    return await get_all_sequences()


@app.get("/api/sequences/{seq_id}")
async def get_sequence_detail(seq_id: int):
    """Get full sequence data with features."""
    result = await get_sequence(seq_id)
    if not result:
        raise HTTPException(404, "Sequence not found")
    return result


@app.delete("/api/sequences/{seq_id}")
async def remove_sequence(seq_id: int):
    """Delete a sequence and all its features."""
    ok = await delete_sequence(seq_id)
    if not ok:
        raise HTTPException(404, "Sequence not found")
    return {"deleted": True}


# ── Feature CRUD ───────────────────────────────────────────────────

@app.post("/api/sequences/{seq_id}/features")
async def add_feature(seq_id: int, feat: FeatureCreate):
    """Add a new feature/annotation."""
    seq = await get_sequence(seq_id)
    if not seq:
        raise HTTPException(404, "Sequence not found")

    fid = await insert_feature(
        seq_id=seq_id,
        type=feat.type,
        label=feat.label,
        start=feat.start,
        end=feat.end,
        strand=feat.strand,
        color=feat.color,
        qualifiers=feat.qualifiers,
        source="manual",
    )
    return {"id": fid}


@app.put("/api/sequences/{seq_id}/features/{feature_id}")
async def edit_feature(seq_id: int, feature_id: int, update: FeatureUpdate):
    """Update an existing feature's properties."""
    kwargs = {k: v for k, v in update.model_dump().items() if v is not None}
    if not kwargs:
        raise HTTPException(400, "No fields to update")

    ok = await update_feature(feature_id, **kwargs)
    if not ok:
        raise HTTPException(404, "Feature not found")
    return {"updated": True}


@app.delete("/api/sequences/{seq_id}/features/{feature_id}")
async def remove_feature(seq_id: int, feature_id: int):
    """Delete a feature."""
    ok = await delete_feature(feature_id)
    if not ok:
        raise HTTPException(404, "Feature not found")
    return {"deleted": True}


# ── ORF Detection ──────────────────────────────────────────────────

@app.post("/api/sequences/{seq_id}/detect-orfs")
async def detect_orfs(seq_id: int, params: OrfDetectParams):
    """Run ORF detection with given parameters. Returns candidates (not committed)."""
    seq = await get_sequence(seq_id)
    if not seq:
        raise HTTPException(404, "Sequence not found")

    orfs = find_orfs(
        sequence=seq["sequence"],
        min_length=params.min_length,
        start_codons=params.start_codons,
        include_reverse=params.include_reverse,
    )
    return {"orfs": orfs, "count": len(orfs)}


@app.post("/api/sequences/{seq_id}/commit-orfs")
async def commit_orfs(seq_id: int, data: OrfCommit):
    """Commit selected ORFs as CDS annotations."""
    seq = await get_sequence(seq_id)
    if not seq:
        raise HTTPException(404, "Sequence not found")

    features = []
    for orf in data.orfs:
        features.append({
            "seq_id": seq_id,
            "type": "CDS",
            "label": f"ORF ({orf['length']}bp, frame {orf['frame'] + 1}{'r' if orf['strand'] == -1 else 'f'})",
            "start": orf["start"],
            "end": orf["end"],
            "strand": orf["strand"],
            "color": orf.get("color", "#4A90D9"),
            "qualifiers": {
                "translation": orf.get("protein", ""),
                "note": f"Auto-detected ORF, frame {orf['frame'] + 1}",
            },
            "source": "orf_detection",
        })

    ids = await insert_features_batch(features)
    return {"committed": len(ids), "feature_ids": ids}
