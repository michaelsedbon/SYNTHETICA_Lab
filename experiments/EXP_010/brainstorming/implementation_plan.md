# EXP_010 Implementation Plan — Experiment Designer & Dashboard Integration

## Overview

Build the software toolchain for light-evoked electrophysiology experiments. Two apps, two phases:
- **Phase 1:** Standalone Experiment Designer (new git submodule) — protocol builder, timeline preview, JSON export
- **Phase 2:** ADC-24 Dashboard extensions — protocol loader, stimulus scheduler, annotated CSV

---

## User Review Required

> [!IMPORTANT]
> **Species caveat:** The "400 direct target genes" and VVD photoadaptation data (Yu & Fischer 2019) are from *N. crassa*, not *P. eryngii*. WC-1 homologues are conserved across Basidiomycetes but the exact regulatory targets and kinetics may differ. Mishra et al. 2024 showed blue light response in P. eryngii (83 ± 11 µV), confirming functional blue-light sensing — but the molecular mechanism is inferred, not proven in this species.

> [!IMPORTANT]
> **Companion app as submodule** — will create a new repo `michaelsedbon/experiment-designer` on GitHub. Confirm this is the desired repo name.

---

## Phase 1: Experiment Designer Companion App

### 1.1 Project scaffold

#### [NEW] `applications/experiment-designer/`

New git submodule. Tech stack matching ADC-24 dashboard:
- **Frontend:** Next.js 16 + Tailwind 4 + shadcn
- **Backend:** FastAPI (Python) for protocol validation + storage
- **Port:** 3002 (frontend), 8001 (API)

```
experiment-designer/
├── app/                     # Next.js app
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx          # Main protocol builder page
│   │   │   └── layout.tsx
│   │   ├── components/
│   │   │   ├── protocol-builder.tsx  # Block/stimulus editor
│   │   │   ├── timeline-preview.tsx  # Visual timeline
│   │   │   ├── parameter-form.tsx    # Stimulus parameter inputs
│   │   │   ├── json-viewer.tsx       # JSON preview/editor
│   │   │   └── import-dialog.tsx     # Load previous protocol
│   │   └── lib/
│   │       ├── protocol-schema.ts    # TypeScript types + validation
│   │       └── timeline-calc.ts      # Duration/schedule calculations
│   ├── package.json
│   └── tsconfig.json
├── server/
│   ├── main.py               # FastAPI: protocol CRUD + validation
│   ├── protocol_schema.py     # Pydantic model matching JSON schema
│   └── requirements.txt
├── protocols/                 # Saved protocol JSONs
├── README.md
└── summary.md
```

### 1.2 Core features

| Feature | Description |
|---------|-------------|
| **Protocol builder** | Add/remove/reorder blocks, configure stimulus params (PWM, duration, ISI, repeats) |
| **Timeline preview** | Visual horizontal timeline showing all stimuli with color-coded intensity, total duration |
| **Literature defaults** | Pre-filled values from Mishra et al. 2024 (ISI=20s, repeats=7, intensity range) |
| **JSON export** | Download protocol as JSON matching the schema from Round 3 |
| **JSON import** | Load + visualise any previous protocol JSON |
| **API endpoints** | Full CRUD: `POST /api/protocol`, `GET /api/protocols`, `GET /api/protocol/{id}`, `PUT`, `DELETE` |
| **Validation** | Real-time validation against schema (PWM 0–4095, duration 0.1–30s, channel 0–7) |
| **Total time estimate** | Auto-calculate total protocol duration including baselines and ISI |

### 1.3 Protocol JSON schema

Use the schema from [brainstorm round 3](file:///Users/michaelsedbon/.gemini/antigravity/brain/6acb5df8-ca49-4619-b65e-bf949e9606f7/brainstorm_round_3.md). Key types:
- `pulse` — single LED on/off event
- `train` — burst of pulses (for future use)
- Block-level and global-level randomization with seed

---

## Phase 2: ADC-24 Dashboard Extensions

### 2.1 Backend changes

#### [MODIFY] [main.py](file:///Users/michaelsedbon/Documents/SYNTHETIC_PERSONAL_LAB/applications/adc24-dashboard/server/main.py)

New endpoints and stimulus scheduler:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/protocol/load` | POST | Upload protocol JSON, validate, store in state |
| `/api/protocol/status` | GET | Current protocol execution state |
| `/api/protocol/start` | POST | Start protocol execution (requires active recording) |
| `/api/protocol/stop` | POST | Abort protocol mid-run |

New internal modules:

#### [NEW] `server/stimulus_scheduler.py`

Background thread that:
1. Reads the loaded protocol JSON
2. Waits for each scheduled stimulus time
3. Sends HTTP `POST` to LED-DRV8 REST API
4. Logs stimulus event with timestamp to the CSV

#### [NEW] `server/led_client.py`

HTTP client for LED-DRV8:
```python
async def set_channel(channel: int, pwm: int, url: str = "http://leddriver.local")
async def stop_all(url: str = "http://leddriver.local")
```

### 2.2 CSV format change

#### [MODIFY] AppState.add_sample in `server/main.py`

Current: `timestamp, channel, raw_adc, voltage_uv`

New: `timestamp, channel, raw_adc, voltage_uv, stim_ch, stim_pwm, stim_event`

- `stim_ch`: LED channel (0–7), empty when no stimulus
- `stim_pwm`: PWM value (0–4095), empty when no stimulus
- `stim_event`: `onset` | `offset` | empty

### 2.3 Frontend changes

#### [MODIFY] [controls.tsx](file:///Users/michaelsedbon/Documents/SYNTHETIC_PERSONAL_LAB/applications/adc24-dashboard/dashboard/src/components/controls.tsx)

- Add "Load Protocol" button (file input for JSON)
- Add "Start Protocol" / "Stop Protocol" buttons (disabled unless recording active)
- Show protocol status indicator

#### [NEW] `dashboard/src/components/protocol-timeline.tsx`

Timeline component showing:
- Full protocol schedule as a horizontal bar
- Current position marker (synced to recording time)
- Color-coded stimulus blocks (intensity → color brightness)
- Stimulus onset markers on the live voltage chart

#### [MODIFY] [live-chart.tsx](file:///Users/michaelsedbon/Documents/SYNTHETIC_PERSONAL_LAB/applications/adc24-dashboard/dashboard/src/components/live-chart.tsx)

- Overlay vertical markers at stimulus onset/offset times
- Color markers by intensity

---

## Verification Plan

### Automated Tests

**Protocol schema validation (Phase 1 backend):**
```bash
cd applications/experiment-designer/server
python3 -m pytest test_protocol_schema.py -v
```
Tests: valid protocol passes, invalid PWM/duration/channel rejected, empty blocks rejected, randomization seed reproducibility.

**LED client mock tests (Phase 2 backend):**
```bash
cd applications/adc24-dashboard/server
python3 -m pytest test_led_client.py -v
```
Tests: correct HTTP payloads sent to LED-DRV8 mock, error handling for unreachable device.

### Browser Testing (Phase 1 — companion app)

1. Open `http://localhost:3002`
2. Add 3 blocks with different PWM/duration combinations
3. Verify timeline preview updates in real time
4. Export JSON → verify it validates against schema
5. Import the exported JSON → verify blocks reload correctly
6. Delete a block → verify timeline updates

### Browser Testing (Phase 2 — dashboard)

1. Open `http://localhost:3001`
2. Start demo mode recording
3. Load a protocol JSON via the new "Load Protocol" button
4. Verify timeline appears showing the protocol schedule
5. Click "Start Protocol" → verify stimulus events appear on the live chart as vertical markers
6. Stop recording → download CSV → verify `stim_ch`, `stim_pwm`, `stim_event` columns are populated

### Manual Verification (requires hardware)

1. Connect ADC-24 + LED-DRV8 to the same network
2. Start recording on dashboard
3. Load and start a simple protocol (3 stimuli, PWM=1024, 2s, ISI=20s)
4. Visually confirm LEDs activate/deactivate at correct times
5. Download CSV and verify stimulus annotations match observed LED behaviour
6. Verify no additional noise in voltage trace during LED activation

---

## Implementation Order

1. **Phase 1a:** Scaffold companion app (Next.js + FastAPI), protocol schema, CRUD API
2. **Phase 1b:** Protocol builder UI, timeline preview, JSON export/import
3. **Phase 2a:** LED client + stimulus scheduler in ADC-24 backend
4. **Phase 2b:** Dashboard protocol UI (loader, timeline, markers)
5. **Phase 2c:** CSV format extension
6. **Integration test:** End-to-end with demo mode

Estimated effort: ~3–4 sessions

---

## Decisions Log

| Decision | Rationale |
|----------|-----------|
| Companion app as standalone submodule | User preference — keeps protocol design decoupled from recording |
| Same tech stack (Next.js + FastAPI) | Consistency with ADC-24 dashboard, shared knowledge |
| Protocol JSON schema v1.0 | Designed for extensibility (train types, multi-channel) |
| Stimulus in CSV not separate file | User requirement — single data stream for analysis |
| Start low PWM (100) | LEDs at ~3 mm distance — much closer than Mishra's 12 cm |
