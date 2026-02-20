"""
Experiment Viewer — FastAPI backend
Discovers .md files across multiple experiment directories and serves
their content + referenced media. Supports grouping by source.
"""

import os
import re
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

# ── Experiment sources ──────────────────────────────────────────────
# Each source is a (label, path) tuple.  The local workspace experiments/
# folder is always included.  Additional folders can be added via the
# EXTRA_EXPERIMENT_DIRS env var (comma-separated "label:path" pairs).
#
# Example:
#   EXTRA_EXPERIMENT_DIRS="PhD:/Users/me/Documents/PhD/experiments"

WORKSPACE = Path(__file__).resolve().parent.parent.parent.parent
LOCAL_EXPERIMENTS = WORKSPACE / "experiments"

def _parse_sources() -> list[tuple[str, Path]]:
    """Build the list of (label, directory) sources."""
    sources: list[tuple[str, Path]] = []

    # Always include the local workspace experiments folder
    if LOCAL_EXPERIMENTS.is_dir():
        sources.append(("Lab", LOCAL_EXPERIMENTS))

    # Parse additional directories from env var
    extra = os.environ.get("EXTRA_EXPERIMENT_DIRS", "")
    if not extra:
        # Default: include PhD folder if it exists
        phd_dir = Path(os.path.expanduser("~/Documents/PhD/experiments"))
        if phd_dir.is_dir():
            sources.append(("PhD", phd_dir))
    else:
        for entry in extra.split(","):
            entry = entry.strip()
            if ":" in entry:
                label, path_str = entry.split(":", 1)
                p = Path(path_str.strip()).expanduser()
                if p.is_dir():
                    sources.append((label.strip(), p))

    return sources

SOURCES = _parse_sources()

# Build a flat lookup: source_label -> Path  (used for file/media serving)
SOURCE_MAP = {label: path for label, path in SOURCES}

app = FastAPI(title="Experiment Viewer API")

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


# Directories to skip during traversal
SKIP_DIRS = {".venv", "venv", "node_modules", "__pycache__", ".git", ".next", "data"}


def _build_tree() -> list[dict]:
    """Walk all experiment sources and return a grouped list.

    Each group (EXP_xxx folder) has:
      - summary: the summary.md file entry (or None)
      - files:   all other .md files in the folder
    """
    all_groups: list[dict] = []

    for source_label, experiments_dir in SOURCES:
        groups: dict[str, dict] = {}

        for md_path in sorted(experiments_dir.rglob("*.md")):
            # Skip files inside excluded directories
            rel_parts = md_path.relative_to(experiments_dir).parts
            if any(part in SKIP_DIRS or part.startswith(".") for part in rel_parts[:-1]):
                continue

            rel = md_path.relative_to(experiments_dir)
            parts = rel.parts

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
                    "summary": None,
                    "files": [],
                }

            file_entry = {
                "name": md_path.name,
                "path": str(rel),
                "title": _title_from_md(md_path),
                "modified": md_path.stat().st_mtime,
                "source": source_label,
            }

            # summary.md is the primary file for the group
            if md_path.name.lower() == "summary.md":
                groups[group_key]["summary"] = file_entry
            else:
                groups[group_key]["files"].append(file_entry)

        # Collect groups for this source
        source_groups = []
        if "_root" in groups:
            source_groups.append(groups.pop("_root"))
        for key in sorted(groups):
            source_groups.append(groups[key])

        # Tag each group with its source
        for g in source_groups:
            g["source"] = source_label

        all_groups.extend(source_groups)

    return all_groups


@app.get("/api/experiments")
def list_experiments():
    """Return the tree of experiment markdown files from all sources."""
    return _build_tree()


@app.get("/api/sources")
def list_sources():
    """Return the list of configured experiment sources."""
    return [{"label": label, "path": str(path)} for label, path in SOURCES]


@app.get("/api/file")
def get_file(
    path: str = Query(..., description="Relative path within an experiments dir"),
    source: str = Query("Lab", description="Source label"),
):
    """Return raw markdown content for a given file."""
    experiments_dir = SOURCE_MAP.get(source)
    if not experiments_dir:
        raise HTTPException(status_code=400, detail=f"Unknown source: {source}")

    resolved = (experiments_dir / path).resolve()
    if not str(resolved).startswith(str(experiments_dir)):
        raise HTTPException(status_code=403, detail="Access denied")
    if not resolved.is_file():
        raise HTTPException(status_code=404, detail="File not found")
    return {"content": resolved.read_text(encoding="utf-8"), "path": path}


@app.get("/api/media")
def get_media(
    path: str = Query(..., description="Relative path to media"),
    source: str = Query("Lab", description="Source label"),
):
    """Serve images/media referenced from markdown files."""
    experiments_dir = SOURCE_MAP.get(source)
    if not experiments_dir:
        raise HTTPException(status_code=400, detail=f"Unknown source: {source}")

    resolved = (experiments_dir / path).resolve()
    if not str(resolved).startswith(str(experiments_dir)):
        raise HTTPException(status_code=403, detail="Access denied")
    if not resolved.is_file():
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(resolved)
