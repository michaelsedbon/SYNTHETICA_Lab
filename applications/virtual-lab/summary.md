# Virtual Lab — 3D Stock Manager

**Created:** 2024  
**Stack:** Three.js · Airtable API · Vanilla HTML/CSS/JS  
**Port:** 8080 (static HTTP server)  
**Data Source:** Airtable  

---

## Overview

An interactive **3D model of the laboratory** rendered in the browser using Three.js. Navigate the physical lab space — click on equipment to view details, search for items, manage stock levels, and assign storage locations. Reads real lab inventory data from **Airtable** tables and overlays it onto a `.glb` 3D model.

The entire application is a single `index.html` file (~2360 lines) served by Python's built-in HTTP server. It is also **PWA installable** for mobile and desktop.

---

## Architecture

| File | Description |
|------|-------------|
| `index.html` | Full single-file app (CSS + HTML + JS, ~2360 lines) |
| `virtual_lab.glb` | 3D lab model (~1.3 MB, loaded by GLTFLoader) |
| `labels.json` | Object annotations and label positions |
| `config.json` | Airtable API credentials (PAT, base ID, table ID) |
| `manifest.json` | PWA manifest for installable web app |
| `icon.png` | App icon |

---

## UI Components

| Component | Description |
|-----------|-------------|
| **3D Viewport** | Full-screen Three.js canvas with orbit controls |
| **Search Bar** | Top-center search with autocomplete suggestions |
| **Info Panel** | Bottom-left — selected object details |
| **Browse Panel** | Column-based browser for all items by Airtable table |
| **Context Menu** | Right-click objects to view/edit all fields |
| **Storage Mode** | Full-screen list view for editing stock quantities |
| **Burger Menu** | Switch between 3D view and storage mode |
| **Tooltip** | Hover tooltip showing object name |

---

## Data Integration

No backend API — the app connects **directly to the Airtable API** from the browser using a Personal Access Token stored in `config.json`.

| Config Key | Purpose |
|------------|---------|
| `airtable_pat` | Personal Access Token |
| `airtable_base_id` | Airtable base identifier |
| `known_table_id` | Default table to load |

---

## Key Features

- Interactive 3D lab model — orbit, zoom, click on equipment
- Airtable integration — reads real inventory data
- Search with autocomplete across all tables
- Object selection with detailed info panel
- Storage management mode — edit quantities and locations
- Multi-table browsing grouped by Airtable table
- Context menu — right-click to view all fields
- PWA installable with manifest and icon
- Network QR code for LAN access
- VS Code dark theme consistent with other lab apps

See [DOCS.md](DOCS.md) for complete details.
