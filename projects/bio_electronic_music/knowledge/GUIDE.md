# Knowledge Base Guide — Bio Electronic Music

> This guide defines the structure, templates, and rules for the Bio Electronic Music project knowledge base.

## Directory Structure

```
projects/bio_electronic_music/knowledge/
├── GUIDE.md              ← This file
├── structure.md          ← System architecture + topology
├── hardware.md           ← Device inventory + wiring
├── software.md           ← Dashboards, analysis tools
├── firmware/
│   └── led_drv8.md       ← LED-DRV8 ESP32-S3 firmware
├── api/
│   └── led_drv8.md       ← LED-DRV8 HTTP REST API
└── images/               ← Embedded screenshots
```

## When to Update

Update the knowledge base when you:

- Add, remove, or modify a physical device → `hardware.md`
- Write or change firmware → `firmware/<device>.md`
- Add or change API endpoints → `api/<service>.md`
- Change network config, IPs, or deployment → `structure.md` or `software.md`
- Add a new knowledge base file → update `nav.yaml`

## Templates

### Firmware Doc Template

```markdown
# DEVICE_ID — Description

| Field | Value |
|-------|-------|
| **Device ID** | `DEVICE_ID` |
| **MCU** | ... |
| **Function** | ... |
| **Source** | `experiments/EXP_XXX/firmware/` |
| **GitHub** | [link](...) |

## Pin Map
## Communication Protocol
## Build & Flash
## Changelog
```

### API Doc Template

```markdown
# Service Name API

| Field | Value |
|-------|-------|
| **Base URL** | `http://...` |
| **Framework** | ... |
| **Source** | `experiments/EXP_XXX/firmware/` |

## Endpoints
## Code Examples
```
