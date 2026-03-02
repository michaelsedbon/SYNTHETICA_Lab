"""
Core agent loop: Think → Act → Observe.
Integrates with Ollama for LLM inference and the tool registry for actions.
"""

import json
import time
import os
from typing import Optional, Generator

from .tools import get_tool_schemas, execute_tool, TOOL_REGISTRY
from .timeline import Timeline
from .memory import build_system_prompt, trim_conversation

OLLAMA_HOST = os.environ.get("OLLAMA_HOST", "http://localhost:11434")
MODEL = os.environ.get("AGENT_MODEL", "qwen2.5:14b")
DATA_DIR = os.environ.get("AGENT_DATA_DIR", "data/sessions")


def _ollama_chat(messages: list[dict], tools: list[dict] = None) -> dict:
    """Call Ollama chat API with tool support."""
    import urllib.request

    payload = {
        "model": MODEL,
        "messages": messages,
        "stream": False,
        "options": {
            "temperature": 0.3,
            "num_predict": 4096,
        },
    }
    if tools:
        payload["tools"] = tools

    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        f"{OLLAMA_HOST}/api/chat",
        data=data,
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    with urllib.request.urlopen(req, timeout=300) as resp:
        return json.loads(resp.read().decode("utf-8"))


class Agent:
    """
    Autonomous lab agent with tool-calling capabilities.
    Runs the think→act→observe loop against Ollama.
    """

    def __init__(
        self,
        session_id: str,
        agent_id: str = "default",
        active_experiment: str = None,
        data_dir: str = None,
    ):
        self.session_id = session_id
        self.agent_id = agent_id
        self.active_experiment = active_experiment
        self.data_dir = data_dir or DATA_DIR

        # Build system prompt
        self.system_prompt = build_system_prompt(active_experiment)

        # Initialize timeline
        self.timeline = Timeline(session_id, self.data_dir, agent_id)

        # Conversation history
        self.messages: list[dict] = [
            {"role": "system", "content": self.system_prompt}
        ]

        # Tool schemas for Ollama
        self.tool_schemas = get_tool_schemas()

        # State
        self.is_running = False
        self.max_iterations = 20  # Safety: max tool-call loops per user message

        self.timeline.log("info", "Agent initialized", f"Model: {MODEL}, Experiment: {active_experiment}")

    def chat(self, user_message: str) -> Generator[dict, None, None]:
        """
        Process a user message through the agent loop.
        Yields timeline events as they happen (for streaming to the UI).
        Uses self-prompting to keep working until the goal is achieved.
        """
        self.is_running = True
        self.messages.append({"role": "user", "content": user_message})
        original_goal = user_message  # Remember what we're trying to achieve

        # Log user message
        event = self.timeline.log("info", "User message", user_message)
        yield event.to_dict()

        iteration = 0
        tool_calls_made = 0
        self_prompts_sent = 0
        max_self_prompts = 5   # Max times we'll ask "are you done?"

        while iteration < self.max_iterations:
            iteration += 1

            # Trim conversation to fit context window
            trimmed = trim_conversation(self.messages, max_tokens=12000)

            # Call Ollama
            thinking_event = self.timeline.log("reasoning", "Calling LLM", f"Iteration {iteration}/{self.max_iterations}")
            yield thinking_event.to_dict()

            try:
                start = time.time()
                response = _ollama_chat(trimmed, self.tool_schemas)
                llm_duration = int((time.time() - start) * 1000)
            except Exception as e:
                error_event = self.timeline.log("error", "LLM call failed", str(e))
                yield error_event.to_dict()
                self.is_running = False
                return

            message = response.get("message", {})
            content = message.get("content", "")
            tool_calls = message.get("tool_calls", [])

            # Add assistant message to history
            self.messages.append(message)

            # If there's text content, log it
            if content:
                reasoning_event = self.timeline.log(
                    "reasoning", "LLM response",
                    content,
                    duration_ms=llm_duration,
                )
                yield reasoning_event.to_dict()

            # If no tool calls — agent wants to stop. Check if goal is done.
            if not tool_calls:
                if self_prompts_sent < max_self_prompts:
                    self_prompts_sent += 1
                    check = (
                        f"STOP and EVALUATE. The original goal was:\n"
                        f"\"{original_goal}\"\n\n"
                        f"You have made {tool_calls_made} tool calls so far.\n"
                        f"Is this goal FULLY achieved? Have you:\n"
                        f"- Completed ALL requested steps?\n"
                        f"- Written results/logs as requested?\n"
                        f"- Verified the results make sense?\n\n"
                        f"If YES and everything is done, respond with exactly: DONE\n"
                        f"If NO, continue working — use your tools to complete the remaining steps."
                    )
                    self.messages.append({"role": "user", "content": check})
                    check_event = self.timeline.log(
                        "reasoning", "Self-check",
                        f"Checking if goal is achieved ({self_prompts_sent}/{max_self_prompts}). "
                        f"Tool calls so far: {tool_calls_made}",
                    )
                    yield check_event.to_dict()

                    # Get the LLM's self-evaluation
                    iteration += 1
                    try:
                        eval_response = _ollama_chat(
                            trim_conversation(self.messages, max_tokens=12000),
                            self.tool_schemas,
                        )
                    except Exception:
                        break  # LLM error — just stop

                    eval_msg = eval_response.get("message", {})
                    eval_content = eval_msg.get("content", "")
                    eval_tools = eval_msg.get("tool_calls", [])
                    self.messages.append(eval_msg)

                    if eval_tools:
                        # LLM decided to keep working with tool calls
                        self.timeline.log("reasoning", "Continuing",
                            f"Agent decided goal is NOT done — making more tool calls")
                        # Fall through to tool execution below
                        tool_calls = eval_tools
                        content = eval_content
                        if content:
                            yield self.timeline.log(
                                "reasoning", "LLM response", content
                            ).to_dict()
                    elif "DONE" in eval_content.upper():
                        # Agent confirms it's done
                        self.timeline.log("decision", "Goal achieved",
                            f"Agent confirmed goal is complete after {tool_calls_made} tool calls.")
                        self.is_running = False
                        return
                    else:
                        # Agent gave text but didn't say DONE — nudge once more
                        self.messages.append(eval_msg)
                        continue
                else:
                    # Max self-prompts reached — stop
                    self.timeline.log("decision", "Response complete",
                        f"Max self-prompts reached. {content or '(no content)'}")
                    self.is_running = False
                    return

            # Execute tool calls
            for tc in tool_calls:
                fn = tc.get("function", {})
                tool_name = fn.get("name", "unknown")
                tool_args = fn.get("arguments", {})

                # Log the call
                self.timeline.log(
                    "tool_call", f"Calling {tool_name}",
                    json.dumps(tool_args, indent=2),
                    tool_name=tool_name,
                    tool_input=tool_args,
                )

                # Execute
                start = time.time()
                result = execute_tool(tool_name, tool_args)
                exec_duration = int((time.time() - start) * 1000)
                tool_calls_made += 1

                # Detect files touched
                files_touched = []
                if tool_name in ("file_write", "file_edit") and "path" in tool_args:
                    files_touched.append(tool_args["path"])

                # Log result
                tool_event = self.timeline.log_tool_call(
                    tool_name, tool_args, result,
                    duration_ms=exec_duration,
                    files_touched=files_touched,
                    experiment=self.active_experiment,
                )
                yield tool_event.to_dict()

                # Add tool result to conversation
                self.messages.append({
                    "role": "tool",
                    "content": result,
                })

        # If we hit max iterations
        warning = self.timeline.log(
            "error", "Max iterations reached",
            f"Agent stopped after {self.max_iterations} tool-call iterations",
        )
        yield warning.to_dict()
        self.is_running = False

    def get_status(self) -> dict:
        """Get current agent status."""
        return {
            "session_id": self.session_id,
            "agent_id": self.agent_id,
            "model": MODEL,
            "is_running": self.is_running,
            "active_experiment": self.active_experiment,
            "message_count": len(self.messages),
            "event_count": len(self.timeline.events),
        }
