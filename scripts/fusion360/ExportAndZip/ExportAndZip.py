# Fusion Add-In: Adds a toolbar button that exports the current design
# as .f3d + .fbx, zips them, and saves to ~/Downloads.
#
# Install:
#   1. In Fusion → Utilities → Add-Ins → green "+" next to "My Add-Ins"
#   2. Select this folder
#   3. Check "Run on Startup" if you want it always available

import adsk.core
import adsk.fusion
import traceback
import os
import zipfile
import tempfile
from datetime import datetime

# Global references (prevent garbage collection)
_app = None
_ui = None
_handlers = []

CMD_ID = "ExportAndZipCmd"
CMD_NAME = "Export & Zip"
CMD_DESCRIPTION = "Export current design as .f3d + .fbx into a zip in Downloads"
TOOLBAR_PANEL_ID = "SolidScriptsAddinsPanel"  # "Scripts & Add-Ins" panel in Utilities


class ExportCommandCreatedHandler(adsk.core.CommandCreatedEventHandler):
    """Called when the user clicks the toolbar button."""

    def __init__(self):
        super().__init__()

    def notify(self, args):
        try:
            cmd = args.command
            on_execute = ExportCommandExecuteHandler()
            cmd.execute.add(on_execute)
            _handlers.append(on_execute)
        except Exception:
            if _ui:
                _ui.messageBox(traceback.format_exc())


class ExportCommandExecuteHandler(adsk.core.CommandEventHandler):
    """Performs the actual export + zip."""

    def __init__(self):
        super().__init__()

    def notify(self, args):
        try:
            do_export()
        except Exception:
            if _ui:
                _ui.messageBox(f"Export failed:\n{traceback.format_exc()}", "Export & Zip – Error")


def do_export():
    """Core export logic: .f3d + .fbx → zip to ~/Downloads."""
    doc = _app.activeDocument
    if not doc:
        _ui.messageBox("No active document found.\nPlease open a design first.", CMD_NAME)
        return

    design = adsk.fusion.Design.cast(_app.activeProduct)
    if not design:
        _ui.messageBox("The active document is not a Fusion design.", CMD_NAME)
        return

    # --- Prepare names and paths ---
    doc_name = doc.name
    safe_name = "".join(c if c.isalnum() or c in (" ", "-", "_") else "_" for c in doc_name).strip()

    temp_dir = tempfile.mkdtemp(prefix="fusion_export_")
    f3d_path = os.path.join(temp_dir, f"{safe_name}.f3d")
    fbx_path = os.path.join(temp_dir, f"{safe_name}.fbx")

    export_mgr = design.exportManager

    # --- Export .f3d (Fusion Archive) ---
    f3d_opts = export_mgr.createFusionArchiveExportOptions(f3d_path)
    ok_f3d = export_mgr.execute(f3d_opts)
    if not ok_f3d:
        _ui.messageBox("Failed to export .f3d file.", CMD_NAME)
        return

    # --- Export .fbx ---
    root = design.rootComponent
    try:
        fbx_opts = export_mgr.createFBXExportOptions(fbx_path, root)
        ok_fbx = export_mgr.execute(fbx_opts)
        if not ok_fbx:
            _ui.messageBox("Failed to export .fbx file.", CMD_NAME)
            return
    except AttributeError:
        _ui.messageBox(
            "FBX export is not available in your Fusion API version.\n"
            "Please check that your Fusion installation supports FBX scripting.",
            f"{CMD_NAME} – Warning",
        )
        return

    # --- Create zip in Downloads ---
    downloads = os.path.expanduser("~/Downloads")
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    zip_name = f"{safe_name}_{timestamp}.zip"
    zip_path = os.path.join(downloads, zip_name)

    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.write(f3d_path, f"{safe_name}.f3d")
        zf.write(fbx_path, f"{safe_name}.fbx")

    # --- Clean up temp files ---
    try:
        os.remove(f3d_path)
        os.remove(fbx_path)
        os.rmdir(temp_dir)
    except OSError:
        pass

    _ui.messageBox(
        f"Export complete! ✅\n\n"
        f"Saved to:\n{zip_path}\n\n"
        f"Contents:\n  • {safe_name}.f3d\n  • {safe_name}.fbx",
        CMD_NAME,
    )


# ── Add-In lifecycle ────────────────────────────────────────────────


def run(context):
    """Called when the add-in is started."""
    global _app, _ui
    try:
        _app = adsk.core.Application.get()
        _ui = _app.userInterface

        # Create the command definition
        cmd_defs = _ui.commandDefinitions
        existing = cmd_defs.itemById(CMD_ID)
        if existing:
            existing.deleteMe()

        cmd_def = cmd_defs.addButtonDefinition(CMD_ID, CMD_NAME, CMD_DESCRIPTION)

        # Wire up the created-handler
        on_created = ExportCommandCreatedHandler()
        cmd_def.commandCreated.add(on_created)
        _handlers.append(on_created)

        # Add the button to the Utilities → Add-Ins panel
        panel = _ui.allToolbarPanels.itemById(TOOLBAR_PANEL_ID)
        if panel:
            existing_ctrl = panel.controls.itemById(CMD_ID)
            if not existing_ctrl:
                panel.controls.addCommand(cmd_def)

    except Exception:
        if _ui:
            _ui.messageBox(f"Add-in start failed:\n{traceback.format_exc()}")


def stop(context):
    """Called when the add-in is stopped."""
    try:
        # Remove the button from the panel
        panel = _ui.allToolbarPanels.itemById(TOOLBAR_PANEL_ID)
        if panel:
            ctrl = panel.controls.itemById(CMD_ID)
            if ctrl:
                ctrl.deleteMe()

        # Remove the command definition
        cmd_def = _ui.commandDefinitions.itemById(CMD_ID)
        if cmd_def:
            cmd_def.deleteMe()

        _handlers.clear()
    except Exception:
        if _ui:
            _ui.messageBox(f"Add-in stop failed:\n{traceback.format_exc()}")
