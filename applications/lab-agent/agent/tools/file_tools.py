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
}
