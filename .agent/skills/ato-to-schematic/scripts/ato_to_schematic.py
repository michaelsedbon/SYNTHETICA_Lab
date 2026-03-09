#!/usr/bin/env python3
"""
ato_to_schematic.py — Convert Atopile .ato files to KiCad .kicad_sch schematic

Usage:
    python3 ato_to_schematic.py <main.ato> [-o output.kicad_sch]

Parses .ato source files, extracts components/modules/connections,
and generates a KiCad 8 schematic with auto-generated symbols and net labels.
"""

import re
import sys
import uuid
import os
from pathlib import Path
from dataclasses import dataclass, field
from typing import Optional


# ── Data structures ──────────────────────────────────────────

@dataclass
class Pin:
    name: str
    number: int

@dataclass
class Component:
    name: str
    lcsc_id: str = ""
    footprint: str = ""
    pins: list = field(default_factory=list)

@dataclass
class Instance:
    var_name: str
    type_name: str

@dataclass
class Connection:
    a: str  # e.g. "vdd" or "ldo.vin"
    b: str

@dataclass
class Module:
    name: str
    signals: list = field(default_factory=list)
    instances: list = field(default_factory=list)
    connections: list = field(default_factory=list)
    source_file: str = ""


# ── .ato Parser ──────────────────────────────────────────────

class AtoParser:
    """Parse .ato files into components and modules."""

    def __init__(self, base_dir: str):
        self.base_dir = Path(base_dir)
        self.components: dict[str, Component] = {}
        self.modules: dict[str, Module] = {}
        self.parsed_files: set = set()

    def parse_file(self, filepath: str):
        path = Path(filepath)
        if str(path) in self.parsed_files:
            return
        self.parsed_files.add(str(path))

        with open(path) as f:
            content = f.read()

        # Resolve imports
        for m in re.finditer(r'from\s+"([^"]+)"\s+import\s+(\w+)', content):
            import_path = m.group(1)
            if not import_path.startswith("generics/"):
                resolved = self.base_dir / import_path
                if resolved.exists():
                    self.parse_file(str(resolved))

        for m in re.finditer(r'import\s+(\w+)\s+from\s+"([^"]+)"', content):
            import_path = m.group(2)
            if not import_path.startswith("generics/"):
                resolved = self.base_dir / import_path
                if resolved.exists():
                    self.parse_file(str(resolved))

        # Parse blocks by indentation
        lines = content.split('\n')
        i = 0
        while i < len(lines):
            line = lines[i].rstrip()

            # Component definition
            cm = re.match(r'^component\s+(\w+):', line)
            if cm:
                comp = Component(name=cm.group(1))
                i += 1
                while i < len(lines) and (lines[i].startswith('    ') or lines[i].strip() == ''):
                    sl = lines[i].strip()
                    # lcsc_id
                    lm = re.match(r'lcsc_id\s*=\s*"([^"]*)"', sl)
                    if lm:
                        comp.lcsc_id = lm.group(1)
                    # footprint
                    fm = re.match(r'footprint\s*=\s*"([^"]*)"', sl)
                    if fm:
                        comp.footprint = fm.group(1)
                    # signal NAME ~ pin N
                    pm = re.match(r'signal\s+(\w+)\s*~\s*pin\s+(\d+)', sl)
                    if pm:
                        comp.pins.append(Pin(pm.group(1), int(pm.group(2))))
                    i += 1
                self.components[comp.name] = comp
                continue

            # Module definition
            mm = re.match(r'^module\s+(\w+):', line)
            if mm:
                mod = Module(name=mm.group(1), source_file=os.path.basename(str(path)))
                i += 1
                while i < len(lines) and (lines[i].startswith('    ') or lines[i].strip() == ''):
                    sl = lines[i].strip()
                    if not sl or sl.startswith('#'):
                        i += 1
                        continue
                    # signal declaration
                    sm = re.match(r'^signal\s+(\w+)$', sl)
                    if sm:
                        mod.signals.append(sm.group(1))
                        i += 1
                        continue
                    # instance: var = new Type
                    im = re.match(r'^(\w+)\s*=\s*new\s+(\w+)', sl)
                    if im:
                        mod.instances.append(Instance(im.group(1), im.group(2)))
                        i += 1
                        continue
                    # connection: a ~ b (but not signal~pin or value assignments)
                    conn = re.match(r'^([\w.]+)\s*~\s*([\w.]+)$', sl)
                    if conn:
                        mod.connections.append(Connection(conn.group(1), conn.group(2)))
                        i += 1
                        continue
                    i += 1
                self.modules[mod.name] = mod
                continue

            i += 1


# ── Union-Find for net merging ────────────────────────────────

class UnionFind:
    def __init__(self):
        self.parent = {}

    def find(self, x):
        if x not in self.parent:
            self.parent[x] = x
        if self.parent[x] != x:
            self.parent[x] = self.find(self.parent[x])
        return self.parent[x]

    def union(self, a, b):
        ra, rb = self.find(a), self.find(b)
        if ra != rb:
            self.parent[rb] = ra


# ── KiCad Schematic Generator ────────────────────────────────

def new_uuid():
    return str(uuid.uuid4())


def generate_symbol_def(comp: Component) -> str:
    """Generate a KiCad lib_symbol definition for a component."""
    name = f"ato:{comp.name}"
    n_pins = len(comp.pins)

    # Split pins: left side and right side
    sorted_pins = sorted(comp.pins, key=lambda p: p.number)
    mid = (n_pins + 1) // 2
    left_pins = sorted_pins[:mid]
    right_pins = sorted_pins[mid:]

    # Box size
    pin_spacing = 2.54
    height = max(len(left_pins), len(right_pins)) * pin_spacing + pin_spacing
    half_h = height / 2
    box_width = 10.16  # 4 grid units wide

    lines = []
    lines.append(f'\t\t(symbol "{name}"')
    lines.append(f'\t\t\t(pin_names (offset 1.016))')
    lines.append(f'\t\t\t(exclude_from_sim no)')
    lines.append(f'\t\t\t(in_bom yes)')
    lines.append(f'\t\t\t(on_board yes)')

    # Properties
    for prop_name, prop_val, y_off, hide in [
        ("Reference", "U", half_h + 1.27, False),
        ("Value", comp.name, -(half_h + 1.27), False),
        ("Footprint", comp.footprint, -(half_h + 3.81), True),
        ("LCSC", comp.lcsc_id, -(half_h + 6.35), True),
    ]:
        lines.append(f'\t\t\t(property "{prop_name}" "{prop_val}"')
        lines.append(f'\t\t\t\t(at 0 {y_off:.2f} 0)')
        lines.append(f'\t\t\t\t(effects (font (size 1.27 1.27))')
        if hide:
            lines.append(f'\t\t\t\t\t(hide yes)')
        lines.append(f'\t\t\t\t)')
        lines.append(f'\t\t\t)')

    # Symbol body
    lines.append(f'\t\t\t(symbol "{comp.name}_1_1"')

    # Rectangle
    lines.append(f'\t\t\t\t(rectangle')
    lines.append(f'\t\t\t\t\t(start -{box_width / 2:.2f} {half_h:.2f})')
    lines.append(f'\t\t\t\t\t(end {box_width / 2:.2f} -{half_h:.2f})')
    lines.append(f'\t\t\t\t\t(stroke (width 0.254) (type default))')
    lines.append(f'\t\t\t\t\t(fill (type background))')
    lines.append(f'\t\t\t\t)')

    # Left pins
    pin_length = 3.81
    for idx, pin in enumerate(left_pins):
        y = half_h - pin_spacing * (idx + 0.5)
        x = -(box_width / 2 + pin_length)
        lines.append(f'\t\t\t\t(pin passive line')
        lines.append(f'\t\t\t\t\t(at {x:.2f} {y:.2f} 0)')
        lines.append(f'\t\t\t\t\t(length {pin_length})')
        lines.append(f'\t\t\t\t\t(name "{pin.name}" (effects (font (size 1.27 1.27))))')
        lines.append(f'\t\t\t\t\t(number "{pin.number}" (effects (font (size 1.27 1.27))))')
        lines.append(f'\t\t\t\t)')

    # Right pins
    for idx, pin in enumerate(right_pins):
        y = half_h - pin_spacing * (idx + 0.5)
        x = box_width / 2 + pin_length
        lines.append(f'\t\t\t\t(pin passive line')
        lines.append(f'\t\t\t\t\t(at {x:.2f} {y:.2f} 180)')
        lines.append(f'\t\t\t\t\t(length {pin_length})')
        lines.append(f'\t\t\t\t\t(name "{pin.name}" (effects (font (size 1.27 1.27))))')
        lines.append(f'\t\t\t\t\t(number "{pin.number}" (effects (font (size 1.27 1.27))))')
        lines.append(f'\t\t\t\t)')

    lines.append(f'\t\t\t)')  # close symbol body
    lines.append(f'\t\t)')  # close symbol
    return '\n'.join(lines)


def generate_symbol_instance(comp: Component, ref: str, inst_name: str,
                             x: float, y: float) -> str:
    """Generate a placed symbol instance on the schematic."""
    sym_name = f"ato:{comp.name}"
    uid = new_uuid()

    lines = []
    lines.append(f'\t(symbol')
    lines.append(f'\t\t(lib_id "{sym_name}")')
    lines.append(f'\t\t(at {x:.2f} {y:.2f} 0)')
    lines.append(f'\t\t(unit 1)')
    lines.append(f'\t\t(exclude_from_sim no)')
    lines.append(f'\t\t(in_bom yes)')
    lines.append(f'\t\t(on_board yes)')
    lines.append(f'\t\t(dnp no)')
    lines.append(f'\t\t(uuid "{uid}")')

    # Properties
    sorted_pins = sorted(comp.pins, key=lambda p: p.number)
    n_pins = len(sorted_pins)
    half_h = (max((n_pins + 1) // 2, n_pins - (n_pins + 1) // 2) * 2.54 + 2.54) / 2

    lines.append(f'\t\t(property "Reference" "{ref}"')
    lines.append(f'\t\t\t(at {x:.2f} {y - half_h - 1.27:.2f} 0)')
    lines.append(f'\t\t\t(effects (font (size 1.27 1.27)))')
    lines.append(f'\t\t)')

    lines.append(f'\t\t(property "Value" "{inst_name}"')
    lines.append(f'\t\t\t(at {x:.2f} {y + half_h + 1.27:.2f} 0)')
    lines.append(f'\t\t\t(effects (font (size 1.27 1.27)))')
    lines.append(f'\t\t)')

    lines.append(f'\t\t(property "Footprint" "{comp.footprint}"')
    lines.append(f'\t\t\t(at {x:.2f} {y + half_h + 3.81:.2f} 0)')
    lines.append(f'\t\t\t(effects (font (size 1.27 1.27)) (hide yes))')
    lines.append(f'\t\t)')

    lines.append(f'\t\t(property "LCSC" "{comp.lcsc_id}"')
    lines.append(f'\t\t\t(at {x:.2f} {y + half_h + 6.35:.2f} 0)')
    lines.append(f'\t\t\t(effects (font (size 1.27 1.27)) (hide yes))')
    lines.append(f'\t\t)')

    # Pin instances
    for pin in sorted_pins:
        lines.append(f'\t\t(pin "{pin.number}" (uuid "{new_uuid()}"))')

    lines.append(f'\t)')
    return '\n'.join(lines), uid


def generate_net_label(net_name: str, x: float, y: float, angle: int = 0) -> str:
    """Generate a net label at a pin endpoint."""
    uid = new_uuid()
    # Use power_port for VDD/GND/VCC, regular label for others
    is_power = net_name.lower() in ('gnd', 'vdd', 'vcc', 'v3v3', 'v12', 'vm', 'dvdd',
                                     'dgnd', 'avdd', 'agnd', 'vbus')

    if is_power:
        return f'\t(global_label "{net_name}" (shape passive) (at {x:.2f} {y:.2f} {angle}) (effects (font (size 1.27 1.27))) (uuid "{uid}") (property "Intersheetrefs" "${{INTERSHEET_REFS}}" (at 0 0 0) (effects (font (size 1.27 1.27)) (hide yes))))'
    else:
        return f'\t(label "{net_name}" (at {x:.2f} {y:.2f} {angle}) (effects (font (size 1.27 1.27))) (uuid "{uid}"))'


def generate_title_text(text: str, x: float, y: float) -> str:
    """Generate a text annotation for module titles."""
    uid = new_uuid()
    return f'\t(text "{text}" (at {x:.2f} {y:.2f} 0) (effects (font (size 2.54 2.54) bold) (justify left)) (uuid "{uid}"))'


def build_schematic(parser: AtoParser, entry_module: str) -> str:
    """Build a complete KiCad schematic from parsed .ato data."""

    # Collect all used component types
    used_components = set()
    modules_to_render = []

    def collect_module(mod_name: str, prefix: str = ""):
        if mod_name not in parser.modules:
            return
        mod = parser.modules[mod_name]
        modules_to_render.append((mod, prefix))

        for inst in mod.instances:
            if inst.type_name in parser.components:
                used_components.add(inst.type_name)
            elif inst.type_name in parser.modules:
                collect_module(inst.type_name, f"{prefix}{inst.var_name}." if prefix else f"{inst.var_name}.")

    collect_module(entry_module)

    # Generate lib_symbols
    lib_symbols = []
    for comp_name in sorted(used_components):
        comp = parser.components[comp_name]
        lib_symbols.append(generate_symbol_def(comp))

    # Build net map for each module using union-find
    # Flatten the entire design into a single net namespace
    uf = UnionFind()

    def resolve_path(mod: Module, prefix: str, ref: str) -> str:
        """Resolve a reference like 'ldo.vin' to a global path."""
        parts = ref.split('.', 1)
        if len(parts) == 1:
            # Module-level signal
            return f"{prefix}{ref}"
        else:
            var, pin = parts[0], parts[1]
            # Check if var is an instance in this module
            for inst in mod.instances:
                if inst.var_name == var:
                    if inst.type_name in parser.modules:
                        # It's a sub-module — resolve its signal
                        return f"{prefix}{var}.{pin}"
                    else:
                        # It's a component instance — return component.pin
                        return f"{prefix}{var}.{pin}"
            return f"{prefix}{ref}"

    def process_connections(mod: Module, prefix: str):
        for conn in mod.connections:
            a = resolve_path(mod, prefix, conn.a)
            b = resolve_path(mod, prefix, conn.b)
            uf.union(a, b)

        # Recurse into sub-modules
        for inst in mod.instances:
            if inst.type_name in parser.modules:
                sub_prefix = f"{prefix}{inst.var_name}."
                sub_mod = parser.modules[inst.type_name]
                process_connections(sub_mod, sub_prefix)

    if entry_module in parser.modules:
        process_connections(parser.modules[entry_module], "")

    # Assign human-readable net names
    def get_net_name(path: str) -> str:
        root = uf.find(path)
        # Try to find the shortest/cleanest name in the equivalence class
        # Prefer module-level signals (no dots)
        candidates = [k for k, v in uf.parent.items() if uf.find(k) == root]
        # Prefer names without dots (top-level signals)
        top_level = [c for c in candidates if '.' not in c]
        if top_level:
            return sorted(top_level, key=len)[0]
        # Otherwise use the root but clean it up
        return root.replace('.', '_')

    # Place components on the schematic
    symbol_instances = []
    symbol_instance_refs = []
    net_labels = []
    texts = []

    ref_counters = {}
    def next_ref(prefix: str) -> str:
        ref_counters[prefix] = ref_counters.get(prefix, 0) + 1
        return f"{prefix}{ref_counters[prefix]}"

    # Layout: modules arranged vertically, components within each horizontally
    module_y = 30.0
    HORIZ_SPACING = 50.0
    VERT_SPACING = 70.0

    def place_module_components(mod: Module, prefix: str, start_x: float, start_y: float):
        nonlocal module_y
        x_offset = start_x
        placed = []

        # Add module title
        title = f"── {mod.name} ──"
        if prefix:
            title = f"── {prefix.rstrip('.')} ({mod.name}) ──"
        texts.append(generate_title_text(title, start_x - 10, start_y - 20))

        for inst in mod.instances:
            if inst.type_name in parser.components:
                comp = parser.components[inst.type_name]
                ref_prefix = "U"
                if "resistor" in inst.type_name.lower() or "Resistor" in inst.type_name:
                    ref_prefix = "R"
                elif "capacitor" in inst.type_name.lower() or "Capacitor" in inst.type_name or "Cap" in inst.type_name:
                    ref_prefix = "C"
                elif "connector" in inst.type_name.lower() or "Conn" in inst.type_name or "Jack" in inst.type_name or "Terminal" in inst.type_name or "Barrel" in inst.type_name or "Screw" in inst.type_name or "USB" in inst.type_name:
                    ref_prefix = "J"
                elif "switch" in inst.type_name.lower() or "Switch" in inst.type_name or "Tactile" in inst.type_name:
                    ref_prefix = "SW"

                ref = next_ref(ref_prefix)
                inst_label = f"{prefix}{inst.var_name}"
                result, uid = generate_symbol_instance(comp, ref, inst_label, x_offset, start_y)
                symbol_instances.append(result)
                symbol_instance_refs.append((uid, ref, f"ato:{comp.name}"))

                # Add net labels at pin positions
                sorted_pins = sorted(comp.pins, key=lambda p: p.number)
                n_pins = len(sorted_pins)
                mid = (n_pins + 1) // 2
                left_pins = sorted_pins[:mid]
                right_pins = sorted_pins[mid:]
                pin_spacing = 2.54
                height = max(len(left_pins), len(right_pins)) * pin_spacing + pin_spacing
                half_h = height / 2
                box_width = 10.16
                pin_length = 3.81

                for idx, pin in enumerate(left_pins):
                    py = start_y + half_h - pin_spacing * (idx + 0.5)
                    px = x_offset - (box_width / 2 + pin_length)
                    pin_path = f"{prefix}{inst.var_name}.{pin.name}"
                    net = get_net_name(pin_path)
                    net_labels.append(generate_net_label(net, px, py, 0))

                for idx, pin in enumerate(right_pins):
                    py = start_y + half_h - pin_spacing * (idx + 0.5)
                    px = x_offset + (box_width / 2 + pin_length)
                    pin_path = f"{prefix}{inst.var_name}.{pin.name}"
                    net = get_net_name(pin_path)
                    net_labels.append(generate_net_label(net, px, py, 180))

                placed.append((inst, x_offset))
                x_offset += HORIZ_SPACING

            elif inst.type_name in parser.modules:
                # Sub-module: recurse
                sub_prefix = f"{prefix}{inst.var_name}."
                sub_mod = parser.modules[inst.type_name]
                place_module_components(sub_mod, sub_prefix, x_offset, module_y)
                module_y += VERT_SPACING

        return placed

    if entry_module in parser.modules:
        entry_mod = parser.modules[entry_module]
        place_module_components(entry_mod, "", 60.0, module_y)

    # Assemble the schematic
    sch_lines = []
    sch_lines.append('(kicad_sch')
    sch_lines.append('\t(version 20231120)')
    sch_lines.append('\t(generator "ato_to_schematic")')
    sch_lines.append('\t(generator_version "1.0")')
    sch_lines.append(f'\t(uuid "{new_uuid()}")')
    sch_lines.append('\t(paper "A3")')

    # Lib symbols
    sch_lines.append('\t(lib_symbols')
    for sym in lib_symbols:
        sch_lines.append(sym)
    sch_lines.append('\t)')

    # Texts
    for t in texts:
        sch_lines.append(t)

    # Symbol instances on sheet
    for si in symbol_instances:
        sch_lines.append(si)

    # Net labels
    for nl in net_labels:
        sch_lines.append(nl)

    # Symbol instances section (KiCad 8 requires this)
    sch_lines.append('\t(symbol_instances')
    for uid, ref, lib_id in symbol_instance_refs:
        sch_lines.append(f'\t\t(path "/{uid}" (reference "{ref}") (unit 1))')
    sch_lines.append('\t)')

    sch_lines.append(')')
    return '\n'.join(sch_lines)


# ── Main ─────────────────────────────────────────────────────

def main():
    import argparse
    ap = argparse.ArgumentParser(description="Convert Atopile .ato to KiCad .kicad_sch")
    ap.add_argument("input", help="Path to main.ato entry file")
    ap.add_argument("-o", "--output", help="Output .kicad_sch path (default: <input_dir>/schematic.kicad_sch)")
    ap.add_argument("-m", "--module", help="Entry module name (auto-detected from main.ato if not specified)")
    args = ap.parse_args()

    input_path = Path(args.input).resolve()
    base_dir = input_path.parent

    # Parse
    parser = AtoParser(str(base_dir))
    parser.parse_file(str(input_path))

    print(f"Parsed {len(parser.parsed_files)} files")
    print(f"  Components: {', '.join(parser.components.keys())}")
    print(f"  Modules: {', '.join(parser.modules.keys())}")

    # Find entry module
    entry_module = args.module
    if not entry_module:
        # Use the first module defined in main.ato
        with open(input_path) as f:
            content = f.read()
        m = re.search(r'^module\s+(\w+):', content, re.MULTILINE)
        if m:
            entry_module = m.group(1)
        else:
            print("Error: No module found in main.ato. Use -m to specify.", file=sys.stderr)
            sys.exit(1)

    print(f"  Entry module: {entry_module}")

    # Generate
    schematic = build_schematic(parser, entry_module)

    # Write output
    output_path = args.output or str(base_dir / "schematic.kicad_sch")
    with open(output_path, 'w') as f:
        f.write(schematic)

    print(f"\nGenerated: {output_path}")
    print(f"Open in KiCad: open '{output_path}'")


if __name__ == "__main__":
    main()
