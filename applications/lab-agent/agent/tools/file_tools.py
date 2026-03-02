"""
File operation tools: read, write, edit, list directory.
"""

import os
from pathlib import Path

# Workspace root (read from env or default)
WORKSPACE = os.environ.get("LAB_WORKSPACE", "/opt/synthetica-lab")


def _resolve(path: str) -> str:
    """Resolve a relative path against the workspace root."""
    if os.path.isabs(path):
        return path
    return os.path.join(WORKSPACE, path)


def file_read(path: str) -> str:
    """Read the contents of a file."""
    resolved = _resolve(path)
    if not os.path.exists(resolved):
        return f"ERROR: File not found: {resolved}"
    with open(resolved, "r", encoding="utf-8", errors="replace") as f:
        content = f.read()
    # Truncate very large files
    if len(content) > 50000:
        return content[:50000] + f"\n\n... [TRUNCATED — file is {len(content)} chars]"
    return content


def file_write(path: str, content: str) -> str:
    """Write content to a file. Creates parent directories if needed."""
    resolved = _resolve(path)
    os.makedirs(os.path.dirname(resolved), exist_ok=True)
    with open(resolved, "w", encoding="utf-8") as f:
        f.write(content)
    return f"OK: Written {len(content)} chars to {resolved}"


def file_edit(path: str, search: str, replace: str) -> str:
    """Edit a file by replacing the first occurrence of 'search' with 'replace'."""
    resolved = _resolve(path)
    if not os.path.exists(resolved):
        return f"ERROR: File not found: {resolved}"
    with open(resolved, "r", encoding="utf-8") as f:
        content = f.read()
    if search not in content:
        return f"ERROR: Search string not found in {resolved}"
    new_content = content.replace(search, replace, 1)
    with open(resolved, "w", encoding="utf-8") as f:
        f.write(new_content)
    return f"OK: Replaced in {resolved}"


def list_directory(path: str) -> str:
    """List contents of a directory."""
    resolved = _resolve(path)
    if not os.path.isdir(resolved):
        return f"ERROR: Not a directory: {resolved}"
    entries = []
    for name in sorted(os.listdir(resolved)):
        full = os.path.join(resolved, name)
        if os.path.isdir(full):
            entries.append(f"  📁 {name}/")
        else:
            size = os.path.getsize(full)
            entries.append(f"  📄 {name} ({size} bytes)")
    return f"{resolved}/\n" + "\n".join(entries)


def create_experiment(experiment_id: str, title: str, description: str = "") -> str:
    """Create a new experiment folder with all required template files."""
    from datetime import datetime
    exp_dir = os.path.join(WORKSPACE, "experiments", experiment_id)
    if os.path.exists(exp_dir):
        return f"ERROR: {experiment_id} already exists at {exp_dir}"

    os.makedirs(exp_dir, exist_ok=True)
    date = datetime.now().strftime("%Y-%m-%d")

    # summary.md
    with open(os.path.join(exp_dir, "summary.md"), "w") as f:
        f.write(f"# {title}\n\n")
        f.write(f"**Experiment ID:** {experiment_id}\n")
        f.write(f"**Created:** {date}\n")
        f.write(f"**Status:** In Progress\n\n")
        f.write(f"## Objective\n\n{description or 'TODO: describe the objective'}\n\n")
        f.write("## Method\n\nTODO: describe the experimental method\n\n")
        f.write("## Expected Results\n\nTODO: describe what you expect to find\n")

    # LOG.md
    with open(os.path.join(exp_dir, "LOG.md"), "w") as f:
        f.write(f"# {experiment_id} — Experiment Log\n\n")
        f.write(f"## {date} — Experiment created\n\n")
        f.write(f"Created experiment: **{title}**\n\n")
        if description:
            f.write(f"Objective: {description}\n")

    # SCRIPT_INDEX.md
    with open(os.path.join(exp_dir, "SCRIPT_INDEX.md"), "w") as f:
        f.write(f"# {experiment_id} — Script Index\n\n")
        f.write("List all scripts used in this experiment.\n\n")
        f.write("| Script | Description | Language |\n")
        f.write("|--------|-------------|----------|\n")
        f.write("| *(none yet)* | | |\n")

    # DOC_INDEX.md
    with open(os.path.join(exp_dir, "DOC_INDEX.md"), "w") as f:
        f.write(f"# {experiment_id} — Document Index\n\n")
        f.write("List all documents, datasheets, and references.\n\n")
        f.write("| Document | Description | Type |\n")
        f.write("|----------|-------------|------|\n")
        f.write("| *(none yet)* | | |\n")

    return f"OK: Created experiment {experiment_id} at {exp_dir} with summary.md, LOG.md, SCRIPT_INDEX.md, DOC_INDEX.md"


FILE_TOOLS = {
    "file_read": {
        "function": file_read,
        "description": "Read the contents of a file. Path can be absolute or relative to the workspace.",
        "parameters": {
            "type": "object",
            "properties": {
                "path": {"type": "string", "description": "File path to read"},
            },
            "required": ["path"],
        },
    },
    "file_write": {
        "function": file_write,
        "description": "Write content to a file. Creates parent directories if needed.",
        "parameters": {
            "type": "object",
            "properties": {
                "path": {"type": "string", "description": "File path to write to"},
                "content": {"type": "string", "description": "Content to write"},
            },
            "required": ["path", "content"],
        },
    },
    "file_edit": {
        "function": file_edit,
        "description": "Edit a file by replacing the first occurrence of a search string with a replacement string.",
        "parameters": {
            "type": "object",
            "properties": {
                "path": {"type": "string", "description": "File path to edit"},
                "search": {"type": "string", "description": "Exact text to find"},
                "replace": {"type": "string", "description": "Replacement text"},
            },
            "required": ["path", "search", "replace"],
        },
    },
    "list_directory": {
        "function": list_directory,
        "description": "List the contents of a directory (files and subdirectories).",
        "parameters": {
            "type": "object",
            "properties": {
                "path": {"type": "string", "description": "Directory path to list"},
            },
            "required": ["path"],
        },
    },
    "create_experiment": {
        "function": create_experiment,
        "description": "Create a new experiment folder with all required template files (summary.md, LOG.md, SCRIPT_INDEX.md, DOC_INDEX.md). Use the next available EXP_XXX ID.",
        "parameters": {
            "type": "object",
            "properties": {
                "experiment_id": {"type": "string", "description": "Experiment ID (e.g. 'EXP_004')"},
                "title": {"type": "string", "description": "Experiment title"},
                "description": {"type": "string", "description": "Brief description of the objective"},
            },
            "required": ["experiment_id", "title"],
        },
    },
}

