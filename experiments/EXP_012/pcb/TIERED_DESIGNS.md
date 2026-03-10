# ESP32 Motor Controller — Tiered Designs

## Functional Block Diagram

```mermaid
graph TD
    subgraph Power
        V24["24V DC Input - Screw Terminal"]
        BUCK["XL1509-5.0E1 Buck Converter"]
        LDO["AMS1117-3.3 LDO Regulator"]
        V24 -->|24V| BUCK
        BUCK -->|5V| LDO
    end

    subgraph MCU
        ESP["ESP32-WROOM-32 WiFi + GPIO"]
        LDO -->|3.3V| ESP
    end

    subgraph USB_Programming
        USBC["USB-C Connector"]
        CH["CH340C USB-to-Serial"]
        ESD_IC["USBLC6-2SC6 ESD Protection"]
        AR["Auto-Reset 2x NPN + RC"]
        USBC --> ESD_IC --> CH
        CH -->|TX/RX| ESP
        CH -->|DTR/RTS| AR -->|EN/GPIO0| ESP
    end

    subgraph Motor_Output
        LS["NPN Level Shift 2x S8050"]
        MT["Screw Terminal PUL+ DIR+ GND"]
        ESP -->|GPIO16 STEP / GPIO17 DIR| LS
        BUCK -->|5V pull-up| LS
        LS -->|5V logic| MT
        MT --> DRV["DM542T Stepper Driver"]
    end

    subgraph Sensor_Input
        ST["Screw Terminal 3-wire"]
        PROT["1k + 3.3V Zener Protection"]
        ST --> PROT -->|GPIO34| ESP
        V24 -->|sensor power| ST
    end

    subgraph Display
        HDR["4-pin Header GND/VCC/SDA/SCL"]
        OLED["SSD1306 0.96in OLED 128x64"]
        ESP -->|GPIO21 SDA / GPIO22 SCL| HDR
        HDR --> OLED
    end

    subgraph Debug_LEDs
        LED1["PWR LED green - hardwired 3.3V"]
        LED2["WIFI LED blue - GPIO23"]
        LED3["MOTOR LED yellow - GPIO25"]
        LDO --> LED1
        ESP --> LED2
        ESP --> LED3
    end

    subgraph User_Controls
        BOOT["BOOT Button - GPIO0 to GND"]
        RST["RESET Button - EN to GND"]
        BOOT --> ESP
        RST --> ESP
    end
```

---

## Design Tier

This is a single-purpose motor controller board. Unlike multi-channel designs (e.g., EXP_008's 8ch/4ch/2ch tiers), there's only one meaningful configuration:

### Tier 1 (Only Tier): 1× DM542T Motor Controller

| Functional Block | Components | Count |
|-----------------|------------|-------|
| MCU + WiFi | ESP32-WROOM-32 | 1 |
| Power regulation | XL1509-5.0E1 + AMS1117-3.3 | 2 ICs |
| USB programming | CH340C + USB-C + ESD + auto-reset (2× NPN) | 5 parts |
| Motor level shift | 2× S8050 NPN + 4× resistors | 6 parts |
| Sensor input | Pull-up + Zener + series resistor | 3 parts |
| Display | 4-pin header (OLED off-board) | 1 part |
| Debug LEDs | 3× LED + 3× current-limit resistor | 6 parts |
| User controls | 2× tactile buttons | 2 parts |
| Passive support | Caps, resistors, inductor, diode | ~15 parts |
| **Total unique components** | | **~25 types** |
| **Total placed parts** | | **~45 parts** |

> **No additional tiers needed.** Adding a second motor channel would require 2 more NPN transistors + 2 more GPIO pins + wider screw terminals — but the user specified 1× DM542T only.

---

## Board Specifications

| Parameter | Value |
|-----------|-------|
| Layers | 2 |
| Estimated size | ~60mm × 45mm |
| Power input | 24V DC via screw terminal |
| Max current draw (3.3V rail) | ~360 mA |
| Max current draw (24V input) | ~90 mA |
| JLCPCB assembly | SMT + through-hole mixed |
| Estimated cost (5 boards + assembly) | ~$15–25 |
