# Feature Audit — Fab Planner

> **Purpose:** Comprehensive list of all implemented features. Use this as a regression checklist after changes. Updated after each work session.
>
> **How to audit:** Right-click a part, open detail panels, try each toolbar button, etc. Features marked ⚠️ have known issues.

---

## 1. Parts Table (PartsTable.tsx)

- [ ] **Display all parts** in a scrollable table with columns: ID, Part Name, Status, Material, Due, Files, Client, Qty, Who, Fab
- [ ] **Column sorting** — click header to sort asc/desc, default sort by priority/importance
- [ ] **Column visibility** — configured in Settings → Columns, dynamic grid template
- [ ] **Drag-and-drop reorder** — drag handle (⠿) to reorder parts, persisted via API
- [ ] **Row selection** — click a row to select it and open detail panel
- [ ] **Multi-select** — Shift+click for range, Ctrl/Cmd+click for toggle
- [ ] **Status badges** — colored pill badges for Status and Fab Mechanism fields
- [ ] **File indicator** — 📄 icon shown when part has uploaded files
- [ ] **Inline editing** — double-click Part Name to rename inline
- [ ] **Search/filter** — search bar filters by name, ID, material, order ID, client

---

## 2. Detail Panel (DetailPanel.tsx)

- [ ] **File Preview section** — tabs for 🎨 Design and 📐 2D Drawing
- [ ] **3D STL Viewer** (ModelViewer.tsx) — Three.js orbit viewer for .stl files
  - [ ] Bounding box with dimensions (on by default)
  - [ ] Axis arrows (on by default)
  - [ ] Zoom, rotate, pan controls
- [ ] **2D Drawing viewer** — inline viewer for images (PNG/JPG) and PDFs
- [ ] **Part Details section** — editable fields with autocomplete suggestions:
  - Assigned Project, Status, Order ID, Material, Due Date, Client, Hospital, Notes, Qty, Who, Fab Mechanism
- [ ] **Revision history** — tabs: All / Design / 2D Drawing / Document / Custom stages
  - [ ] Per-stage version numbering (Design v1, v2… independent of 2D Drawing v1, v2…)
  - [ ] Delete single revision (✕ button with confirmation)
- [ ] **File upload** (FileUpload.tsx):
  - [ ] Drag-and-drop zone for file uploads
  - [ ] Built-in stages: Design, 2D Drawing, Documents
  - [ ] Custom upload stages (+ button to create per-part stages)
  - [ ] File type hints per stage
- [ ] **Download All** — button zips latest file per category
- [ ] **Reveal in Finder** — opens part's upload folder on disk

---

## 3. Context Menu (ContextMenu.tsx)

### Single part (right-click a row):
- [ ] **Rename** — inline rename of part name
- [ ] **Move to Project** — submenu with flat project tree, hover to expand
- [ ] **Download Files** — download all revisions for the part
- [ ] **Share to…** — submenu listing other workspaces, hover/click expands projects inline ⚠️
- [ ] **Delete Part** — with confirmation, removes DB record + files from disk

### Bulk actions (right-click with multi-select):
- [ ] **Move All to Project** — move selected parts to a project
- [ ] **Download All Files** — download all files for selected parts
- [ ] **Delete Selected** — delete all selected parts with confirmation

---

## 4. Project Tree (ProjectTree.tsx)

- [ ] **Hierarchical project tree** — infinite nesting via parentId
- [ ] **Create project** — input at bottom of tree
- [ ] **Create sub-project** — right-click → New sub-project
- [ ] **Rename project** — right-click → Rename
- [ ] **Delete project** — right-click → Delete (cascades, unlinks parts)
- [ ] **Star/pin projects** — starred projects appear as filter tabs in toolbar
- [ ] **Drag-drop reorder** — reorder projects within the tree

---

## 5. Workspace System

- [ ] **Workspace switcher** (WorkspaceSwitcher.tsx) — dropdown in toolbar to switch workspaces
- [ ] **Create workspace** — from switcher dropdown
- [ ] **Rename workspace** — from switcher
- [ ] **Delete workspace** — from switcher (cannot delete default)
- [ ] **Share parts between workspaces** — via context menu → Share to…
- [ ] **Unshare parts** — via context menu when viewing a shared part

---

## 6. Toolbar & Navigation

- [ ] **Filter tabs** — All Parts, Pending, starred project tabs
- [ ] **Search bar** — filters parts by text
- [ ] **Filters button** — toggles filter panel
- [ ] **Importance sort toggle** — ⬆️ Importance button
- [ ] **Timeline view** (TimelineView.tsx) — timeline visualization of parts
- [ ] **Export** — export data
- [ ] **Logs** (LogViewer.tsx) — view activity logs
- [ ] **+ New Part** — create a new part
- [ ] **Settings** (SettingsView.tsx) — app configuration
- [ ] **Download All** — bulk download button in toolbar
- [ ] **Theme toggle** (ThemeToggle.tsx) — light/dark theme switch

---

## 7. Settings (SettingsView.tsx)

- [ ] **Field Values tab** — manage Status, Materials, Clients, Hospitals, Who, Type, Fab Mechanism
- [ ] **Table Columns tab** — toggle column visibility
- [ ] **Badge Colors tab** — click a status/fab value to customize its badge color
- [ ] **UI Design Parameters tab** — adjust font size, row height, column widths

---

## 8. Keyboard Shortcuts (KeyboardShortcuts.tsx)

- [ ] **Undo/Redo** — Ctrl/Cmd+Z / Ctrl/Cmd+Shift+Z
- [ ] **Search focus** — Ctrl/Cmd+F
- [ ] **Delete selected** — Delete/Backspace key
- [ ] **Select all** — Ctrl/Cmd+A
- [ ] **Escape** — close panels/menus

---

## 9. API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/parts` | GET, POST | List all parts, create new part |
| `/api/parts/[id]` | GET, PATCH, DELETE | Get/update/delete single part |
| `/api/parts/[id]/upload` | POST | Upload file for part |
| `/api/parts/[id]/download-all` | GET | ZIP download of all files |
| `/api/parts/[id]/reveal` | POST | Open folder in Finder |
| `/api/parts/[id]/revisions/[revisionId]` | DELETE | Delete single revision |
| `/api/parts/[id]/share` | POST, DELETE | Share/unshare part to workspace |
| `/api/parts/batch` | PATCH | Batch update parts |
| `/api/parts/batch-upload` | POST | Upload files for multiple parts |
| `/api/parts/restore` | POST | Restore deleted parts |
| `/api/projects` | GET, POST, PATCH, DELETE | Project CRUD |
| `/api/workspaces` | GET, POST | List/create workspaces |
| `/api/workspaces/[id]` | PATCH, DELETE | Update/delete workspace |
| `/api/settings` | GET, PATCH | App settings |
| `/api/field-values` | GET, POST, DELETE | Manage field value options |
| `/api/suggest` | GET | Autocomplete suggestions |
| `/api/export` | GET | Export data |
| `/api/download` | GET | Download files |
| `/api/logs` | GET | Activity logs |
| `/api/status-history` | GET | Part status change history |
| `/api/sync` | POST | Airtable sync (legacy) |
| `/api/files/[partId]/[filename]` | GET | Serve uploaded files |

---

## 10. Known Issues / Watch List

- ⚠️ **Share to… submenu** — third-level project tree was unreliable with nested floating menus; redesigned to inline expansion (Feb 2026)
- ⚠️ **Drag-and-drop file upload** — may be fragile; needs testing after changes
- Badge colors stored in localStorage (per-browser), not DB
- Sort preference is transient (resets on refresh)
