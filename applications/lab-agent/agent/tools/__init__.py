"""
Tool registry for the SYNTHETICA Lab Agent.
Each tool is a callable with a JSON schema describing its parameters.
"""

from .file_tools import FILE_TOOLS
from .terminal_tools import TERMINAL_TOOLS
from .http_tools import HTTP_TOOLS
from .machine_tools import MACHINE_TOOLS
from .knowledge_tools import KNOWLEDGE_TOOLS

# Master registry: name → (function, schema)
TOOL_REGISTRY: dict = {}

for tool_set in [FILE_TOOLS, TERMINAL_TOOLS, HTTP_TOOLS, MACHINE_TOOLS, KNOWLEDGE_TOOLS]:
    TOOL_REGISTRY.update(tool_set)


def get_tool_schemas() -> list[dict]:
    """Return all tool schemas in Ollama function-calling format."""
    return [
        {
            "type": "function",
            "function": {
                "name": name,
                "description": spec["description"],
                "parameters": spec["parameters"],
            },
        }
        for name, spec in TOOL_REGISTRY.items()
    ]


def execute_tool(name: str, arguments: dict) -> str:
    """Execute a tool by name with the given arguments."""
    if name not in TOOL_REGISTRY:
        return f"ERROR: Unknown tool '{name}'"
    try:
        fn = TOOL_REGISTRY[name]["function"]
        result = fn(**arguments)
        return str(result)
    except Exception as e:
        return f"ERROR: {type(e).__name__}: {e}"
