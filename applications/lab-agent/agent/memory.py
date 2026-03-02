"""
Memory and context manager for the Lab Agent.
Builds the system prompt from MANIFEST.md, experiment knowledge, and active context.
"""

import os

WORKSPACE = os.environ.get("LAB_WORKSPACE", "/opt/synthetica-lab")


def _read_file(path: str) -> str:
    """Safely read a file, return empty string if not found."""
    full = path if os.path.isabs(path) else os.path.join(WORKSPACE, path)
    try:
        with open(full, "r", encoding="utf-8", errors="replace") as f:
            return f.read()
    except FileNotFoundError:
        return ""


def build_system_prompt(active_experiment: str = None) -> str:
    """Build the system prompt with lab context and domain knowledge."""

    # Core identity
    prompt = """You are the SYNTHETICA Lab Agent — an autonomous AI scientist running on a local server.
You have full access to the lab workspace, experiment files, paper corpus, and the Cryptographic Beings machine.

## Your Principles
1. **Be cautious with hardware** — always test small first (PING before MOVE, small steps before large ones)
2. **Document everything** — log your actions and reasoning to experiment LOG.md files
3. **Validate before committing** — check results after every action
4. **Think scientifically** — form hypotheses, design experiments, analyze data rigorously
5. **Keep summaries updated** — after significant changes, update summary.md

## Available Tools
You have tools for: reading/writing files, running commands, making HTTP requests,
controlling the Cryptographic Beings machine, and searching the paper/experiment corpus.
Use them to accomplish your goals autonomously.

"""

    # Lab manifest
    manifest = _read_file("MANIFEST.md")  
    if manifest:
        prompt += "## Lab Manifest\n\n"
        # Only include the key sections, not the full manifest
        for section in ["Key Directories", "Experiment Conventions", "Skills"]:
            start = manifest.find(f"## {section}")
            if start >= 0:
                end = manifest.find("\n## ", start + 1)
                prompt += manifest[start:end if end > 0 else len(manifest)] + "\n\n"

    # EXP_003 domain knowledge (Marimo buoyancy model)
    exp003_summary = _read_file("experiments/EXP_003/summary.md")
    if exp003_summary:
        prompt += "## Domain Knowledge: Marimo Buoyancy Model (EXP_003)\n\n"
        prompt += exp003_summary + "\n\n"

    # Active experiment context
    if active_experiment:
        exp_summary = _read_file(f"experiments/{active_experiment}/summary.md")
        if exp_summary:
            prompt += f"## Active Experiment: {active_experiment}\n\n"
            prompt += exp_summary + "\n\n"
        exp_log = _read_file(f"experiments/{active_experiment}/LOG.md")
        if exp_log:
            # Only include last 2000 chars of the log
            if len(exp_log) > 2000:
                exp_log = "...\n" + exp_log[-2000:]
            prompt += f"## Recent Log ({active_experiment})\n\n"
            prompt += exp_log + "\n\n"

    return prompt


def trim_conversation(messages: list[dict], max_tokens: int = 12000) -> list[dict]:
    """Trim conversation history to fit within context window.
    Keeps system prompt + last N messages.
    Rough estimate: 1 token ≈ 4 chars.
    """
    if not messages:
        return messages

    # Always keep the system prompt (first message)
    system = [m for m in messages if m.get("role") == "system"]
    others = [m for m in messages if m.get("role") != "system"]

    # Estimate total chars
    max_chars = max_tokens * 4
    system_chars = sum(len(str(m.get("content", ""))) for m in system)
    budget = max_chars - system_chars

    # Keep messages from the end until we exceed budget
    kept = []
    total = 0
    for msg in reversed(others):
        msg_size = len(str(msg.get("content", "")))
        if total + msg_size > budget:
            break
        kept.insert(0, msg)
        total += msg_size

    return system + kept
