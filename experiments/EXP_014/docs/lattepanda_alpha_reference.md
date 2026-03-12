# LattePanda Alpha 864s — Reference Documentation

Compiled from [docs.lattepanda.com](https://docs.lattepanda.com/content/alpha_edition/) on 2026-03-12.

---

## Specs

| Spec | Details |
|------|---------|
| **CPU** | Intel® Core™ i5-8210Y / 8200Y |
| **Cores** | Dual-Core, Four-Thread, 1.6–3.6 GHz |
| **Benchmark** | PassMark up to 4128 |
| **Graphics** | Intel HD Graphics 617/615, 0.3–1.05 GHz |
| **RAM** | 8 GB LPDDR3 |
| **Storage Expansion** | 1× M.2 M Key (PCIe 4x, NVMe + SATA SSD), 1× M.2 E Key (PCIe 2x, USB 2.0, UART, PCM) |
| **WiFi** | 802.11 AC Dual-Band (2.4G & 5G) |
| **Bluetooth** | 4.2 |
| **Ethernet** | Gigabit |
| **USB** | 3× USB 3.0 Type-A, 1× USB-C (PD + DP + USB 3.0) |
| **Display** | HDMI + USB-C DP + eDP |
| **Co-processor** | Arduino Leonardo (built-in) |
| **GPIO** | 2× 50-pin headers: I²C, I²S, USB, RS232, UART, RTC, power management |
| **OS Support** | Windows 10 Pro, Linux Ubuntu |
| **Dimensions** | 115 mm × 78 mm × 14 mm |

### Shipping List
- LattePanda Alpha 864s ×1
- Active cooling fan (assembled) ×1
- 45W PD power adapter (EU & US cords) ×1
- Dual-band antenna ×2
- RTC battery (assembled) ×1

---

## Powering

4 ways to power on:

1. **Official PD adapter** (included, 45W USB-C PD)
2. **External PD power bank**
3. **12V DC via JST PH2.0-4P connector**
4. **LiPo battery via 10-pin connector**

For our installation: use the included 45W PD adapter (USB-C).

---

## USB Interfaces

### USB 3.0 (×3 Type-A)
- Up to 5 Gbit/s (625 MB/s)
- All three ports are USB 3.0
- **For EXP_014:** These will connect to the Arduino Nanos (motors 1–3). With a USB hub we can extend to 4+.

### USB-C (×1)
- Supports PD power input (12V), DisplayPort, and USB 3.0 data
- Can use USB-C hub for additional ports (DP, DVI, SD, etc.)
- **For EXP_014:** Primary power input. Can also use a USB-C hub for a 4th Nano if needed.

---

## Ubuntu Installation Guide (LattePanda Alpha)

### What You Need
- 1× Blank USB flash drive (8 GB or larger)
- Ubuntu 24.04 LTS image (64-bit desktop — we use 24.04 instead of the officially documented 16.04, which is outdated)

### Installation Steps

1. **Download Ubuntu 24.04 LTS** from [ubuntu.com/download](https://ubuntu.com/download/desktop)
2. **Create bootable USB** using [Rufus](https://rufus.ie/) (Windows), [Etcher](https://etcher.balena.io/) (Mac), or `dd` (Linux)
3. **Enter BIOS**: Restart LattePanda, press **Esc** continuously during boot
4. **Change boot order**: Navigate to "Boot" tab → set USB drive as "Boot Option #1"
5. **Save & reboot**: Navigate to "Save & Exit" tab → "Save Changes & Reboot"
6. **Install Ubuntu**: Select "Install Ubuntu" from the GRUB menu
7. **Options**: Check "Install third-party software" for driver support
8. **Disk**: "Erase disk and install Ubuntu" (or dual-boot if keeping Windows)
9. **Configure**: Set timezone, keyboard, username/password
10. **Reboot** and log in

> **Note:** The official docs reference Ubuntu 16.04, but Ubuntu 24.04 LTS works on all x86 hardware with Intel Gen 8+ and is what the lab server runs.

### Post-Install Setup (for EXP_014)

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install essentials
sudo apt install -y openssh-server python3 python3-pip python3-venv git curl

# Enable SSH
sudo systemctl enable --now ssh

# Install pyserial for motor communication
pip3 install pyserial fastapi uvicorn

# Configure firewall
sudo ufw allow ssh
sudo ufw allow 8000/tcp   # FastAPI
sudo ufw enable
```

---

## Arduino Leonardo Co-Processor

The LattePanda Alpha has a **built-in Arduino Leonardo** accessible without external USB. This could be used for:
- Direct I/O (relay control, additional sensors) without needing an external Nano
- Communicates with the Intel CPU via internal USB bridge
- 20 digital I/O pins, 12 analog inputs

---

## External Links

- [Product page](https://www.lattepanda.com/lattepanda-alpha)
- [Full documentation](https://docs.lattepanda.com/content/alpha_edition/os/)
- [Powering guide](https://docs.lattepanda.com/content/alpha_edition/powering/)
- [Hardware interface](https://docs.lattepanda.com/content/alpha_edition/io_playability/)
- [Forum](https://www.lattepanda.com/forum/)
