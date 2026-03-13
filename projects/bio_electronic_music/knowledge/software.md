# Software & Deployment

> Last updated: 2026-03-12

## Dashboards & Apps

### LED-DRV8 Web Dashboard

Built-in dashboard served from LittleFS on the ESP32-S3.

| Field | Value |
|-------|-------|
| **URL** | `http://leddriver.local` or `http://172.16.1.126` |
| **Served from** | LittleFS (ESP32-S3 flash) |
| **Features** | Channel sliders, pattern selection, master brightness, All ON/OFF |
| **Update** | `pio run -e ota -t uploadfs` |

### Experiment Designer (EXP_010)

Standalone web app for designing light stimulation protocols.

| Field | Value |
|-------|-------|
| **URL** | `http://172.16.1.80:3006` |
| **Features** | Protocol builder, block/stimulus editors, timeline preview, JSON import/export |
| **Presets** | Dose-response (15 blocks, 105 stimuli), Adaptation (50 reps) |
| **Source** | `experiments/EXP_010/` |

### ADC-24 Dashboard (EXP_001 / EXP_010)

Python dashboard for PicoScope ADC-24 data acquisition.

| Field | Value |
|-------|-------|
| **Run** | `python3 adc24_dashboard.py` |
| **Features** | Live voltage plot, CSV logging, stimulus scheduling |
| **Extensions (EXP_010)** | `led_client.py` (async LED control), `stimulus_scheduler.py` (protocol execution) |
| **CSV columns** | `timestamp_s, channel, raw_adc, voltage_uv, stim_ch, stim_pwm, stim_event` |
| **Protocol API** | `/api/protocol/load`, `/start`, `/stop`, `/status` |
| **Source** | `experiments/EXP_001/app/dashboard/` + `experiments/EXP_010/` |

## Analysis Tools

| Tool | Experiment | Description |
|------|-----------|-------------|
| `generate_trace.py` | EXP_001 | Generate voltage trace plots from CSV recordings |
| `analyze_session.ipynb` | EXP_001 | Jupyter notebook for session analysis |
| `analysis/` | EXP_010, EXP_013 | Spike detection, dose-response statistics, light-evoked analysis |

### Sample Output

![Mycelium voltage trace — extracellular recording showing spontaneous action-potential-like spiking from P. eryngii](images/mycelium_voltage_trace.png)

## Infrastructure Docs

| Document | Location | Description |
|----------|----------|-------------|
| Faraday Cage Guide | `experiments/EXP_010/FARADAY_CAGE_GUIDE.md` | Construction and grounding for noise-free recording |
| Literature Review | `experiments/EXP_006/REPORT.md` | Characterization of fungal spiking data |
| Citation Network | `experiments/EXP_006/citation_network_report.md` | Semantic Scholar exploration |
| Paper Summaries | `experiments/EXP_006/agent_papers_txt/INDEX.md` | 8 key papers summarized |
