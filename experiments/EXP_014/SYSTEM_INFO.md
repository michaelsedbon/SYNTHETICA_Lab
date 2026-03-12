# EXP_014 — System & Network Info

Live reference for LattePanda Alpha configuration. Updated as the system evolves.

---

## LattePanda Alpha

| Field | Value |
|-------|-------|
| **Hostname** | `michael-LattePanda-Alpha` |
| **OS** | Ubuntu 24.04.4 LTS (Noble) |
| **Kernel** | 6.17.0-14-generic |
| **CPU** | Intel Core m3-8100Y @ 1.10 GHz |
| **RAM** | 7.6 GB (6.0 GB available) |
| **Disk** | 56 GB eMMC (`/dev/mmcblk0p2`), 44 GB free |
| **Python** | 3.12.3 |

## Network

| Field | Value |
|-------|-------|
| **IP Address** | `172.16.1.128` |
| **Interface** | `wlp1s0` (WiFi) |
| **Subnet** | `172.16.1.0/24` |
| **WiFi Network** | MEDICALEX |

## SSH Access

```bash
# From Mac (passwordless, key-based):
ssh lp

# Or full command:
ssh michael@172.16.1.128
```

**SSH config alias** in `~/.ssh/config`:
```
Host lp
    HostName 172.16.1.128
    User michael
```

## USB Devices (as of 2026-03-12)

| Bus | Device | ID | Description |
|-----|--------|----|-------------|
| 001 | 003 | 04e2:1410 | **Exar XR21V1410 USB-UART** (built-in Arduino Leonardo serial) |
| 001 | 007 | 2341:8036 | **Arduino Leonardo** (built-in co-processor) |
| 001 | 004 | 8087:0a2a | Intel Bluetooth |
| 001 | 005 | 046d:c336 | Logitech G213 Keyboard |
| 001 | 006 | 046d:c077 | Logitech Mouse |

## Other Devices on Network

| Device | IP | Role |
|--------|----|------|
| LattePanda Alpha | 172.16.1.128 | Machine controller (this device) |
| ESP8266 (EXP_005) | 172.16.1.115 | Motor WiFi bridge (deprecated) |
