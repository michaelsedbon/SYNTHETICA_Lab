# Cryptographic Beings — Hardware Documentation

## System Architecture

```mermaid
graph TD
    subgraph Control Cabinet
        PSU[Power Supply 12V]
        ESP[ESP8266 NodeMCU<br/>WiFi + OTA + OLED]
        NANO[Arduino Nano<br/>Motor Controller]
    end

    subgraph Tower Assembly
        subgraph Tube Array
            T1[Tube 1<br/>Marimo + Sensors]
            T2[Tube 2<br/>Marimo + Sensors]
            TN[Tube N<br/>Marimo + Sensors]
        end
        LED[LED Lighting Array]
        STEPPER[ISD04 NEMA17<br/>Integrated Steppers]
        HALL[Hall-Effect Sensors]
    end

    OLLAMA[Ollama LLM Server<br/>172.16.1.80] -->|WiFi| ESP
    PSU -->|12V| STEPPER
    PSU -->|Vin| ESP
    PSU -->|Vin| NANO
    ESP -->|Serial TX| NANO
    ESP -->|I2C| OLED[SSD1306 OLED]
    NANO -->|STEP/DIR| STEPPER
    HALL -->|D2| NANO
    STEPPER --> T1
    STEPPER --> T2
    STEPPER --> TN
```

## Schematics

### KiCad Schematic (actual board connectivity)

![KiCad Schematic](pcb_descriptions/kicad_schematic.svg)

### Schemdraw Schematic (component overview)

![Schemdraw Schematic](pcb_descriptions/motor_level_controller_schematic.svg)

## Motor Level Controller PCB

| Component | Part | Ref | Purpose |
|-----------|------|-----|---------|
| ESP8266 NodeMCU | ESP-12E module on headers | J1/J2 | WiFi brain, OLED, serial bridge |
| Arduino Nano | ATmega328P | A1 | Motor control, sensor reading |
| OLED Display | SSD1306 0.96" I2C | J3 | Status display |
| Motor IDC | 2x3 shrouded connector | J4 | STEP/DIR/12V to ISD04 stepper |
| Sensor IDC | 2x3 shrouded connector | J5 | Hall-effect sensor breakout |
| Power Input | 2-pin connector | J6 | 12V DC power |

### PCB Photos

| Photo | Description |
|-------|-------------|
| ![Front](pcb_descriptions/level_motor_controler/IMG_0707.jpeg) | Full board front |
| ![Back](pcb_descriptions/level_motor_controler/IMG_0708.jpeg) | Board back with NodeMCU |

## Wiring

| Net | From | To | Purpose |
|-----|------|----|---------|
| `tx` | ESP TX (J2.13) | Nano RX (D0) | Serial commands |
| `D4` | Nano D4 | J4 IDC → ISD04 PUL+ | Step pulse |
| `D5` | Nano D5 | J4 IDC → ISD04 DIR+ | Direction |
| `hall_effect` | J5 IDC | Nano D2 | Hall sensor input |
| `SCK` | ESP D1 | OLED J3.3 | I2C clock |
| `SDA` | ESP D2 | OLED J3.4 | I2C data |
| `12V+` | J6.1 | J4 IDC → ISD04 power | Motor power |
| `Vin` | J1.15 | Nano 5V, J4, J5 | Logic power |
| `GND` | J6.2 | All boards | Common ground |

## PCB Documentation Files

| File | Description |
|------|-------------|
| `pcb_descriptions/motor_level_controller.py` | SKiDL PCB description (Python) |
| `pcb_descriptions/render_schematic.py` | Schemdraw SVG renderer |
| `pcb_descriptions/kicad_schematic.svg` | KiCad schematic export |
| `pcb_descriptions/motor_level_controller_schematic.svg` | Schemdraw schematic |
| `pcb_descriptions/level_motor_controler/` | PCB photos + ISD04 datasheets |

## ISD04 Stepper Motor

- **Type:** NEMA17 integrated stepper + driver
- **Voltage:** 12-38V DC
- **Interface:** PUL+ (step), DIR+ (direction), ENA+ (enable)
- **Datasheets:** `level_motor_controler/ISD04-10_Full_Datasheet.pdf`
