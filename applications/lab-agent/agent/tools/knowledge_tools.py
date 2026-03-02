"""
Knowledge tools: search and read from the paper corpus and experiment index.
"""

import os
import re

WORKSPACE = os.environ.get("LAB_WORKSPACE", "/opt/synthetica-lab")


def search_papers(query: str) -> str:
    """Search the paper index for papers matching a query.
    Returns matching entries from papers_txt/INDEX.md."""
    index_path = os.path.join(WORKSPACE, "papers_txt", "INDEX.md")
    if not os.path.exists(index_path):
        return "ERROR: Paper index not found at papers_txt/INDEX.md"

    with open(index_path, "r", encoding="utf-8") as f:
        content = f.read()

    # Split into paper sections (each starts with ##)
    sections = re.split(r'\n(?=## )', content)
    query_lower = query.lower()

    matches = []
    for section in sections:
        if query_lower in section.lower():
            matches.append(section.strip())

    if not matches:
        return f"No papers found matching '{query}'"

    result = f"Found {len(matches)} paper(s) matching '{query}':\n\n"
    result += "\n\n---\n\n".join(matches[:5])  # Limit to 5
    return result


def read_paper(filename: str) -> str:
    """Read the full text of a paper from papers_txt/."""
    # Try both directories
    for base_dir in ["papers_txt", "agent_papers_txt"]:
        path = os.path.join(WORKSPACE, base_dir, filename)
        if os.path.exists(path):
            with open(path, "r", encoding="utf-8", errors="replace") as f:
                content = f.read()
            if len(content) > 50000:
                return content[:50000] + "\n\n... [TRUNCATED]"
            return content

    return f"ERROR: Paper not found: {filename}"


def search_experiments(query: str) -> str:
    """Search the experiment index for experiments matching a query."""
    index_path = os.path.join(WORKSPACE, "experiments", "EXP_INDEX.md")
    if not os.path.exists(index_path):
        return "ERROR: Experiment index not found"

    with open(index_path, "r", encoding="utf-8") as f:
        content = f.read()

    sections = re.split(r'\n(?=## )', content)
    query_lower = query.lower()

    matches = []
    for section in sections:
        if query_lower in section.lower():
            matches.append(section.strip())

    if not matches:
        return f"No experiments found matching '{query}'"

    return f"Found {len(matches)} experiment(s):\n\n" + "\n\n---\n\n".join(matches)


def search_sessions(query: str, max_results: int = 10) -> str:
    """Search past agent session logs for events matching a query.
    Enables the agent to recall what it did in previous sessions."""
    import json as _json

    data_dir = os.environ.get("AGENT_DATA_DIR", os.path.join(
        WORKSPACE, "applications", "lab-agent", "data", "sessions"))

    if not os.path.isdir(data_dir):
        return "No session data found."

    query_lower = query.lower()
    matches = []

    for fname in sorted(os.listdir(data_dir), reverse=True):
        if not fname.endswith(".jsonl"):
            continue
        session_id = fname.replace(".jsonl", "")
        fpath = os.path.join(data_dir, fname)
        try:
            with open(fpath, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if not line:
                        continue
                    event = _json.loads(line)
                    searchable = " ".join([
                        event.get("title", ""),
                        event.get("content", ""),
                        event.get("tool_name", ""),
                        event.get("tool_output", ""),
                    ]).lower()
                    if query_lower in searchable:
                        matches.append({
                            "session": session_id,
                            "time": event.get("timestamp", ""),
                            "type": event.get("event_type", ""),
                            "title": event.get("title", ""),
                            "content": event.get("content", "")[:200],
                        })
                        if len(matches) >= max_results:
                            break
        except Exception:
            continue
        if len(matches) >= max_results:
            break

    if not matches:
        return f"No past events matching '{query}'"

    result = f"Found {len(matches)} past event(s) matching '{query}':\n\n"
    for m in matches:
        result += f"[{m['time']}] ({m['type']}) {m['title']}\n"
        if m['content']:
            result += f"  {m['content']}\n"
        result += f"  Session: {m['session']}\n\n"
    return result


KNOWLEDGE_TOOLS = {
    "search_papers": {
        "function": search_papers,
        "description": "Search the paper corpus index for papers matching a query term. Returns paper summaries and metadata.",
        "parameters": {
            "type": "object",
            "properties": {
                "query": {"type": "string", "description": "Search query (title, author, topic, etc.)"},
            },
            "required": ["query"],
        },
    },
    "read_paper": {
        "function": read_paper,
        "description": "Read the full extracted text of a paper. Use search_papers first to find the filename.",
        "parameters": {
            "type": "object",
            "properties": {
                "filename": {"type": "string", "description": "Filename of the paper text (e.g. 'Phillips_2019_Marimo.txt')"},
            },
            "required": ["filename"],
        },
    },
    "search_experiments": {
        "function": search_experiments,
        "description": "Search the experiment index for experiments matching a query.",
        "parameters": {
            "type": "object",
            "properties": {
                "query": {"type": "string", "description": "Search query (experiment name, topic, etc.)"},
            },
            "required": ["query"],
        },
    },
    "search_sessions": {
        "function": search_sessions,
        "description": "Search past agent session logs for events matching a query. Use this to recall what you did previously, find past results, or check if something was already attempted.",
        "parameters": {
            "type": "object",
            "properties": {
                "query": {"type": "string", "description": "Search query (tool name, topic, error message, etc.)"},
                "max_results": {"type": "integer", "description": "Maximum results to return (default 10)"},
            },
            "required": ["query"],
        },
    },
}

