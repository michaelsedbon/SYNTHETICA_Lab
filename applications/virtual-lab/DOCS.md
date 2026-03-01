# Virtual Lab — 3D Stock Manager

**Slug:** `virtual-lab`  
**Status:** ✅ Working  
**Port:** 8080 (static HTTP server)

---

## Purpose

An interactive **3D model of the laboratory** rendered in the browser. Navigate a Three.js scene of the physical lab space — click on equipment to view details, search for items, manage stock levels, and assign storage locations. Reads lab inventory data from **Airtable** and overlays it onto a 3D `.glb` model.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Rendering | Three.js (via CDN) · GLTFLoader |
| Data Source | Airtable API (REST, PAT authentication) |
| Hosting | Python `http.server` (static files) |
| UI | Vanilla HTML/CSS/JS (single-file app) |
| PWA | Manifest + icon for installable web app |

---

## How to Run

```bash
cd applications/virtual-lab
python3 -m http.server 8080 --bind 0.0.0.0
```

Open **http://localhost:8080**

---

## No Backend API

This is a **purely client-side** application. It connects directly to the Airtable API from the browser using a Personal Access Token stored in `config.json`.

### Airtable Connection

| Config Key | Purpose |
|------------|---------|
| `airtable_pat` | Personal Access Token for Airtable API |
| `airtable_base_id` | Airtable base identifier |
| `known_table_id` | Default table to load |

---

## Files

| File | Description |
|------|-------------|
| `index.html` | Entire application (~2360 lines) — CSS, HTML, and JS in one file |
| `virtual_lab.glb` | 3D model of the lab (GLB format, ~1.3 MB) |
| `labels.json` | Pre-configured label/annotation data for 3D objects |
| `config.json` | Airtable API credentials and base configuration |
| `manifest.json` | PWA manifest for installable web app |
| `icon.png` | App icon (37 KB) |

---

## Architecture

```
virtual-lab/
  index.html         — Full single-file application
                       ├── CSS: VS Code dark theme (~800 lines)
                       ├── HTML: search, info panel, browse panel, context menu,
                       │         storage mode, burger menu, tooltip
                       └── JS:  Three.js scene, Airtable sync, interaction

  virtual_lab.glb    — 3D lab model (loaded by GLTFLoader)
  labels.json        — Object annotations and label positions
  config.json        — Airtable credentials
```

---

## UI Components

| Component | Description |
|-----------|-------------|
| **3D Viewport** | Full-screen Three.js canvas with orbit controls |
| **Search Bar** | Top-center search with autocomplete suggestions |
| **Info Panel** | Bottom-left panel showing selected object details |
| **Browse Panel** | Column-based browser for all lab items by table |
| **Context Menu** | Right-click on objects to view/edit fields |
| **Storage Mode** | Full-screen list view for stock management (quantities, storage location) |
| **Burger Menu** | Top-right menu for switching between 3D view and storage mode |
| **Tooltip** | Hover tooltip showing object name |

---

## Key Features

- **Interactive 3D lab model** — orbit, zoom, click on equipment
- **Airtable integration** — reads real inventory data from Airtable tables
- **Search with autocomplete** — find items across all Airtable tables
- **Object selection** — click 3D objects to view details in info panel
- **Storage management mode** — full-screen table for editing stock quantities
- **Storage location assignment** — assign items to storage positions on the 3D model
- **Multi-table browsing** — column-based item browser grouped by Airtable table
- **Context menu** — right-click objects to view all Airtable fields
- **PWA installable** — manifest and icon for mobile/desktop installation
- **Network QR code** — shows QR code for LAN access from other devices
- **VS Code dark theme** — consistent styling with other lab applications
