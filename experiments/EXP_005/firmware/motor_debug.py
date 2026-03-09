#!/usr/bin/env python3
"""
Motor Debug Console — Direct USB Serial Monitor
================================================
Connects directly to the Nano via USB serial.
Bypasses the ESP entirely.
Shows all debug output in real-time.
Type commands and press Enter to send.

Usage:
    python3 motor_debug.py [port]
    
    port defaults to /dev/cu.usbserial-2140
"""
import sys
import serial
import threading
import time

PORT = sys.argv[1] if len(sys.argv) > 1 else "/dev/cu.usbserial-2140"
BAUD = 115200

# ANSI colors
CYAN = "\033[96m"
GREEN = "\033[92m"
YELLOW = "\033[93m"
RED = "\033[91m"  
DIM = "\033[2m"
BOLD = "\033[1m"
RESET = "\033[0m"

def reader(ser):
    """Read and display serial output from Nano."""
    while True:
        try:
            line = ser.readline().decode('utf-8', errors='replace').strip()
            if not line:
                continue
            
            # Color code by prefix
            if line.startswith("[DEBUG]"):
                print(f"{DIM}{line}{RESET}")
            elif line.startswith("[SETUP]"):
                print(f"{CYAN}{line}{RESET}")
            elif line.startswith("[CMD]"):
                print(f"{YELLOW}{line}{RESET}")
            elif line.startswith("[MOVE]") or line.startswith("[STEP]"):
                print(f"{GREEN}{line}{RESET}")
            elif line.startswith("[PINTEST]") or line.startswith("[PULSE]") or line.startswith("[BLINK]"):
                print(f"{CYAN}{line}{RESET}")
            elif line.startswith("ERROR"):
                print(f"{RED}{line}{RESET}")
            elif line.startswith("OK ") or line == "PONG" or line == "READY":
                print(f"{BOLD}{GREEN}{line}{RESET}")
            elif line.startswith("==="):
                print(f"{BOLD}{CYAN}{line}{RESET}")
            else:
                print(f"  {line}")
        except Exception as e:
            print(f"{RED}[READ ERROR] {e}{RESET}")
            break

def main():
    print(f"{BOLD}{CYAN}")
    print("=" * 50)
    print("  Motor Debug Console v1.0")
    print(f"  Port: {PORT}  |  Baud: {BAUD}")
    print("=" * 50)
    print(f"{RESET}")
    print(f"{DIM}Commands: PING, MOVE <N>, BLINK, PINTEST, PULSE <N>, STATUS{RESET}")
    print(f"{DIM}Type 'quit' to exit{RESET}")
    print()
    
    try:
        ser = serial.Serial(PORT, BAUD, timeout=0.1)
        time.sleep(0.1)  # Let serial settle
    except Exception as e:
        print(f"{RED}Failed to open {PORT}: {e}{RESET}")
        print(f"{YELLOW}Available ports:{RESET}")
        import glob
        for p in glob.glob("/dev/cu.usb*"):
            print(f"  {p}")
        sys.exit(1)
    
    # Start reader thread
    t = threading.Thread(target=reader, args=(ser,), daemon=True)
    t.start()
    
    # Send commands from stdin
    print(f"{DIM}--- Listening for Nano output (boot test should appear) ---{RESET}")
    print()
    
    while True:
        try:
            cmd = input(f"{BOLD}> {RESET}").strip()
            if cmd.lower() == "quit":
                break
            if cmd:
                ser.write((cmd + "\n").encode())
                print(f"{DIM}[SENT] {cmd}{RESET}")
        except (KeyboardInterrupt, EOFError):
            break
    
    ser.close()
    print(f"\n{DIM}Disconnected.{RESET}")

if __name__ == "__main__":
    main()
