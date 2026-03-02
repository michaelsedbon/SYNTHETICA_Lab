"""
Dual LLM backend: Ollama (local) + Gemini (cloud).
Both return a unified response format for core.py to consume.
"""

import json
import os
import urllib.request
import urllib.error
from typing import Optional

# ── Config ──────────────────────────────────────────────────────────

OLLAMA_HOST = os.environ.get("OLLAMA_HOST", "http://localhost:11434")
OLLAMA_MODEL = os.environ.get("AGENT_MODEL", "qwen2.5:14b")
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
GEMINI_MODEL = os.environ.get("GEMINI_MODEL", "gemini-2.5-flash")
GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta"


def has_gemini() -> bool:
    """Check if Gemini is configured."""
    return bool(GEMINI_API_KEY)


# ── Ollama Backend ──────────────────────────────────────────────────

def ollama_chat(
    messages: list[dict],
    tools: Optional[list[dict]] = None,
    temperature: float = 0.3,
    max_tokens: int = 4096,
) -> dict:
    """Call Ollama chat API. Returns {"content": str, "tool_calls": list}."""
    payload = {
        "model": OLLAMA_MODEL,
        "messages": messages,
        "stream": False,
        "options": {
            "temperature": temperature,
            "num_predict": max_tokens,
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
        raw = json.loads(resp.read().decode("utf-8"))

    message = raw.get("message", {})
    return {
        "content": message.get("content", ""),
        "tool_calls": message.get("tool_calls", []),
        "raw_message": message,  # For appending to conversation history
    }


# ── Gemini Backend ──────────────────────────────────────────────────

def _messages_to_gemini(messages: list[dict]) -> tuple[Optional[dict], list[dict]]:
    """Convert OpenAI-style messages to Gemini format.

    Returns (system_instruction, contents).
    """
    system_text = None
    contents = []

    for msg in messages:
        role = msg.get("role", "user")
        content = msg.get("content", "")

        if role == "system":
            system_text = content
        elif role == "user":
            contents.append({
                "role": "user",
                "parts": [{"text": content}],
            })
        elif role == "assistant":
            contents.append({
                "role": "model",
                "parts": [{"text": content}],
            })
        elif role == "tool":
            # Tool results go as user messages in Gemini
            contents.append({
                "role": "user",
                "parts": [{"text": f"[Tool result]: {content}"}],
            })

    system_instruction = None
    if system_text:
        system_instruction = {"parts": [{"text": system_text}]}

    return system_instruction, contents


def gemini_chat(
    messages: list[dict],
    temperature: float = 0.3,
    max_tokens: int = 8192,
) -> dict:
    """Call Gemini API. Returns {"content": str, "tool_calls": []}.

    Note: We don't use Gemini's native tool calling — the planner and
    reflector only need text responses. Tool execution stays on Ollama.
    """
    system_instruction, contents = _messages_to_gemini(messages)

    payload: dict = {
        "contents": contents,
        "generationConfig": {
            "temperature": temperature,
            "maxOutputTokens": max_tokens,
        },
    }
    if system_instruction:
        payload["systemInstruction"] = system_instruction

    url = f"{GEMINI_BASE}/models/{GEMINI_MODEL}:generateContent?key={GEMINI_API_KEY}"
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=data,
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            raw = json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        error_body = e.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"Gemini API error {e.code}: {error_body}") from e

    # Extract text from response
    candidates = raw.get("candidates", [])
    if not candidates:
        return {"content": "(Gemini returned no response)", "tool_calls": []}

    parts = candidates[0].get("content", {}).get("parts", [])
    text = "".join(p.get("text", "") for p in parts)

    return {
        "content": text,
        "tool_calls": [],  # Gemini is only used for planning/reflection, not tool calls
    }
