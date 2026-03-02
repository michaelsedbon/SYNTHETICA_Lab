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
}
