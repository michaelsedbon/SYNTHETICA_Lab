#!/usr/bin/env python3
"""
PicoSDK x86_64 bridge subprocess.

This script runs under Rosetta (arch -x86_64) and communicates
with the main ARM64 FastAPI server via stdin/stdout JSON.

It loads the x86_64 picohrdl C library and forwards commands
from the parent process. This avoids needing all Python deps
compiled for x86_64.

Protocol: one JSON object per line on stdin/stdout.
  → {"cmd": "open"}
  ← {"ok": true, "handle": 1}
  → {"cmd": "configure", "channels": [...], ...}
  ← {"ok": true}
  → {"cmd": "read_single", "channel": 1, "range": 1}
  ← {"ok": true, "raw": 12345, "overflow": 0}
  → {"cmd": "start_stream", "interval_ms": 120, "conv_time": 1}
  ← {"ok": true}
  → {"cmd": "poll"}
  ← {"ok": true, "samples": [{"raw": 123, "ch": 1}, ...]}
  → {"cmd": "stop"}
  ← {"ok": true}
  → {"cmd": "close"}
  ← {"ok": true}
"""

import ctypes
import json
import sys
import os

# Ensure we can find the library
LIB_PATHS = [
    "/Library/Frameworks/PicoSDK.framework/Libraries/libpicohrdl/libpicohrdl.dylib",
    "/Library/Frameworks/PicoSDK.framework/Libraries/libpicohrdl/libpicohrdl.2.dylib",
]


def load_library():
    """Load the picohrdl C library directly via ctypes."""
    for path in LIB_PATHS:
        if os.path.exists(path):
            try:
                return ctypes.cdll.LoadLibrary(path)
            except OSError:
                continue
    raise RuntimeError("Could not load libpicohrdl.dylib")


def reply(data):
    """Send a JSON response to stdout."""
    sys.stdout.write(json.dumps(data) + "\n")
    sys.stdout.flush()


def main():
    lib = None
    handle = ctypes.c_int16(0)
    streaming = False

    # Buffer for streaming reads
    buf_size = 200
    data_buffer = (ctypes.c_int32 * buf_size)()
    overflow = ctypes.c_int16(0)

    try:
        lib = load_library()
        reply({"ok": True, "msg": "bridge_ready"})
    except Exception as e:
        reply({"ok": False, "error": str(e)})
        sys.exit(1)

    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue

        try:
            cmd = json.loads(line)
        except json.JSONDecodeError as e:
            reply({"ok": False, "error": f"Invalid JSON: {e}"})
            continue

        action = cmd.get("cmd", "")

        try:
            if action == "open":
                result = lib.HRDLOpenUnit()
                if result <= 0:
                    reply({"ok": False, "error": f"HRDLOpenUnit returned {result}"})
                else:
                    handle = ctypes.c_int16(result)
                    reply({"ok": True, "handle": result})

            elif action == "set_mains":
                reject = cmd.get("reject_50hz", True)
                status = lib.HRDLSetMains(handle, ctypes.c_int16(0 if reject else 1))
                reply({"ok": status == 1, "status": status})

            elif action == "set_channel":
                ch = ctypes.c_int16(cmd["channel"])
                enabled = ctypes.c_int16(1 if cmd.get("enabled", True) else 0)
                vrange = ctypes.c_int16(cmd.get("range", 1))
                single_ended = ctypes.c_int16(1 if cmd.get("single_ended", False) else 0)
                status = lib.HRDLSetAnalogInChannel(handle, ch, enabled, vrange, single_ended)
                reply({"ok": status == 1, "status": status})

            elif action == "set_interval":
                interval_ms = ctypes.c_int32(cmd["interval_ms"])
                conv_time = ctypes.c_int16(cmd.get("conv_time", 1))
                status = lib.HRDLSetInterval(handle, interval_ms, conv_time)
                reply({"ok": status == 1, "status": status})

            elif action == "run":
                n_values = ctypes.c_int32(cmd.get("n_values", 20))
                method = ctypes.c_int16(cmd.get("method", 2))  # BM_STREAM
                status = lib.HRDLRun(handle, n_values, method)
                streaming = True
                reply({"ok": status == 1, "status": status})

            elif action == "ready":
                ready = lib.HRDLReady(handle)
                reply({"ok": True, "ready": ready != 0})

            elif action == "get_values":
                n_requested = ctypes.c_int32(cmd.get("n_values", 20))
                overflow.value = 0
                n_returned = lib.HRDLGetValues(
                    handle,
                    ctypes.byref(data_buffer),
                    ctypes.byref(overflow),
                    n_requested,
                )
                samples = [int(data_buffer[i]) for i in range(max(0, n_returned))]
                reply({
                    "ok": True,
                    "n_returned": n_returned,
                    "overflow": overflow.value,
                    "samples": samples,
                })

            elif action == "read_single":
                ch = ctypes.c_int16(cmd.get("channel", 1))
                vrange = ctypes.c_int16(cmd.get("range", 1))
                conv_time = ctypes.c_int16(cmd.get("conv_time", 1))
                single_ended = ctypes.c_int16(1 if cmd.get("single_ended", False) else 0)
                ov = ctypes.c_int16(0)
                value = ctypes.c_int32(0)
                status = lib.HRDLGetSingleValue(
                    handle, ch, vrange, conv_time, single_ended,
                    ctypes.byref(ov), ctypes.byref(value),
                )
                reply({
                    "ok": status == 1,
                    "raw": value.value,
                    "overflow": ov.value,
                })

            elif action == "stop":
                lib.HRDLStop(handle)
                streaming = False
                reply({"ok": True})

            elif action == "close":
                if streaming:
                    lib.HRDLStop(handle)
                lib.HRDLCloseUnit(handle)
                reply({"ok": True})
                break

            elif action == "ping":
                reply({"ok": True, "msg": "pong"})

            else:
                reply({"ok": False, "error": f"Unknown command: {action}"})

        except Exception as e:
            reply({"ok": False, "error": str(e)})

    sys.exit(0)


if __name__ == "__main__":
    main()
