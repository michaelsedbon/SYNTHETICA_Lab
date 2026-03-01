#!/usr/bin/env python3
"""
PCB Description: Motor Level Controller
========================================
Board that controls stepper motors and reads hall-effect sensors
for each tube in the Cryptographic Beings machine.

Architecture:
  ESP8266 (NodeMCU) = WiFi brain, receives commands from Ollama,
                      drives OLED display, sends serial to Nano
  Arduino Nano      = Motor controller, drives ISD04 steppers,
                      reads hall-effect sensors

Connectivity extracted from KiCad schematic:
  level_motor_controler.kicad_sch (KiCad 8.0)

Components:
  A1  - Arduino Nano v3.x
  J1  - ESP8266 left header  (Conn_01x15)
  J2  - ESP8266 right header (Conn_01x15)
  J3  - OLED display header  (Conn_01x04: GND/VCC/SCK/SDA)
  J4  - IDC 2x3 connector    (motor side)
  J5  - IDC 2x3 connector    (hall-effect sensor side)
  J6  - Power connector      (Conn_01x02: 12V+ / GND)

Nets:
  GND         - Common ground
  Vin         - Regulated voltage (from ESP VIN pin)
  12V+        - 12V power input (for motors)
  tx          - Serial TX (ESP -> Nano)
  D4          - GPIO signal (ESP D4 -> Nano)
  D5          - GPIO signal (ESP -> J4 motor connector)
  SCK         - I2C clock (ESP D1 -> OLED)
  SDA         - I2C data  (ESP D2 -> OLED)
  VCC         - Logic power to OLED
  hall_effect  - Hall sensor signal (Nano -> J5)
"""

from skidl import *

# ================================================================
# NET DEFINITIONS (from KiCad global labels)
# ================================================================
gnd         = Net('GND')
vin         = Net('Vin')
v12         = Net('12V+')
tx          = Net('tx')
d4          = Net('D4')
d5          = Net('D5')
sck         = Net('SCK')
sda         = Net('SDA')
vcc         = Net('VCC')
hall_effect = Net('hall_effect')


# ================================================================
# J1 — ESP8266 LEFT HEADER (Conn_01x15)
# ================================================================
# KiCad position: (40.64, 71.12)
# Text annotation: "ESP8266", "left"
# Pin mapping (NodeMCU left side, top to bottom):
#   1=A0, 2=RSV, 3=RSV, 4=SD3, 5=SD2,
#   6=SD1, 7=CMD, 8=SDO, 9=CLK, 10=GND,
#   11=3V3, 12=EN, 13=RST, 14=GND, 15=VIN

j1 = Part('Connector_Generic', 'Conn_01x15',
          ref='J1', value='ESP8266_Left',
          footprint='Connector_PinHeader_2.54mm:PinHeader_1x15_P2.54mm_Vertical')
# Connected nets (from KiCad global labels at J1 positions):
j1[1]  += Net('ESP_A0')
j1[2]  += Net('ESP_RSV1')
j1[3]  += Net('ESP_RSV2')
j1[4]  += Net('ESP_SD3')
j1[5]  += Net('ESP_SD2')
j1[6]  += Net('ESP_SD1')
j1[7]  += Net('ESP_CMD')
j1[8]  += Net('ESP_SDO')
j1[9]  += Net('ESP_CLK')
j1[10] += gnd               # GND (label at 35.56, 86.36)
j1[11] += Net('ESP_3V3')
j1[12] += Net('ESP_EN')
j1[13] += Net('ESP_RST')
j1[14] += gnd               # GND (label at 35.56, 55.88)
j1[15] += vin               # Vin  (label at 35.56, 88.9)


# ================================================================
# J2 — ESP8266 RIGHT HEADER (Conn_01x15)
# ================================================================
# KiCad position: (72.39, 71.12)
# Text annotation: "right"
# Pin mapping (NodeMCU right side, top to bottom):
#   1=D0, 2=D1(SCL), 3=D2(SDA), 4=D3, 5=D4,
#   6=3V3, 7=GND, 8=D5, 9=D6, 10=D7,
#   11=D8, 12=RX, 13=TX, 14=GND, 15=3V3

j2 = Part('Connector_Generic', 'Conn_01x15',
          ref='J2', value='ESP8266_Right',
          footprint='Connector_PinHeader_2.54mm:PinHeader_1x15_P2.54mm_Vertical')
j2[1]  += Net('ESP_D0')
j2[2]  += sck               # D1 = SCL (label at 67.31, 55.88)
j2[3]  += sda               # D2 = SDA (label at 67.31, 58.42)
j2[4]  += Net('ESP_D3')
j2[5]  += Net('ESP_D4_HDR')
j2[6]  += Net('ESP_3V3_R')
j2[7]  += gnd               # GND (label at 67.31, 68.58)
j2[8]  += Net('ESP_D5_HDR')
j2[9]  += Net('ESP_D6')
j2[10] += Net('ESP_D7')
j2[11] += Net('ESP_D8')
j2[12] += Net('ESP_RX')
j2[13] += tx                # TX  (label at 67.31, 81.28)
j2[14] += gnd               # GND (label at 67.31, 86.36)
j2[15] += Net('ESP_3V3_R2')


# ================================================================
# J3 — OLED DISPLAY (SSD1306, Conn_01x04)
# ================================================================
# KiCad position: (119.38, 55.88)
# Text annotation: "screen"
# Pin order: GND, VCC, SCK, SDA

j3 = Part('Connector_Generic', 'Conn_01x04',
          ref='J3', value='OLED_SSD1306',
          footprint='Connector_PinHeader_2.54mm:PinHeader_1x04_P2.54mm_Vertical')
j3[1] += gnd                # GND (label at 116.84, 60.96)
j3[2] += vcc                # VCC (label at 119.38, 60.96)
j3[3] += sck                # SCK (label at 121.92, 60.96)
j3[4] += sda                # SDA (label at 124.46, 60.96)


# ================================================================
# J4 — IDC 2x3 CONNECTOR (Motor side)
# ================================================================
# KiCad position: (97.79, 88.9)
# Text annotation: "left / Motor side"
# Connected nets: GND, D4, D5, 12V+, Vin

j4 = Part('Connector_Generic', 'Conn_02x03_Odd_Even',
          ref='J4', value='Motor_IDC',
          footprint='Connector_IDC:IDC-Header_2x03_P2.54mm_Vertical')
j4[1] += d4                 # D4  (label at 97.79, 81.28)
j4[2] += gnd                # GND (label at 95.25, 80.01)
j4[3] += vin                # Vin (label at 97.79, 93.98)
j4[4] += d5                 # D5  (label at 100.33, 93.98)
j4[5] += v12                # 12V+(label at 95.25, 95.25)
j4[6] += gnd                # GND


# ================================================================
# J5 — IDC 2x3 CONNECTOR (Hall-effect sensor side)
# ================================================================
# KiCad position: (133.35, 88.9)
# Text annotation: "right / Hall Effect Sensor side"
# Connected nets: GND, Vin, hall_effect

j5 = Part('Connector_Generic', 'Conn_02x03_Odd_Even',
          ref='J5', value='HallSensor_IDC',
          footprint='Connector_IDC:IDC-Header_2x03_P2.54mm_Vertical')
j5[1] += vin                # Vin        (label at 130.81, 81.28)
j5[2] += gnd                # GND        (label at 130.81, 93.98)
j5[3] += hall_effect         # hall_effect(label at 133.35, 93.98)
j5[4] += Net('J5_P4')       # unassigned
j5[5] += Net('J5_P5')       # unassigned
j5[6] += Net('J5_P6')       # unassigned


# ================================================================
# J6 — POWER CONNECTOR (Conn_01x02)
# ================================================================
# KiCad position: (78.74, 111.76)
# Text annotation: "POWER"
# Provides 12V+ and GND to the board

j6 = Part('Connector_Generic', 'Conn_01x02',
          ref='J6', value='Power_12V',
          footprint='Connector_PinHeader_2.54mm:PinHeader_1x02_P2.54mm_Vertical')
j6[1] += v12                # 12V+ (label at 81.28, 116.84)
j6[2] += gnd                # GND  (label at 78.74, 116.84)


# ================================================================
# A1 — ARDUINO NANO v3.x
# ================================================================
# KiCad position: (187.96, 71.12)
# Connected nets: GND (x2), Vin, tx, D4, hall_effect

a1 = Part('MCU_Module', 'Arduino_Nano_v3.x',
          ref='A1', value='Arduino_Nano_v3.x',
          footprint='Module:Arduino_Nano')
# Power
a1['5V']    += vin           # Vin (label at 185.42, 45.72)
a1['GND']   += gnd           # GND (label at 187.96, 96.52)
a1['GND1']  += gnd           # GND (label at 190.5, 96.52)

# Serial: ESP TX -> Nano RX
a1['D0']    += tx            # tx  (label at 175.26, 58.42) — Nano RX

# GPIO signals
a1['D2']    += hall_effect   # hall_effect (label at 175.26, 63.5)
a1['D4']    += d4            # D4  (label at 175.26, 66.04)

# Remaining pins — unconnected in schematic
a1['D1']    += Net('NANO_D1')
a1['D3']    += Net('NANO_D3')
a1['D5']    += Net('NANO_D5')
a1['D6']    += Net('NANO_D6')
a1['D7']    += Net('NANO_D7')
a1['D8']    += Net('NANO_D8')
a1['D9']    += Net('NANO_D9')
a1['D10']   += Net('NANO_D10')
a1['D11']   += Net('NANO_D11')
a1['D12']   += Net('NANO_D12')
a1['D13']   += Net('NANO_D13')
a1['A0']    += Net('NANO_A0')
a1['A1']    += Net('NANO_A1')
a1['A2']    += Net('NANO_A2')
a1['A3']    += Net('NANO_A3')
a1['A4']    += Net('NANO_A4')
a1['A5']    += Net('NANO_A5')
a1['A6']    += Net('NANO_A6')
a1['A7']    += Net('NANO_A7')
a1['3V3']   += Net('NANO_3V3')
a1['AREF']  += Net('NANO_AREF')
a1['~{RESET}'] += Net('NANO_RST')
a1['VIN']   += Net('NANO_VIN')


# ================================================================
# CONNECTIVITY SUMMARY
# ================================================================
# ESP8266 TX (J2 pin 13)  ----[tx]---->  Nano D0/RX (A1)
# ESP8266 D1/SCL (J2 pin 2) --[SCK]--->  OLED pin 3 (J3)
# ESP8266 D2/SDA (J2 pin 3) --[SDA]--->  OLED pin 4 (J3)
# ESP8266 D4 header  ----------[D4]---->  Nano D4 (A1) + J4 motor IDC
# ESP8266 D5 header  ----------[D5]---->  J4 motor IDC pin 4
# Nano D2 (A1)  --------[hall_effect]-->  J5 sensor IDC pin 3
# Power J6 pin 1  ---------[12V+]----->  J4 motor IDC pin 5
# Power J6 pin 2  ---------[GND]------>  Everywhere
# ESP VIN (J1 pin 15) -----[Vin]------>  Nano 5V + J4 pin 3 + J5 pin 1


# ================================================================
# OUTPUT
# ================================================================
if __name__ == '__main__':
    import sys

    if '--svg' in sys.argv:
        generate_svg()
    elif '--netlist' in sys.argv:
        generate_netlist()
    elif '--dot' in sys.argv:
        generate_graph()
    else:
        print("""
Motor Level Controller - Cryptographic Beings
==============================================
Components: A1 (Arduino Nano), J1-J2 (ESP8266 headers),
            J3 (OLED), J4 (Motor IDC), J5 (Sensor IDC),
            J6 (12V Power)

Signal flow:
  Ollama -> WiFi -> ESP8266 -> Serial TX -> Nano RX
  Nano D4 -> J4 IDC -> ISD04 stepper (STEP/DIR)
  J5 IDC -> hall_effect -> Nano D2
  ESP D1/D2 -> I2C -> SSD1306 OLED

Run with --svg, --netlist, or --dot for output.
        """)
