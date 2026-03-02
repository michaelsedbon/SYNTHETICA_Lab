"""
Telegram bot bridge for the lab agent.
Allows sending messages to the agent via Telegram and receiving responses.

Uses long-polling (no webhook needed) — works behind NAT/firewalls.
No external dependencies: uses only urllib (Telegram Bot API is simple REST).
"""

import asyncio
import json
import os
import urllib.request
import urllib.error
from typing import Optional, Callable, Awaitable

TELEGRAM_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN", "")
TELEGRAM_CHAT_ID = os.environ.get("TELEGRAM_CHAT_ID", "")  # Restrict to one chat
TELEGRAM_API = "https://api.telegram.org/bot"


def is_configured() -> bool:
    """Check if Telegram is configured."""
    return bool(TELEGRAM_TOKEN)


def _api_call(method: str, params: dict = None) -> dict:
    """Call a Telegram Bot API method."""
    url = f"{TELEGRAM_API}{TELEGRAM_TOKEN}/{method}"
    if params:
        data = json.dumps(params).encode("utf-8")
        req = urllib.request.Request(
            url, data=data,
            headers={"Content-Type": "application/json"},
            method="POST",
        )
    else:
        req = urllib.request.Request(url)

    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        return {"ok": False, "error": e.read().decode("utf-8", errors="replace")}
    except Exception as e:
        return {"ok": False, "error": str(e)}


def send_message(chat_id: str, text: str, parse_mode: str = "Markdown") -> dict:
    """Send a message to a Telegram chat."""
    # Telegram has a 4096 char limit per message
    if len(text) > 4000:
        text = text[:4000] + "\n\n... (truncated)"

    return _api_call("sendMessage", {
        "chat_id": chat_id,
        "text": text,
        "parse_mode": parse_mode,
    })


def get_updates(offset: int = 0, timeout: int = 30) -> list[dict]:
    """Long-poll for new messages."""
    result = _api_call("getUpdates", {
        "offset": offset,
        "timeout": timeout,
        "allowed_updates": ["message"],
    })
    if result.get("ok"):
        return result.get("result", [])
    return []


class TelegramBot:
    """Telegram bot that bridges messages to/from the lab agent."""

    def __init__(self):
        self._running = False
        self._offset = 0
        self._agent_callback: Optional[Callable] = None
        self._authorized_chat_id = TELEGRAM_CHAT_ID or None

    def set_agent_callback(self, callback: Callable[[str, str], Awaitable[str]]):
        """Set the function to call when a message is received.
        Callback: async def callback(message: str, chat_id: str) -> str
        """
        self._agent_callback = callback

    async def run_loop(self):
        """Main bot loop — long-polls for messages and dispatches to agent."""
        if not is_configured():
            print("[Telegram] No TELEGRAM_BOT_TOKEN set, bot disabled.")
            return

        self._running = True
        print(f"[Telegram] Bot started. Listening for messages...")

        # Get bot info
        me = _api_call("getMe")
        if me.get("ok"):
            name = me["result"].get("username", "unknown")
            print(f"[Telegram] Bot: @{name}")

        while self._running:
            try:
                updates = await asyncio.get_event_loop().run_in_executor(
                    None, lambda: get_updates(self._offset, timeout=30)
                )

                for update in updates:
                    self._offset = update["update_id"] + 1
                    message = update.get("message", {})
                    text = message.get("text", "")
                    chat_id = str(message.get("chat", {}).get("id", ""))
                    user = message.get("from", {}).get("first_name", "Unknown")

                    if not text or not chat_id:
                        continue

                    # Authorization check
                    if self._authorized_chat_id and chat_id != self._authorized_chat_id:
                        send_message(chat_id, "⛔ Unauthorized. Set TELEGRAM_CHAT_ID to allow this chat.")
                        print(f"[Telegram] Rejected message from chat {chat_id} ({user})")
                        continue

                    # If first message and no chat ID set, auto-register
                    if not self._authorized_chat_id:
                        self._authorized_chat_id = chat_id
                        print(f"[Telegram] Auto-registered chat {chat_id} ({user})")
                        send_message(chat_id, f"✅ Registered! Chat ID: `{chat_id}`\nSet this as TELEGRAM_CHAT_ID env var to persist.")

                    print(f"[Telegram] {user}: {text[:100]}")

                    # Handle /start command
                    if text.startswith("/start"):
                        send_message(chat_id,
                            "🧬 *SYNTHETICA Lab Agent*\n\n"
                            "Send me any message and I'll execute it as a lab task.\n\n"
                            "Examples:\n"
                            "• `Check machine status`\n"
                            "• `Calibrate the motor`\n"
                            "• `Search papers on marimo buoyancy`\n\n"
                            "Use /status to check the agent's current state."
                        )
                        continue

                    # Handle /status command
                    if text.startswith("/status"):
                        send_message(chat_id, "🔍 Checking status...")
                        if self._agent_callback:
                            try:
                                response = await self._agent_callback(
                                    "Check machine status with PING and STATUS, report briefly.", chat_id)
                                send_message(chat_id, response)
                            except Exception as e:
                                send_message(chat_id, f"❌ Error: {e}")
                        continue

                    # Regular message → send to agent
                    send_message(chat_id, "⏳ Working on it...")

                    if self._agent_callback:
                        try:
                            response = await self._agent_callback(text, chat_id)
                            send_message(chat_id, response)
                        except Exception as e:
                            send_message(chat_id, f"❌ Error: {e}")
                    else:
                        send_message(chat_id, "⚠️ Agent not connected.")

            except Exception as e:
                print(f"[Telegram] Error: {e}")
                await asyncio.sleep(5)

    def stop(self):
        self._running = False

    def notify(self, text: str):
        """Send a proactive notification (e.g., from scheduler)."""
        if self._authorized_chat_id:
            send_message(self._authorized_chat_id, text)


# Singleton
telegram_bot = TelegramBot()
