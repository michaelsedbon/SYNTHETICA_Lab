# Fusion 360 Script: Export Assembly
# Exports the ENTIRE root design as a STEP assembly file, plus individual
# STL files for each top-level component with a JSON manifest describing
# component names, filenames, and colors.
#
# Usage:
#   1. Open your assembly design in Fusion 360
#   2. Run this script via Utilities → Scripts and Add-Ins
#   3. Choose an output folder
#   4. All files are exported and packaged into a ZIP

import adsk.core
import adsk.fusion
import os
import json
import traceback
import zipfile

app = adsk.core.Application.get()
ui = app.userInterface


def _sanitize(name: str) -> str:
    """Sanitise a name for use as a filename."""
    return "".join(c if c.isalnum() or c in (" ", "-", "_") else "_" for c in name).strip()


def _get_appearance_color(component: adsk.fusion.Component) -> str:
    """
    Extract the dominant color from a component's appearance.
    Falls back to the first body's appearance, then to a default grey.
    Returns a hex string like '#4488CC'.
    """
    appearance = None

    # Try component-level appearance first
    if component.material and component.material.appearance:
        appearance = component.material.appearance

    # Fallback: first body's appearance
    if appearance is None and component.bRepBodies.count > 0:
        body = component.bRepBodies.item(0)
        if body.appearance:
            appearance = body.appearance

    # Fallback: component's own appearance property
    if appearance is None:
        try:
            appearance = component.appearance
        except Exception:
            pass

    if appearance is not None:
        try:
            # Search for a color property in the appearance
            for i in range(appearance.appearanceProperties.count):
                prop = appearance.appearanceProperties.item(i)
                if hasattr(prop, "value") and isinstance(prop.value, adsk.core.Color):
                    c = prop.value
                    return f"#{c.red:02X}{c.green:02X}{c.blue:02X}"
        except Exception:
            pass

    return None  # No color found — will be auto-assigned


# Predefined palette for components without explicit colors
PALETTE = [
    "#569CD6", "#4EC9B0", "#CE9178", "#9CDCFE", "#B5CEA8",
    "#EF4444", "#22C55E", "#3B82F6", "#EAB308", "#A855F7",
    "#EC4899", "#F97316", "#06B6D4", "#8B5CF6", "#10B981",
]


def run(context):
    try:
        design = adsk.fusion.Design.cast(app.activeProduct)
        if not design:
            ui.messageBox("No active Fusion 360 design found.\nPlease open a design first.")
            return

        root = design.rootComponent
        design_name = design.rootComponent.name
        safe_name = _sanitize(design_name)

        # Count top-level occurrences
        occ_count = root.occurrences.count
        if occ_count == 0:
            ui.messageBox(
                "This design has no sub-components.\n"
                "Use 'Export Component' instead for single-body designs."
            )
            return

        # --- 1. Choose output folder ---
        downloads_dir = os.path.join(os.path.expanduser("~"), "Downloads")
        folder_dlg = ui.createFolderDialog()
        folder_dlg.title = f"Choose export folder for assembly '{design_name}'"
        folder_dlg.initialDirectory = downloads_dir
        result = folder_dlg.showDialog()
        if result != adsk.core.DialogResults.DialogOK:
            return
        base_folder = folder_dlg.folder

        # Create subfolder
        export_dir = os.path.join(base_folder, safe_name)
        os.makedirs(export_dir, exist_ok=True)

        export_mgr = design.exportManager
        results = []
        manifest_components = []

        # --- 2. Export full assembly as STEP ---
        try:
            step_path = os.path.join(export_dir, f"{safe_name}.step")
            step_opts = export_mgr.createSTEPExportOptions(step_path, root)
            export_mgr.execute(step_opts)
            results.append(("STEP (assembly)", True, step_path))
        except Exception as e:
            results.append(("STEP (assembly)", False, str(e)))

        # --- 3. Export each top-level component as STL ---
        for i in range(occ_count):
            occ = root.occurrences.item(i)
            comp = occ.component
            comp_safe = _sanitize(comp.name)

            # Avoid duplicate filenames
            stl_filename = f"{comp_safe}.stl"
            stl_path = os.path.join(export_dir, stl_filename)
            counter = 2
            while os.path.exists(stl_path):
                stl_filename = f"{comp_safe}_{counter}.stl"
                stl_path = os.path.join(export_dir, stl_filename)
                counter += 1

            try:
                stl_opts = export_mgr.createSTLExportOptions(occ, stl_path)
                stl_opts.meshRefinement = adsk.fusion.MeshRefinementSettings.MeshRefinementMedium
                export_mgr.execute(stl_opts)

                # Extract color
                color = _get_appearance_color(comp)
                if color is None:
                    color = PALETTE[i % len(PALETTE)]

                manifest_components.append({
                    "name": comp.name,
                    "file": stl_filename,
                    "color": color,
                })

                results.append((f"STL: {comp.name}", True, stl_path))
            except Exception as e:
                results.append((f"STL: {comp.name}", False, str(e)))

        # --- 4. Write assembly manifest ---
        manifest = {
            "type": "assembly",
            "name": design_name,
            "components": manifest_components,
        }

        manifest_path = os.path.join(export_dir, "assembly.json")
        with open(manifest_path, "w") as f:
            json.dump(manifest, f, indent=2)
        results.append(("Manifest", True, manifest_path))

        # --- 5. Package into ZIP ---
        try:
            zip_name = f"{safe_name}.zip"
            zip_path = os.path.join(base_folder, zip_name)

            counter = 2
            while os.path.exists(zip_path):
                zip_name = f"{safe_name}_{counter}.zip"
                zip_path = os.path.join(base_folder, zip_name)
                counter += 1

            with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
                for root_dir, _dirs, files in os.walk(export_dir):
                    for fname in files:
                        full = os.path.join(root_dir, fname)
                        arcname = os.path.relpath(full, export_dir)
                        zf.write(full, arcname)

            results.append(("ZIP", True, zip_path))
        except Exception as e:
            results.append(("ZIP", False, str(e)))

        # --- 6. Summary dialog ---
        lines = [
            f"Assembly export for '{design_name}'",
            f"Components: {len(manifest_components)}",
            f"Folder: {export_dir}",
            "",
        ]
        for label, ok, detail in results:
            status = "✓" if ok else "✗"
            lines.append(f"  {status}  {label}")

        ui.messageBox("\n".join(lines), "Assembly Export Complete")

    except Exception:
        ui.messageBox("Unexpected error:\n" + traceback.format_exc())
