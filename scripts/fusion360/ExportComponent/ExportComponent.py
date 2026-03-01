# Fusion 360 Script: Export Component
# Exports STL, STEP, F3D, and flat pattern DXF for a selected component.
#
# Usage:
#   1. Open your design in Fusion 360
#   2. Run this script via Utilities → Scripts and Add-Ins
#   3. Select a component occurrence in the dialog
#   4. Choose an output folder
#   5. Files are exported into a subfolder named after the component

import adsk.core
import adsk.fusion
import os
import traceback

app = adsk.core.Application.get()
ui = app.userInterface


def run(context):
    try:
        design = adsk.fusion.Design.cast(app.activeProduct)
        if not design:
            ui.messageBox("No active Fusion 360 design found.\nPlease open a design first.")
            return

        # --- 1. Select a component occurrence ---
        sel_filter = "Occurrences"
        sel = ui.selectEntity("Select a component occurrence to export", sel_filter)
        if not sel:
            return

        occurrence = adsk.fusion.Occurrence.cast(sel.entity)
        if not occurrence:
            ui.messageBox("Selection is not a valid component occurrence.")
            return

        component = occurrence.component
        comp_name = component.name
        # Sanitise the name for use as a folder / file name
        safe_name = "".join(c if c.isalnum() or c in (" ", "-", "_") else "_" for c in comp_name).strip()

        # --- 2. Choose output folder (defaults to ~/Downloads) ---
        downloads_dir = os.path.join(os.path.expanduser("~"), "Downloads")
        folder_dlg = ui.createFolderDialog()
        folder_dlg.title = f"Choose export folder for '{comp_name}'"
        folder_dlg.initialDirectory = downloads_dir
        result = folder_dlg.showDialog()
        if result != adsk.core.DialogResults.DialogOK:
            return
        base_folder = folder_dlg.folder

        # Create a subfolder for this component
        export_dir = os.path.join(base_folder, safe_name)
        os.makedirs(export_dir, exist_ok=True)

        export_mgr = design.exportManager
        results = []           # (label, success, path_or_error)

        # --- 3. Export STL ---
        try:
            stl_path = os.path.join(export_dir, f"{safe_name}.stl")
            stl_opts = export_mgr.createSTLExportOptions(occurrence, stl_path)
            stl_opts.meshRefinement = adsk.fusion.MeshRefinementSettings.MeshRefinementMedium
            export_mgr.execute(stl_opts)
            results.append(("STL", True, stl_path))
        except Exception as e:
            results.append(("STL", False, str(e)))

        # --- 4. Export STEP ---
        try:
            step_path = os.path.join(export_dir, f"{safe_name}.step")
            step_opts = export_mgr.createSTEPExportOptions(step_path, component)
            export_mgr.execute(step_opts)
            results.append(("STEP", True, step_path))
        except Exception as e:
            results.append(("STEP", False, str(e)))

        # --- 5. Export Fusion Archive (.f3d) ---
        try:
            f3d_path = os.path.join(export_dir, f"{safe_name}.f3d")
            f3d_opts = export_mgr.createFusionArchiveExportOptions(f3d_path)
            export_mgr.execute(f3d_opts)
            results.append(("F3D", True, f3d_path))
        except Exception as e:
            results.append(("F3D", False, str(e)))

        # --- 6. Export flat pattern DXF (sheet metal only) ---
        flat_exported = False
        for body in component.bRepBodies:
            if not body.isSheetMetal:
                continue
            try:
                # Get or create the flat pattern
                flat_pattern = component.flatPattern
                if flat_pattern is None:
                    # Pick the largest planar face as the stationary face
                    stationary_face = _find_stationary_face(body)
                    if stationary_face is None:
                        results.append(("DXF flat", False, f"No planar face found on '{body.name}'"))
                        continue
                    flat_pattern = component.createFlatPattern(stationary_face)

                if flat_pattern is None:
                    results.append(("DXF flat", False, "Could not create flat pattern"))
                    continue

                dxf_path = os.path.join(export_dir, f"{safe_name}_flat.dxf")
                # Export the flat pattern sketch as DXF
                flat_pattern.saveDXF(dxf_path)
                results.append(("DXF flat", True, dxf_path))
                flat_exported = True
                break  # one flat pattern per component
            except Exception as e:
                results.append(("DXF flat", False, str(e)))

        if not flat_exported:
            # Check if there simply were no sheet metal bodies (not an error)
            has_sheet_metal = any(b.isSheetMetal for b in component.bRepBodies)
            if not has_sheet_metal:
                results.append(("DXF flat", False, "Skipped — no sheet metal bodies"))

        # --- 7. Summary dialog ---
        lines = [f"Export results for '{comp_name}':", f"Folder: {export_dir}", ""]
        for label, ok, detail in results:
            status = "✓" if ok else "✗"
            lines.append(f"  {status}  {label}: {detail}")

        ui.messageBox("\n".join(lines), "Export Complete")

    except Exception:
        ui.messageBox("Unexpected error:\n" + traceback.format_exc())


def _find_stationary_face(body: adsk.fusion.BRepBody):
    """Return the largest planar face on the body (used as the stationary face for flat patterns)."""
    best_face = None
    best_area = 0.0
    for face in body.faces:
        geo = face.geometry
        if isinstance(geo, adsk.core.Plane) and face.area > best_area:
            best_area = face.area
            best_face = face
    return best_face
