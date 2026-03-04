#!/usr/bin/env python3
"""
Calibrate rotation — find steps per revolution using the hall sensor.

1. Sends ZERO to reset position
2. Moves slowly until hall sensor triggers (HALL:1)
3. Zeros again, then moves one full rotation back to HALL:1
4. Reports steps per revolution

Usage:
    python3 calibrate_rotation.py

Requires: ESP accessible at MACHINE_IP (default 172.16.1.115)
"""

import time
import json
import os
import urllib.request

ESP_IP = os.environ.get("MACHINE_IP", "172.16.1.115")


def send_cmd(cmd: str) -> str:
    """Send command to machine via ESP."""
    url = f"http://{ESP_IP}/send?cmd={cmd.replace(' ', '%20')}"
    try:
        with urllib.request.urlopen(url, timeout=5) as r:
            return r.read().decode()
    except Exception as e:
        return f"ERROR: {e}"


def get_status() -> dict:
    """Get parsed STATUS from machine."""
    send_cmd("STATUS")
    time.sleep(0.3)
    try:
        with urllib.request.urlopen(f"http://{ESP_IP}/log", timeout=5) as r:
            entries = json.loads(r.read().decode())
    except:
        return {}

    status = {}
    for entry in entries[-8:]:
        if "POS:" in entry:
            try:
                status["pos"] = int(entry.split("POS:")[-1].strip())
            except:
                pass
        if "HALL:" in entry:
            try:
                status["hall"] = int(entry.split("HALL:")[-1].strip())
            except:
                pass
        if "MOVING:" in entry:
            try:
                status["moving"] = int(entry.split("MOVING:")[-1].strip())
            except:
                pass
    return status


def wait_for_stop(timeout=300):
    """Wait for motor to stop moving."""
    start = time.time()
    while time.time() - start < timeout:
        s = get_status()
        if s.get("moving", 1) == 0:
            return s
        time.sleep(0.5)
    return get_status()


def find_hall(max_steps=200000, speed=400):
    """Move until hall sensor triggers. Returns position or None."""
    send_cmd(f"SPEED {speed}")
    time.sleep(0.3)
    send_cmd(f"MOVE {max_steps}")
    time.sleep(0.5)

    start = time.time()
    while time.time() - start < 600:  # 10 min timeout
        s = get_status()
        pos = s.get("pos", "?")
        hall = s.get("hall", 0)
        moving = s.get("moving", 0)

        print(f"  POS:{pos}  HALL:{hall}  MOVING:{moving}")

        if hall == 1:
            send_cmd("STOP")
            time.sleep(0.5)
            final = get_status()
            return final.get("pos", pos)

        if moving == 0:
            print("  Motor stopped without finding hall sensor!")
            return None

        time.sleep(0.5)

    print("  Timeout!")
    send_cmd("STOP")
    return None


def main():
    print("=" * 50)
    print("  Rotation Calibration")
    print("=" * 50)

    # Step 0: Ping
    print("\n[1/4] Pinging machine...")
    send_cmd("PING")
    time.sleep(1)

    # Step 1: Find hall sensor first time (establish reference)
    print("\n[2/4] Finding hall sensor (first pass)...")
    send_cmd("ZERO")
    time.sleep(0.3)

    pos1 = find_hall(max_steps=200000, speed=400)
    if pos1 is None:
        print("\nFAILED: Hall sensor not found in 200000 steps.")
        print("Check: sensor wiring, magnet alignment, D3 connection.")
        return

    print(f"\n  ✅ Hall sensor found at step {pos1}")

    # Step 2: Zero here, then find it again = one full rotation
    print("\n[3/4] Zeroing at hall position, finding next trigger (full rotation)...")
    send_cmd("ZERO")
    time.sleep(0.5)

    # Move a small amount past the magnet first so we don't re-trigger immediately
    send_cmd("SPEED 200")
    time.sleep(0.2)
    send_cmd("MOVE 500")
    time.sleep(3)
    wait_for_stop(timeout=10)

    # Now find the hall sensor again
    pos2 = find_hall(max_steps=200000, speed=400)
    if pos2 is None:
        print("\nFAILED: Hall sensor not found on second pass.")
        return

    # Steps per revolution = position when found again (we zeroed at the first trigger)
    steps_per_rev = pos2
    print(f"\n  ✅ Hall sensor found again at step {pos2}")

    # Step 3: Report
    print("\n" + "=" * 50)
    print(f"  RESULT: {steps_per_rev} steps per revolution")
    print("=" * 50)

    # Write result
    result_file = os.path.join(
        os.environ.get("LAB_WORKSPACE", "/opt/synthetica-lab"),
        "experiments/EXP_002/calibration.json"
    )
    result = {
        "steps_per_revolution": steps_per_rev,
        "first_hall_position": pos1,
        "second_hall_position": pos2,
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%S"),
        "speed": 400,
    }
    with open(result_file, "w") as f:
        json.dump(result, f, indent=2)
    print(f"\n  Saved to {result_file}")


if __name__ == "__main__":
    main()
