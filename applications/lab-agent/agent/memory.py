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

## Your Mission
You control and run experiments on the Cryptographic Beings machine — an art/science installation
that uses Marimo moss balls (Aegagropila linnaei) for biological computation. Your job is to:
- Characterise the machine and the biology through systematic experiments
- Write scripts to make the machine fully autonomous and operable
- Plan, execute, and analyse experiments
- Troubleshoot protocols and think about next experiments
- Read and synthesise relevant literature

## Your Principles
1. **Be cautious with hardware** — always test small first (PING before MOVE, small steps before large)
2. **Document everything** — log actions and reasoning to experiment LOG.md files
3. **Validate before committing** — check results after every action
4. **Think scientifically** — form hypotheses, design experiments, analyse data rigorously

## Available Tools
You have tools for: reading/writing files, running commands, making HTTP requests,
controlling the Cryptographic Beings machine, and searching the paper/experiment corpus.
Use them to accomplish your goals autonomously.

## Workspace
The workspace is at /opt/synthetica-lab. Key directories:
- experiments/ — experiment folders (EXP_001, EXP_002, etc.)
- papers_txt/ — extracted paper texts with INDEX.md
- applications/ — lab applications and tools
- scripts/ — utility scripts

"""

    # Architecture knowledge
    arch = _read_file("applications/lab-agent/ARCHITECTURE.md")
    if arch:
        prompt += "## Lab Architecture\n\n"
        prompt += arch + "\n\n"

    # Load skills
    skills_dir = os.path.join(WORKSPACE, "applications", "lab-agent", "skills")
    if os.path.isdir(skills_dir):
        skill_files = sorted(f for f in os.listdir(skills_dir) if f.endswith(".md"))
        if skill_files:
            prompt += "## Your Skills\n\n"
            prompt += "You have the following skills. Follow these instructions when performing these tasks:\n\n"
            for sf in skill_files:
                skill_content = _read_file(os.path.join(skills_dir, sf))
                if skill_content:
                    prompt += f"### Skill: {sf.replace('.md', '').replace('_', ' ').title()}\n\n"
                    prompt += skill_content + "\n\n"

    # EXP_003 domain knowledge (Marimo buoyancy model) — background biology context
    exp003_summary = _read_file("experiments/EXP_003/summary.md")
    if exp003_summary:
        prompt += "## Background Biology Knowledge (from EXP_003)\n\n"
        prompt += "The following summarises what we know about Marimo buoyancy from modelling work. "
        prompt += "Use this as domain knowledge, NOT as your primary task.\n\n"
        prompt += exp003_summary + "\n\n"

    # Active experiment context
    if active_experiment:
        exp_summary = _read_file(f"experiments/{active_experiment}/summary.md")
        if exp_summary:
            prompt += f"## Active Experiment: {active_experiment}\n\n"
            prompt += "This is your current working experiment. Read it carefully.\n\n"
            prompt += exp_summary + "\n\n"
        exp_log = _read_file(f"experiments/{active_experiment}/LOG.md")
        if exp_log:
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
