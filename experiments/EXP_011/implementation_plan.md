# EXP_011 — Sequential Motor Firmware Debug (DM542T)

Start from scratch with minimal firmware, adding one function at a time to isolate what works and what doesn't.

> [!IMPORTANT]
> **Parent experiment:** EXP_005 — serial communication works but motor physically doesn't move.

---

## Hardware Configuration

### Architecture

```
MacBook ──WiFi──→ ESP8266 (NodeMCU) ──Serial 115200──→ Arduino Nano ──PUL/DIR──→ DM542T Driver ──→ NEMA 23 Motor
```

### Pin Layout — Arduino Nano

| Pin | Function | Connection |
|-----|----------|------------|
| D0 (RX) | Serial RX | ← ESP8266 TX |
| D1 (TX) | Serial TX | → ESP8266 RX |
| **D4** | **Step (PUL+)** | → DM542T PUL+ |
| **D2** | **Direction (DIR+)** | → DM542T DIR+ |
| **D3** | **Hall sensor** | ← Proximity probe (LJ8A3-2-Z/BX, NPN NO) |
| LED_BUILTIN (D13) | Status LED | — |

### Pin Layout — ESP8266 (NodeMCU)

| Pin | Function | Connection |
|-----|----------|------------|
| TX/RX (Serial) | UART bridge | → Nano D0/D1 |
| **D5 (GPIO14)** | **Nano Reset** | → Nano RESET pin |

### DM542T Driver

| Terminal | Connection |
|----------|------------|
| PUL+ | Nano D4 |
| PUL- | GND |
| DIR+ | Nano D2 |
| DIR- | GND |
| ENA+/ENA- | Not connected (`PIN_ENABLE=-1`) |

### Motor & Power

- **Motor:** StepperOnline 23HP22-2804S (NEMA 23, 2.8A, 1.20 Nm)
- **Supply:** 24V DC
- **Connector:** M12 4-pin → A+(Black), A-(Green), B+(Red), B-(Blue)

### Libraries

| Board | Library | Version |
|-------|---------|---------|
| Nano | `AccelStepper` (waspinator) | ^1.64 |
| ESP8266 | `ESP8266WiFi`, `ESP8266mDNS`, `ArduinoOTA`, `ESP8266WebServer` | built-in |

### Network

- **WiFi SSID:** MEDICALEX
- **ESP IP:** 172.16.1.115
- **Hostname:** cryptobeings
- **OTA port:** 8266
- **TCP bridge:** port 2323

---

## Sequential Firmware Plan (9 Steps)

Each step: flash → test → confirm → next. If a step fails, stop and debug before moving on.

### Step 1 — LED Blink Only
- No motor code, no serial, no libraries
- Blink LED_BUILTIN to confirm Nano is alive and flashing works
- **Pass:** LED blinks visibly

### Step 2 — Serial Echo
- Add `Serial.begin(115200)`, echo back anything received
- **Pass:** Send text from ESP → Nano echoes back via `/api/send`

### Step 3 — Raw GPIO Step Test (No AccelStepper)
- `pinMode(D4, OUTPUT)` and `pinMode(D2, OUTPUT)`
- On boot: toggle D4 HIGH/LOW 200 times with `delayMicroseconds(1000)`, D2 = LOW
- **Pass:** Motor physically moves 200 steps

> [!CAUTION]
> If Step 3 fails, the problem is hardware (wiring, DM542T DIP switches, power, motor coils) — not firmware. Stop and debug hardware.

### Step 4 — Raw GPIO + Direction Toggle
- Move 200 steps one direction, pause, 200 steps the other
- **Pass:** Motor moves both ways

### Step 5 — AccelStepper Blocking Move
- Add AccelStepper library: `stepper.move(1000)` + `while(stepper.run()){}` in setup
- **Pass:** Motor moves 1000 steps on boot

### Step 6 — Serial Commands: PING + MOVE
- Serial command parser: PING→PONG, MOVE N→move N steps
- `stepper.run()` in loop
- **Pass:** MOVE 1000 via ESP → motor moves

### Step 7 — ESP8266 Web Dashboard
- Minimal web UI on the ESP: buttons for MOVE ±100/±1000, STOP, status display
- Reuse dashboard pattern from EXP_005 but stripped down to match current Nano commands
- **Pass:** Click button on dashboard → motor moves

### Step 8 — Hall Sensor
- Add `pinMode(D3, INPUT_PULLUP)` and STATUS command showing hall state
- Add HOME command (move until hall triggers)
- **Pass:** STATUS shows HALL:0/1 depending on magnet, HOME works

### Step 9 — Full Feature Restore
- Add CALIBRATE, SPEED, ACCEL, STOP, ZERO, ENABLE/DISABLE, MOVETO, HALF
- Full dashboard with all controls
- **Pass:** All commands work AND motor moves correctly
