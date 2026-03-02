"""
Terminal tools: execute shell commands, run Python scripts.
"""

import subprocess
import os

WORKSPACE = os.environ.get("LAB_WORKSPACE", "/opt/synthetica-lab")


def run_command(command: str, cwd: str = "") -> str:
    """Execute a shell command and return stdout + stderr."""
    work_dir = cwd if cwd and os.path.isdir(cwd) else WORKSPACE
    try:
        result = subprocess.run(
            command,
            shell=True,
            capture_output=True,
            text=True,
            timeout=120,
            cwd=work_dir,
        )
        output = ""
        if result.stdout:
            output += result.stdout
        if result.stderr:
            output += ("\n" if output else "") + result.stderr
        if result.returncode != 0:
            output += f"\n[exit code: {result.returncode}]"
        # Truncate long output
        if len(output) > 20000:
            output = output[:20000] + f"\n\n... [TRUNCATED — {len(output)} chars total]"
        return output.strip() or "(no output)"
    except subprocess.TimeoutExpired:
        return "ERROR: Command timed out after 120 seconds"
    except Exception as e:
        return f"ERROR: {type(e).__name__}: {e}"


def run_python(script_path: str, args: str = "") -> str:
    """Run a Python script and return its output."""
    full_path = script_path if os.path.isabs(script_path) else os.path.join(WORKSPACE, script_path)
    if not os.path.exists(full_path):
        return f"ERROR: Script not found: {full_path}"
    cmd = f"python3 {full_path}"
    if args:
        cmd += f" {args}"
    return run_command(cmd, cwd=os.path.dirname(full_path))


TERMINAL_TOOLS = {
    "run_command": {
        "function": run_command,
        "description": "Execute a shell command on the server. Returns stdout and stderr. Use for git, pio, system commands, etc.",
        "parameters": {
            "type": "object",
            "properties": {
                "command": {"type": "string", "description": "Shell command to execute"},
                "cwd": {"type": "string", "description": "Working directory (optional, defaults to workspace root)"},
            },
            "required": ["command"],
        },
    },
    "run_python": {
        "function": run_python,
        "description": "Run a Python script and return its output.",
        "parameters": {
            "type": "object",
            "properties": {
                "script_path": {"type": "string", "description": "Path to the Python script"},
                "args": {"type": "string", "description": "Command-line arguments (optional)"},
            },
            "required": ["script_path"],
        },
    },
}
