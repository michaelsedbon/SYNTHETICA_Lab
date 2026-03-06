#!/usr/bin/env python3
"""
Flash Nano via USB with ESP-triggered reset.
Tightly times the reset-nano HTTP call with avrdude launch.
"""
import subprocess
import urllib.request
import time
import sys
import os

ESP_IP = os.environ.get("ESP_IP", "172.16.1.115")
USB_PORT = "/dev/cu.usbserial-2140"
HEX_FILE = os.path.join(os.path.dirname(__file__), 
    "arduino_nano/.pio/build/nanoatmega328/firmware.hex")
AVRDUDE = os.path.expanduser(
    "~/.platformio/packages/tool-avrdude/bin/avrdude")
AVRDUDE_CONF = os.path.expanduser(
    "~/.platformio/packages/tool-avrdude/avrdude.conf")

def log(msg):
    print(f"  [{time.strftime('%H:%M:%S')}] {msg}")

def main():
    print("=" * 50)
    print("  USB Flash with ESP Reset")
    print("=" * 50)
    
    if not os.path.exists(HEX_FILE):
        log("ERROR: hex file not found. Run 'pio run -d arduino_nano' first.")
        sys.exit(1)
    
    log(f"Hex file: {HEX_FILE}")
    log(f"USB port: {USB_PORT}")
    
    # Step 1: Reset Nano via ESP
    log("Sending reset via ESP...")
    try:
        resp = urllib.request.urlopen(
            f"http://{ESP_IP}/reset-nano", timeout=5)
        log(f"Reset OK: {resp.read().decode()}")
    except Exception as e:
        log(f"Reset failed: {e}")
        log("Continuing anyway — press RESET button manually!")
    
    # Step 2: Immediately launch avrdude (bootloader window is ~1 second)
    time.sleep(0.15)  # Tiny wait for bootloader to initialize
    
    log("Starting avrdude NOW...")
    cmd = [
        AVRDUDE,
        "-C", AVRDUDE_CONF,
        "-p", "atmega328p",
        "-c", "arduino",
        "-b", "115200",
        "-P", USB_PORT,
        "-U", f"flash:w:{HEX_FILE}:i"
    ]
    
    result = subprocess.run(cmd, capture_output=False, timeout=30)
    
    if result.returncode == 0:
        log("SUCCESS — Nano firmware updated via USB!")
    else:
        log(f"FAILED — avrdude returned {result.returncode}")
    
    sys.exit(result.returncode)

if __name__ == "__main__":
    main()
