#!/usr/bin/env python3
"""
Remote Nano Flasher — STK500v1 over TCP serial bridge
=====================================================
Compiles Arduino Nano firmware and uploads it via the ESP8266's
TCP serial bridge (port 2323) + reset endpoint.

Usage:
    python3 flash_nano.py [firmware_dir]
    
    firmware_dir defaults to /opt/synthetica-lab/experiments/EXP_002/firmware/arduino_nano
"""

import sys
import os
import time
import socket
import struct
import subprocess
import tempfile

# ── Config ──
ESP_IP = os.environ.get("ESP_IP", "172.16.1.115")  # cryptobeings.local
ESP_HTTP_PORT = 80
ESP_TCP_PORT = 2323
FIRMWARE_DIR = sys.argv[1] if len(sys.argv) > 1 else "/opt/synthetica-lab/experiments/EXP_002/firmware/arduino_nano"

# STK500v1 constants
STK_OK = 0x10
STK_INSYNC = 0x14
CRC_EOP = 0x20  # End of packet
STK_GET_SYNC = 0x30
STK_ENTER_PROGMODE = 0x50
STK_LEAVE_PROGMODE = 0x51
STK_LOAD_ADDRESS = 0x55
STK_PROG_PAGE = 0x64
STK_READ_SIGN = 0x75

PAGE_SIZE = 128  # ATmega328P flash page size


def log(msg):
    print(f"  [{time.strftime('%H:%M:%S')}] {msg}")


def reset_nano():
    """Reset the Nano via ESP HTTP endpoint."""
    import urllib.request
    url = f"http://{ESP_IP}:{ESP_HTTP_PORT}/reset-nano"
    log(f"Resetting Nano via {url}")
    try:
        resp = urllib.request.urlopen(url, timeout=15)
        data = resp.read().decode()
        log(f"Reset response: {data}")
        return True
    except Exception as e:
        log(f"Reset failed: {e}")
        return False


def compile_firmware():
    """Compile the Nano firmware using PlatformIO and return hex file path."""
    log(f"Compiling firmware in {FIRMWARE_DIR}")
    
    result = subprocess.run(
        ["pio", "run", "-d", FIRMWARE_DIR],
        capture_output=True, text=True, timeout=120
    )
    
    if result.returncode != 0:
        log(f"Compilation FAILED:\n{result.stderr[-1000:]}")
        return None
    
    # Find the hex file
    hex_path = os.path.join(FIRMWARE_DIR, ".pio", "build", "nano", "firmware.hex")
    if not os.path.exists(hex_path):
        # Try nanoatmega328
        hex_path = os.path.join(FIRMWARE_DIR, ".pio", "build", "nanoatmega328", "firmware.hex")
    
    if os.path.exists(hex_path):
        size = os.path.getsize(hex_path)
        log(f"Compiled OK: {hex_path} ({size} bytes)")
        return hex_path
    else:
        log("ERROR: hex file not found after compilation")
        # List what's there
        build_dir = os.path.join(FIRMWARE_DIR, ".pio", "build")
        if os.path.exists(build_dir):
            log(f"Build envs: {os.listdir(build_dir)}")
        return None


def parse_hex(hex_path):
    """Parse Intel HEX file and return list of (address, bytes) segments."""
    segments = {}  # addr -> byte
    base_addr = 0
    
    with open(hex_path, 'r') as f:
        for line in f:
            line = line.strip()
            if not line.startswith(':'):
                continue
            
            raw = bytes.fromhex(line[1:])
            byte_count = raw[0]
            addr = (raw[1] << 8) | raw[2]
            record_type = raw[3]
            data = raw[4:4 + byte_count]
            
            if record_type == 0x00:  # Data record
                full_addr = base_addr + addr
                for i, b in enumerate(data):
                    segments[full_addr + i] = b
            elif record_type == 0x02:  # Extended segment address
                base_addr = ((data[0] << 8) | data[1]) << 4
            elif record_type == 0x01:  # EOF
                break
    
    if not segments:
        return []
    
    # Convert to contiguous pages
    min_addr = min(segments.keys())
    max_addr = max(segments.keys())
    
    # Build flat binary
    binary = bytearray(max_addr - min_addr + 1)
    for addr, byte in segments.items():
        binary[addr - min_addr] = byte
    
    # Split into pages
    pages = []
    for offset in range(0, len(binary), PAGE_SIZE):
        page_data = binary[offset:offset + PAGE_SIZE]
        # Pad to page size
        if len(page_data) < PAGE_SIZE:
            page_data = page_data + bytearray(0xFF for _ in range(PAGE_SIZE - len(page_data)))
        pages.append((min_addr + offset, bytes(page_data)))
    
    log(f"Parsed hex: {len(binary)} bytes, {len(pages)} pages, addr {min_addr:#06x}-{max_addr:#06x}")
    return pages


class STK500:
    """Minimal STK500v1 programmer over TCP socket."""
    
    def __init__(self, host, port, timeout=5):
        self.sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        self.sock.setsockopt(socket.IPPROTO_TCP, socket.TCP_NODELAY, 1)
        self.sock.settimeout(timeout)
        self.sock.connect((host, port))
        log(f"Connected to TCP bridge at {host}:{port}")
    
    def close(self):
        self.sock.close()
    
    def send(self, data):
        self.sock.sendall(data)
    
    def flush_input(self):
        """Flush any pending input data."""
        self.sock.settimeout(0.1)
        try:
            self.sock.recv(4096)
        except:
            pass
    
    def recv(self, n, timeout=3):
        self.sock.settimeout(timeout)
        buf = b""
        while len(buf) < n:
            try:
                chunk = self.sock.recv(n - len(buf))
                if not chunk:
                    break
                buf += chunk
            except socket.timeout:
                break
        return buf
    
    def sync(self):
        """Synchronize with bootloader."""
        for attempt in range(8):
            self.flush_input()
            self.send(bytes([STK_GET_SYNC, CRC_EOP]))
            resp = self.recv(2, timeout=1.0)
            if len(resp) >= 2 and resp[0] == STK_INSYNC and resp[1] == STK_OK:
                log(f"Sync OK (attempt {attempt + 1})")
                return True
            time.sleep(0.1)
        
        log("FAILED to sync with bootloader")
        return False
    
    def enter_progmode(self):
        self.send(bytes([STK_ENTER_PROGMODE, CRC_EOP]))
        resp = self.recv(2)
        ok = len(resp) >= 2 and resp[0] == STK_INSYNC and resp[1] == STK_OK
        if ok:
            log("Entered programming mode")
        else:
            log(f"Enter progmode failed: {resp.hex() if resp else 'no response'}")
        return ok
    
    def leave_progmode(self):
        self.send(bytes([STK_LEAVE_PROGMODE, CRC_EOP]))
        resp = self.recv(2)
        return len(resp) >= 2 and resp[0] == STK_INSYNC and resp[1] == STK_OK
    
    def load_address(self, word_addr):
        """Load address (in WORDS, not bytes)."""
        lo = word_addr & 0xFF
        hi = (word_addr >> 8) & 0xFF
        self.send(bytes([STK_LOAD_ADDRESS, lo, hi, CRC_EOP]))
        resp = self.recv(2, timeout=3)
        return len(resp) >= 2 and resp[0] == STK_INSYNC and resp[1] == STK_OK
    
    def prog_page(self, data):
        """Program a page of flash."""
        length = len(data)
        hi = (length >> 8) & 0xFF
        lo = length & 0xFF
        cmd = bytes([STK_PROG_PAGE, hi, lo, ord('F')]) + data + bytes([CRC_EOP])
        self.send(cmd)
        resp = self.recv(2, timeout=8)  # Page write can take time
        return len(resp) >= 2 and resp[0] == STK_INSYNC and resp[1] == STK_OK
    
    def flash_page_with_retry(self, addr, data, max_retries=3):
        """Flash a single page with retry logic."""
        word_addr = addr // 2
        for attempt in range(max_retries):
            if attempt > 0:
                log(f"  Retry {attempt}/{max_retries} for page at {addr:#06x}")
                self.flush_input()
                time.sleep(0.2)
                # Re-sync before retrying
                if not self.sync():
                    continue
                if not self.enter_progmode():
                    continue
            
            if not self.load_address(word_addr):
                continue
            if not self.prog_page(data):
                continue
            return True  # Success
        return False  # All retries failed
    
    def read_signature(self):
        self.send(bytes([STK_READ_SIGN, CRC_EOP]))
        resp = self.recv(5)
        if len(resp) >= 5 and resp[0] == STK_INSYNC and resp[4] == STK_OK:
            sig = resp[1:4]
            chip = 'ATmega328P' if sig == b'\x1e\x95\x0f' else 'unknown'
            log(f"Signature: {sig.hex()} ({chip})")
            return sig
        return None


def flash(hex_path):
    """Flash the Nano with the compiled hex file."""
    pages = parse_hex(hex_path)
    if not pages:
        log("No data to flash")
        return False
    
    # Reset the Nano into bootloader
    if not reset_nano():
        return False
    
    # Give bootloader time to start, then connect
    time.sleep(0.2)
    
    try:
        stk = STK500(ESP_IP, ESP_TCP_PORT)
    except Exception as e:
        log(f"Failed to connect to TCP bridge: {e}")
        return False
    
    try:
        # Sync with bootloader
        if not stk.sync():
            return False
        
        # Read signature
        stk.read_signature()
        
        # Enter programming mode
        if not stk.enter_progmode():
            return False
        
        # Program each page (with retry logic for WiFi reliability)
        total = len(pages)
        for i, (addr, data) in enumerate(pages):
            if not stk.flash_page_with_retry(addr, data):
                log(f"Failed to program page at {addr:#06x} after retries")
                return False
            
            # Small delay between pages to avoid overwhelming the TCP bridge
            time.sleep(0.03)
            
            pct = (i + 1) * 100 // total
            if (i + 1) % 10 == 0 or i == total - 1:
                log(f"Progress: {pct}% ({i + 1}/{total} pages)")
        
        # Leave programming mode (Nano will reset and run new code)
        stk.leave_progmode()
        log("Flash complete! Nano is rebooting with new firmware.")
        return True
        
    finally:
        stk.close()


def main():
    print("=" * 50)
    print("  Remote Nano Flasher v1.0")
    print(f"  ESP: {ESP_IP}  |  Firmware: {os.path.basename(FIRMWARE_DIR)}")
    print("=" * 50)
    
    # Step 1: Compile
    hex_path = compile_firmware()
    if not hex_path:
        log("Compilation failed, aborting")
        sys.exit(1)
    
    # Step 2: Flash
    if flash(hex_path):
        log("SUCCESS — Nano firmware updated over the air!")
        sys.exit(0)
    else:
        log("FAILED — flash did not complete")
        sys.exit(1)


if __name__ == "__main__":
    main()
