"""
PhD Notebook — FastAPI backend
Discovers summary.md files in the PhD folder and serves their content + referenced media.
"""

import os
import re
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

# ── PhD folder path (absolute — this app reads from an external folder)
PHD_DIR = Path(os.environ.get("PHD_DIR", os.path.expanduser("~/Documents/PhD")))
EXPERIMENTS_DIR = PHD_DIR / "experiments"

app = FastAPI(title="PhD Notebook API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


def _title_from_md(path: Path) -> str:
    """Extract the first # heading from a markdown file."""
    try:
        with open(path, "r", encoding="utf-8") as f:
            for line in f:
                m = re.match(r"^#\s+(.+)", line)
                if m:
                    return m.group(1).strip()
    except Exception:
        pass
    return path.stem


def _build_tree() -> list[dict]:
    """Walk PhD experiments/ and return structured list of experiment groups.
    Only discovers summary.md files."""
    if not EXPERIMENTS_DIR.is_dir():
        return []

    groups: dict[str, dict] = {}

    # Directories to skip
    SKIP_DIRS = {".venv", "venv", "node_modules", "__pycache__", ".git", ".next", "data"}

    for md_path in sorted(EXPERIMENTS_DIR.rglob("summary.md")):
        # Skip files inside excluded directories
        if any(part in SKIP_DIRS or part.startswith(".") for part in md_path.relative_to(EXPERIMENTS_DIR).parts[:-1]):
            continue

        rel = md_path.relative_to(EXPERIMENTS_DIR)
        parts = rel.parts

        # Group by top-level folder (EXP_001, etc.) or "root" for top-level files
        if len(parts) == 1:
            group_key = "_root"
            group_label = "General"
        else:
            group_key = parts[0]
            group_label = parts[0]

        if group_key not in groups:
            groups[group_key] = {
                "key": group_key,
                "label": group_label,
                "files": [],
            }

        groups[group_key]["files"].append({
            "name": md_path.name,
            "path": str(rel),
            "title": _title_from_md(md_path),
            "modified": md_path.stat().st_mtime,
        })

    # Sort: root first, then alphabetical
    result = []
    if "_root" in groups:
        result.append(groups.pop("_root"))
    for key in sorted(groups):
        result.append(groups[key])
    return result


@app.get("/api/experiments")
def list_experiments():
    """Return the tree of PhD experiment summary.md files."""
    return _build_tree()


@app.get("/api/file")
def get_file(path: str = Query(..., description="Relative path within experiments/")):
    """Return raw markdown content for a given file."""
    resolved = (EXPERIMENTS_DIR / path).resolve()
    # Security: ensure it stays within experiments/
    if not str(resolved).startswith(str(EXPERIMENTS_DIR)):
        raise HTTPException(status_code=403, detail="Access denied")
    if not resolved.is_file():
        raise HTTPException(status_code=404, detail="File not found")
    return {"content": resolved.read_text(encoding="utf-8"), "path": path}


@app.get("/api/media")
def get_media(path: str = Query(..., description="Relative path to media within experiments/")):
    """Serve images/media referenced from markdown files."""
    resolved = (EXPERIMENTS_DIR / path).resolve()
    if not str(resolved).startswith(str(EXPERIMENTS_DIR)):
        raise HTTPException(status_code=403, detail="Access denied")
    if not resolved.is_file():
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(resolved)
