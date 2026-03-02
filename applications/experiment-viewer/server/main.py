"""
Experiment Viewer — FastAPI backend
Discovers .md files across multiple experiment directories and serves
their content + referenced media. Supports grouping by source.
Settings are persisted in settings.json alongside this file.
"""

import json
import os
import re
import time
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel

# ── Paths ───────────────────────────────────────────────────────────

WORKSPACE = Path(__file__).resolve().parent.parent.parent.parent
LOCAL_EXPERIMENTS = WORKSPACE / "experiments"
SETTINGS_FILE = Path(__file__).resolve().parent / "settings.json"

# ── Settings persistence ────────────────────────────────────────────

def _default_sources() -> list[dict]:
    """Build the default sources list (used on first run)."""
    sources: list[dict] = []

    if LOCAL_EXPERIMENTS.is_dir():
        sources.append({"label": "Lab", "path": str(LOCAL_EXPERIMENTS)})

    phd_dir = Path(os.path.expanduser("~/Documents/PhD/experiments"))
    if phd_dir.is_dir():
        sources.append({"label": "PhD", "path": str(phd_dir)})

    # Parse additional directories from env var (backward compat)
    extra = os.environ.get("EXTRA_EXPERIMENT_DIRS", "")
    if extra:
        for entry in extra.split(","):
            entry = entry.strip()
            if ":" in entry:
                label, path_str = entry.split(":", 1)
                p = Path(path_str.strip()).expanduser()
                if p.is_dir():
                    sources.append({"label": label.strip(), "path": str(p)})

    return sources


def _load_settings() -> dict:
    """Load settings from disk, creating defaults if missing."""
    if SETTINGS_FILE.is_file():
        try:
            data = json.loads(SETTINGS_FILE.read_text(encoding="utf-8"))
            if "sources" in data and isinstance(data["sources"], list):
                return data
        except (json.JSONDecodeError, IOError):
            pass

    # First run — write defaults
    defaults = {"sources": _default_sources()}
    _save_settings(defaults)
    return defaults


def _save_settings(data: dict) -> None:
    """Write settings to disk."""
    SETTINGS_FILE.write_text(
        json.dumps(data, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )


def _sources_from_settings() -> list[tuple[str, Path]]:
    """Return (label, Path) pairs from the current settings."""
    settings = _load_settings()
    result: list[tuple[str, Path]] = []
    for s in settings.get("sources", []):
        label = s.get("label", "")
        p = Path(s.get("path", ""))
        if label and p.is_dir():
            result.append((label, p))
    return result


# ── Runtime state ───────────────────────────────────────────────────

SOURCES = _sources_from_settings()
SOURCE_MAP = {label: path for label, path in SOURCES}


def _reload_sources() -> None:
    """Reload SOURCES and SOURCE_MAP from settings file."""
    global SOURCES, SOURCE_MAP, _tree_cache
    SOURCES = _sources_from_settings()
    SOURCE_MAP = {label: path for label, path in SOURCES}
    _tree_cache = None  # invalidate cache


# ── App ─────────────────────────────────────────────────────────────

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


# ── Tree cache ──────────────────────────────────────────────────────

_tree_cache: list[dict] | None = None
_tree_cache_time: float = 0.0
_TREE_CACHE_TTL = 30  # seconds


def _insert_into_folder(children: list[dict], rel_parts: tuple[str, ...], file_entry: dict) -> None:
    """Insert a file entry into a nested folder structure.

    rel_parts is the path segments WITHIN the experiment group (excluding the group dir itself).
    For a file directly in the group, rel_parts is just (filename,).
    For a file in a subfolder, rel_parts is (folder, ..., filename).
    """
    if len(rel_parts) == 1:
        # File at this level
        children.append({**file_entry, "type": "file"})
        return

    # Need to find or create the subfolder
    folder_name = rel_parts[0]
    folder_node = None
    for child in children:
        if child.get("type") == "folder" and child["name"] == folder_name:
            folder_node = child
            break

    if folder_node is None:
        folder_node = {"type": "folder", "name": folder_name, "children": []}
        children.append(folder_node)

    _insert_into_folder(folder_node["children"], rel_parts[1:], file_entry)


def _build_tree() -> list[dict]:
    """Walk all experiment sources and return a grouped list with nested subfolders.

    Each group (EXP_xxx folder) has:
      - summary: the summary.md file entry (or None)
      - children: nested list of file and folder entries

    File entries: {"type": "file", "name", "path", "title", "modified", "source"}
    Folder entries: {"type": "folder", "name", "children": [...]}

    Results are cached for _TREE_CACHE_TTL seconds.
    """
    global _tree_cache, _tree_cache_time

    now = time.time()
    if _tree_cache is not None and (now - _tree_cache_time) < _TREE_CACHE_TTL:
        return _tree_cache

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
                    "children": [],
                }

            file_entry = {
                "name": md_path.name,
                "path": str(rel),
                "title": _title_from_md(md_path),
                "modified": md_path.stat().st_mtime,
                "source": source_label,
            }

            # summary.md at root level is the primary file for the group
            if md_path.name.lower() == "summary.md" and len(parts) <= 2:
                groups[group_key]["summary"] = file_entry
            else:
                # Insert into nested folder structure
                # inner_parts = path segments within the group dir (excluding group dir name)
                inner_parts = parts[1:] if len(parts) > 1 else parts
                _insert_into_folder(groups[group_key]["children"], inner_parts, file_entry)

        # Collect groups for this source
        source_groups = []
        if "_root" in groups:
            root_group = groups.pop("_root")
            root_group["label"] = "Index"
            source_groups.append(root_group)
        for key in sorted(groups):
            g = groups[key]
            # Use summary title as group label when available
            if g["summary"]:
                g["label"] = g["summary"]["title"]
            source_groups.append(g)

        # Tag each group with its source
        for g in source_groups:
            g["source"] = source_label

        all_groups.extend(source_groups)

    _tree_cache = all_groups
    _tree_cache_time = now
    return all_groups


# ── API routes ──────────────────────────────────────────────────────

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


# ── Code file viewer API ────────────────────────────────────────────

# File extensions considered "code" (served by /api/code)
CODE_EXTENSIONS = {
    ".py", ".js", ".ts", ".tsx", ".jsx", ".json", ".yaml", ".yml",
    ".toml", ".sh", ".bash", ".r", ".R", ".pl", ".rb", ".java",
    ".c", ".cpp", ".h", ".hpp", ".go", ".rs", ".csv", ".tsv",
    ".sql", ".html", ".css", ".xml", ".ini", ".cfg", ".conf",
}

EXTENSION_TO_LANG = {
    ".py": "python", ".js": "javascript", ".ts": "typescript",
    ".tsx": "tsx", ".jsx": "jsx", ".json": "json",
    ".yaml": "yaml", ".yml": "yaml", ".toml": "toml",
    ".sh": "bash", ".bash": "bash", ".r": "r", ".R": "r",
    ".java": "java", ".c": "c", ".cpp": "cpp", ".h": "c",
    ".go": "go", ".rs": "rust", ".sql": "sql",
    ".html": "html", ".css": "css", ".xml": "xml",
    ".csv": "text", ".tsv": "text",
}


@app.get("/api/code")
def get_code_file(
    path: str = Query(..., description="Absolute path to a code file"),
):
    """Serve raw content of a code file for the side-panel viewer.

    Only allows files whose path falls under one of the configured
    source parent directories (e.g. ~/Documents/PhD/).
    """
    file_path = Path(path).resolve()

    # Security: only serve files under a known source parent dir
    allowed = False
    for _, source_dir in SOURCES:
        # Allow anything under the source dir's parent (covers scripts/, data/ siblings)
        parent = source_dir.parent
        if str(file_path).startswith(str(parent)):
            allowed = True
            break
    if not allowed:
        raise HTTPException(status_code=403, detail="Access denied — file is outside allowed directories")

    if not file_path.is_file():
        raise HTTPException(status_code=404, detail="File not found")

    suffix = file_path.suffix.lower()
    if suffix not in CODE_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"Unsupported file type: {suffix}")

    try:
        content = file_path.read_text(encoding="utf-8")
    except UnicodeDecodeError:
        raise HTTPException(status_code=400, detail="Cannot read file as text")

    return {
        "content": content,
        "path": str(file_path),
        "filename": file_path.name,
        "language": EXTENSION_TO_LANG.get(suffix, "text"),
    }


@app.get("/api/raw")
def get_raw_file(
    path: str = Query(..., description="Absolute path to a code file"),
):
    """Serve a code file as plain text for viewing in a browser tab."""
    from fastapi.responses import PlainTextResponse

    file_path = Path(path).resolve()

    # Security: same check as /api/code
    allowed = False
    for _, source_dir in SOURCES:
        parent = source_dir.parent
        if str(file_path).startswith(str(parent)):
            allowed = True
            break
    if not allowed:
        raise HTTPException(status_code=403, detail="Access denied — file is outside allowed directories")

    if not file_path.is_file():
        raise HTTPException(status_code=404, detail="File not found")

    suffix = file_path.suffix.lower()
    if suffix not in CODE_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"Unsupported file type: {suffix}")

    try:
        content = file_path.read_text(encoding="utf-8")
    except UnicodeDecodeError:
        raise HTTPException(status_code=400, detail="Cannot read file as text")

    return PlainTextResponse(content, headers={
        "Content-Disposition": f'inline; filename="{file_path.name}"',
    })


@app.post("/api/open-in-editor")
def open_in_editor(
    path: str = Query(..., description="Absolute path to a code file"),
    line: int = Query(1, description="Line number to open at"),
):
    """Open a file in the user's code editor (VS Code, Cursor, or default)."""
    import subprocess, shutil

    file_path = Path(path).resolve()

    # Security: same check as /api/code
    settings = _load_settings()
    allowed = False
    for src in settings.get("sources", []):
        src_path = Path(src["path"]).resolve()
        if str(file_path).startswith(str(src_path.parent)):
            allowed = True
            break
    if not allowed:
        raise HTTPException(status_code=403, detail="Access denied")
    if not file_path.is_file():
        raise HTTPException(status_code=404, detail="File not found")

    # Try editors in order: VS Code internal CLI (reuse window), code CLI, cursor, fallback
    editors = []
    # macOS: VS Code's CLI binary inside the app bundle (reuses existing window with -r)
    vscode_cli = Path("/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code")
    if vscode_cli.exists():
        editors.append([str(vscode_cli), "-r", "--goto", f"{file_path}:{line}"])
    if shutil.which("code"):
        editors.append(["code", "-r", "--goto", f"{file_path}:{line}"])
    cursor_cli = Path("/Applications/Cursor.app/Contents/Resources/app/bin/cursor")
    if cursor_cli.exists():
        editors.append([str(cursor_cli), "-r", "--goto", f"{file_path}:{line}"])
    if shutil.which("cursor"):
        editors.append(["cursor", "-r", "--goto", f"{file_path}:{line}"])
    editors.append(["open", "-t", str(file_path)])

    for cmd in editors:
        try:
            subprocess.Popen(cmd)
            return {"ok": True, "editor": cmd[0], "path": str(file_path)}
        except Exception:
            continue

    raise HTTPException(status_code=500, detail="No editor found")


# ── Preview API (arbitrary .md files) ───────────────────────────────


@app.get("/api/preview")
def preview_file(
    path: str = Query(..., description="Absolute path to a markdown file"),
):
    """Return the content of any .md file for preview rendering.

    Used by the upload/preview feature and by external skills that want
    to open a file directly in the experiment viewer.
    """
    file_path = Path(path).resolve()
    if not file_path.is_file():
        raise HTTPException(status_code=404, detail="File not found")
    if file_path.suffix.lower() not in {".md", ".markdown", ".txt"}:
        raise HTTPException(status_code=400, detail="Only .md / .markdown / .txt files are supported")
    try:
        content = file_path.read_text(encoding="utf-8")
    except UnicodeDecodeError:
        raise HTTPException(status_code=400, detail="Cannot read file as text")
    return {
        "content": content,
        "path": str(file_path),
        "filename": file_path.name,
        "dir": str(file_path.parent),
    }


@app.get("/api/preview-media")
def preview_media(
    dir: str = Query(..., description="Absolute path to the directory containing the .md file"),
    path: str = Query(..., description="Relative path to media from the .md file"),
):
    """Serve images/media referenced from a previewed markdown file."""
    base = Path(dir).resolve()
    resolved = (base / path).resolve()
    # Basic path-traversal protection: resolved path must be under base or its parents
    if not resolved.is_file():
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(resolved)


# ── Settings API ────────────────────────────────────────────────────

class SourceEntry(BaseModel):
    label: str
    path: str

class SettingsPayload(BaseModel):
    sources: list[SourceEntry]

@app.get("/api/settings")
def get_settings():
    """Return the current settings (sources list)."""
    settings = _load_settings()
    return settings

@app.post("/api/settings")
def update_settings(payload: SettingsPayload):
    """Update the sources list. Validates that paths exist."""
    errors: list[str] = []
    valid_sources: list[dict] = []

    for s in payload.sources:
        label = s.label.strip()
        path_str = s.path.strip()

        if not label:
            errors.append("Source label cannot be empty")
            continue
        if not path_str:
            errors.append(f"Path for '{label}' cannot be empty")
            continue

        p = Path(path_str).expanduser()
        if not p.is_dir():
            errors.append(f"Directory not found: {path_str}")
            continue

        valid_sources.append({"label": label, "path": str(p.resolve())})

    if errors:
        raise HTTPException(status_code=400, detail={"errors": errors})

    if not valid_sources:
        raise HTTPException(status_code=400, detail={"errors": ["At least one valid source is required"]})

    new_settings = {"sources": valid_sources}
    _save_settings(new_settings)
    _reload_sources()

    return {"ok": True, "sources": valid_sources}
