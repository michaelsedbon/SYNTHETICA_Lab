#!/usr/bin/env python3
"""
Motor Level Controller - Schematic Diagram
===========================================
Renders the actual components identified from PCB photos.

Run:  /opt/anaconda3/bin/python3 render_schematic.py
Output: motor_level_controller_schematic.svg
"""

import schemdraw
import schemdraw.elements as elm

OUTPUT_FILE = 'motor_level_controller_schematic.svg'

with schemdraw.Drawing(show=False, file=OUTPUT_FILE) as d:
    d.config(fontsize=11, unit=3.5)

    # -- POWER SECTION --

    # Input power label
    d += elm.Dot().at((0, 0))
    d += elm.Label().at((-1.2, 0)).label('VIN 12V')

    # Input decoupling cap
    d += elm.Capacitor().at((0, 0)).down(1.5).label('C3\n100nF', loc='right', fontsize=9)
    d += elm.Ground()

    # Line to first regulator
    d += elm.Line().at((0, 0)).right(2)

    # LM317T #1 to +5V
    vreg1 = elm.Ic(size=(3, 1.5))
    vreg1.side('left', leadlen=0.5)
    vreg1.side('right', leadlen=0.5)
    vreg1.side('bottom', leadlen=0.5)
    vreg1.pin(name='IN', side='left', slot='1/1')
    vreg1.pin(name='OUT', side='right', slot='1/1')
    vreg1.pin(name='ADJ', side='bottom', slot='1/1')
    d += vreg1.anchor('IN').label('LM317T\nto 5V', loc='center', fontsize=8)

    # Adj pin resistor divider
    d += elm.Resistor().at(vreg1.ADJ).down(1.2).label('R_ADJ2\n720R', loc='right', fontsize=8)
    d += elm.Ground()
    d += elm.Resistor().at(vreg1.ADJ).right(1.5).label('R_ADJ1\n240R', loc='top', fontsize=8)
    d += elm.Line().up(0.75)
    d += elm.Dot()

    # +5V output
    d += elm.Line().at(vreg1.OUT).right(2)
    five_v_pt = d.here
    d += elm.Dot()
    d += elm.Label().label('+5V', fontsize=11)

    # Output cap C4
    d += elm.Capacitor().at(five_v_pt).down(1.5).label('C4\n100nF', loc='right', fontsize=9)
    d += elm.Ground()

    # Second LM317T #2
    d += elm.Line().at(five_v_pt).right(3)
    vreg2 = elm.Ic(size=(3, 1.5))
    vreg2.side('left', leadlen=0.5)
    vreg2.side('right', leadlen=0.5)
    vreg2.side('bottom', leadlen=0.5)
    vreg2.pin(name='IN', side='left', slot='1/1')
    vreg2.pin(name='OUT', side='right', slot='1/1')
    vreg2.pin(name='ADJ', side='bottom', slot='1/1')
    d += vreg2.anchor('IN').label('LM317T-2\nto 3V3', loc='center', fontsize=8)
    d += elm.Ground().at(vreg2.ADJ)

    d += elm.Line().at(vreg2.OUT).right(1.5)
    d += elm.Dot()
    d += elm.Label().label('+3V3', fontsize=11)

    # Cap C5
    d += elm.Capacitor().down(1.5).label('C5\n100nF', loc='right', fontsize=9)
    d += elm.Ground()

    # -- NodeMCU ESP8266 --

    mcu = elm.Ic(size=(5, 8))
    mcu.side('left', leadlen=0.7, spacing=0.8, pad=0.6)
    mcu.side('right', leadlen=0.7, spacing=0.8, pad=0.6)
    mcu.side('top', leadlen=0.5)
    mcu.side('bottom', leadlen=0.5)
    mcu.pin(name='VCC', side='top', slot='1/1')
    mcu.pin(name='GND', side='bottom', slot='1/1')
    # Left pins
    mcu.pin(name='A0',  side='left', slot='1/8')
    mcu.pin(name='D0',  side='left', slot='2/8')
    mcu.pin(name='D1',  side='left', slot='3/8')
    mcu.pin(name='D2',  side='left', slot='4/8')
    mcu.pin(name='D3',  side='left', slot='5/8')
    mcu.pin(name='D4',  side='left', slot='6/8')
    mcu.pin(name='D5',  side='left', slot='7/8')
    mcu.pin(name='RX',  side='left', slot='8/8')
    # Right pins
    mcu.pin(name='D6',  side='right', slot='1/6')
    mcu.pin(name='D7',  side='right', slot='2/6')
    mcu.pin(name='D8',  side='right', slot='3/6')
    mcu.pin(name='TX',  side='right', slot='4/6')
    mcu.pin(name='RST', side='right', slot='5/6')
    mcu.pin(name='EN',  side='right', slot='6/6')

    d += mcu.at((9, -6)).anchor('center').label('NodeMCU\nESP8266', loc='center', fontsize=9)
    d += elm.Vdd().at(mcu.VCC).label('+3V3')
    d += elm.Ground().at(mcu.GND)

    # I2C labels
    d += elm.Label().at(mcu.D1).label('SCL', fontsize=8, loc='left')
    d += elm.Label().at(mcu.D2).label('SDA', fontsize=8, loc='left')

    # -- MCP23017 I2C GPIO EXPANDER --

    mcp = elm.Ic(size=(5, 9))
    mcp.side('left', leadlen=0.7, spacing=0.7, pad=0.5)
    mcp.side('right', leadlen=0.7, spacing=0.7, pad=0.5)
    mcp.side('top', leadlen=0.5, spacing=1.2)
    mcp.side('bottom', leadlen=0.5, spacing=1.2)
    mcp.pin(name='VDD', side='top', slot='1/2')
    mcp.pin(name='SCL', side='top', slot='2/2')
    mcp.pin(name='GND', side='bottom', slot='1/2')
    mcp.pin(name='SDA', side='bottom', slot='2/2')
    # Port A (left)
    mcp.pin(name='PA0', side='left', slot='1/8')
    mcp.pin(name='PA1', side='left', slot='2/8')
    mcp.pin(name='PA2', side='left', slot='3/8')
    mcp.pin(name='PA3', side='left', slot='4/8')
    mcp.pin(name='PA4', side='left', slot='5/8')
    mcp.pin(name='PA5', side='left', slot='6/8')
    mcp.pin(name='PA6', side='left', slot='7/8')
    mcp.pin(name='PA7', side='left', slot='8/8')
    # Port B (right)
    mcp.pin(name='PB0', side='right', slot='1/8')
    mcp.pin(name='PB1', side='right', slot='2/8')
    mcp.pin(name='PB2', side='right', slot='3/8')
    mcp.pin(name='PB3', side='right', slot='4/8')
    mcp.pin(name='PB4', side='right', slot='5/8')
    mcp.pin(name='PB5', side='right', slot='6/8')
    mcp.pin(name='PB6', side='right', slot='7/8')
    mcp.pin(name='PB7', side='right', slot='8/8')

    d += mcp.at((22, -6)).anchor('center').label('MCP23017\nGPIO Expander\nDIP-28', loc='center', fontsize=8)
    d += elm.Vdd().at(mcp.VDD).label('+5V')
    d += elm.Ground().at(mcp.GND)

    # I2C wires from MCU to MCP23017
    d += elm.Wire('-|').at(mcu.D1).to(mcp.SCL).color('blue')
    d += elm.Wire('-|').at(mcu.D2).to(mcp.SDA).color('blue')

    # I2C pull-up resistors
    d += elm.Resistor().at(mcp.SCL).up(1.5).label('R_SCL\n4k7', loc='right', fontsize=8)
    d += elm.Vdd().label('+5V', fontsize=8)

    d += elm.Resistor().at(mcp.SDA).down(1.5).label('R_SDA\n4k7', loc='right', fontsize=8)
    d += elm.Ground()

    # -- DIP SWITCH SW1 (I2C Address) --

    sw = elm.Ic(size=(2.5, 1.5))
    sw.side('left', leadlen=0.5, spacing=0.4, pad=0.2)
    sw.pin(name='S1', side='left', slot='1/3')
    sw.pin(name='S2', side='left', slot='2/3')
    sw.pin(name='S3', side='left', slot='3/3')
    d += sw.at((22, -13)).anchor('center').label('SW1\n3-pos DIP', loc='center', fontsize=8)

    # Pull-ups on address lines
    d += elm.Resistor().at(sw.S1).left(2).label('R5 10k', loc='top', fontsize=8)
    d += elm.Vdd().label('+5V', fontsize=8)
    d += elm.Resistor().at(sw.S2).left(2).label('R8 10k', loc='top', fontsize=8)
    d += elm.Vdd().label('+5V', fontsize=8)
    d += elm.Resistor().at(sw.S3).left(2).label('R_A2 10k', loc='top', fontsize=8)
    d += elm.Vdd().label('+5V', fontsize=8)

    d += elm.Label().at((22, -14.5)).label('A0  A1  A2   MCP23017 Address', fontsize=8, color='teal')

    # -- OLED DISPLAY (SSD1306 I2C) --

    oled = elm.Ic(size=(3, 2))
    oled.side('bottom', leadlen=0.5, spacing=0.7, pad=0.3)
    oled.pin(name='GND', side='bottom', slot='1/4')
    oled.pin(name='VCC', side='bottom', slot='2/4')
    oled.pin(name='SCK', side='bottom', slot='3/4')
    oled.pin(name='SDA', side='bottom', slot='4/4')

    d += oled.at((9, 3)).anchor('center').label('SSD1306\nOLED 0.96in', loc='center', fontsize=8)
    d += elm.Ground().at(oled.GND)
    d += elm.Vdd().at(oled.VCC).label('+5V', fontsize=8)

    d += elm.Label().at(oled.SCK).label('SCL', fontsize=7, loc='bottom')
    d += elm.Label().at(oled.SDA).label('SDA', fontsize=7, loc='bottom')

    # -- IDC CONNECTORS (3x 2x3) --

    # Connector block J10_A
    idc_a = elm.Ic(size=(2, 1.5))
    idc_a.side('left', leadlen=0.5, spacing=0.4, pad=0.2)
    idc_a.pin(name='P1', side='left', slot='1/3')
    idc_a.pin(name='P2', side='left', slot='2/3')
    idc_a.pin(name='P3', side='left', slot='3/3')
    d += idc_a.at((30, -3)).anchor('center').label('J10_A\n2x3 IDC', loc='center', fontsize=7)

    # Connector block J10_B
    idc_b = elm.Ic(size=(2, 1.5))
    idc_b.side('left', leadlen=0.5, spacing=0.4, pad=0.2)
    idc_b.pin(name='P1', side='left', slot='1/3')
    idc_b.pin(name='P2', side='left', slot='2/3')
    idc_b.pin(name='P3', side='left', slot='3/3')
    d += idc_b.at((30, -5.5)).anchor('center').label('J10_B\n2x3 IDC', loc='center', fontsize=7)

    # Connector block J10_C
    idc_c = elm.Ic(size=(2, 1.5))
    idc_c.side('left', leadlen=0.5, spacing=0.4, pad=0.2)
    idc_c.pin(name='P1', side='left', slot='1/3')
    idc_c.pin(name='P2', side='left', slot='2/3')
    idc_c.pin(name='P3', side='left', slot='3/3')
    d += idc_c.at((30, -8)).anchor('center').label('J10_C\n2x3 IDC', loc='center', fontsize=7)

    # Connection lines from MCP port B to IDC connectors
    d += elm.Wire('-').at(mcp.PB0).to(idc_a.P1).color('green')
    d += elm.Wire('-').at(mcp.PB2).to(idc_b.P1).color('green')
    d += elm.Wire('-').at(mcp.PB4).to(idc_c.P1).color('green')

    # Label
    d += elm.Label().at((33, -5.5)).label('Motors and\nSensors', fontsize=9, color='green')

    # -- TEST BED HEADER --

    d += elm.Dot().at((0, -6))
    d += elm.Label().at((-0.5, -6)).label('TEST\nBED', fontsize=8, color='gray')
    d += elm.Line().at((0, -6)).down(1)
    d += elm.Label().label('GND | 5V+', fontsize=8, color='gray')

    # -- TITLE --

    d += elm.Label().at((14, 6)).label('Motor Level Controller - Cryptographic Beings', fontsize=14)
    d += elm.Label().at((14, 5.2)).label('Components from PCB photos IMG 0707-0711', fontsize=9, color='gray')

print(f"Generated: {OUTPUT_FILE}")
import os
print(f"   Open: file://{os.path.abspath(OUTPUT_FILE)}")
