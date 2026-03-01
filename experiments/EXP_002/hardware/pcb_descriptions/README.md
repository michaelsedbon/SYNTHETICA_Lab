# PCB Descriptions — SKiDL Documentation

## What is SKiDL?

[SKiDL](https://github.com/devbisme/skidl) is a Python module for describing electronic circuits as code. Instead of drawing schematics in a GUI, you write Python scripts that define components and their connections.

### Install

```bash
pip install skidl
```

### Usage Pattern

Each PCB in the machine gets its own `.py` file. Example:

```python
from skidl import *

# Define components
mcu = Part('MCU_Microchip', 'ATmega328P-AU')
driver = Part('Driver_Motor', 'A4988')
sensor_top = Part('Sensor', 'TCPT1300X01', ref='U_SENS_TOP')
sensor_bot = Part('Sensor', 'TCPT1300X01', ref='U_SENS_BOT')
led = Part('LED', 'WS2812B', ref='D_LED')

# Define nets (connections)
step_net = Net('STEP')
dir_net = Net('DIR')

# Wire components
mcu['PB0'] += step_net
driver['STEP'] += step_net
mcu['PB1'] += dir_net
driver['DIR'] += dir_net

# Generate netlist
generate_netlist()
```

### Benefits

- **No PCB design tools needed** — just Python + a text editor
- **Self-documenting** — Python code with comments serves as documentation
- **Version control** — `.py` files track changes naturally in git
- **Reproducible** — can generate KiCad netlists for re-fabrication
- **Diagrammable** — can generate SVG schematics and DOT graphs

## Board Files

| Board | File | Status |
|-------|------|--------|
| Motor/Level Controller | [`motor_level_controller.py`](motor_level_controller.py) | 📝 Template |
| Main Controller | `main_controller.py` | ⬜ TODO |
| Sensor Module | `sensor_module.py` | ⬜ TODO |
| LED Driver | `led_driver.py` | ⬜ TODO |

> **Next step:** Describe each board's components to me (chips, connectors, any markings you can read off the PCBs) and I'll create the SKiDL descriptions.
