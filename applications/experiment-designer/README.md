# Experiment Designer

Protocol designer for EXP_010 — light-evoked electrophysiology of *P. eryngii* mycelium.

## What it does

Design, preview, and export JSON stimulation protocols for the ADC-24 dashboard. Supports dose-response and adaptation protocols with configurable intensity, duration, ISI, and block randomization. Provides interactive timeline preview and JSON export/import.

## Tech stack

- **Frontend:** Next.js 16 + Tailwind 4 + shadcn (dark theme — Skill Manager palette)
- **Backend:** FastAPI (Python) — protocol CRUD + validation
- **Fonts:** Inter, JetBrains Mono

## How to run

```bash
# Backend
cd server
pip install -r requirements.txt
python3 -m uvicorn main:app --port 8001 --reload

# Frontend
cd dashboard
npm install
npm run dev -- -p 3002
```

## Key config

| Setting | Value |
|---------|-------|
| Frontend port | 3002 |
| Backend port | 8001 |
| Protocol storage | `protocols/` |

## Architecture

```
experiment-designer/
├── dashboard/          # Next.js frontend
│   └── src/
│       ├── app/page.tsx        # Protocol builder UI
│       └── lib/protocol.ts     # Types, helpers, defaults
├── server/
│   └── main.py                 # FastAPI CRUD + validation
└── protocols/                  # Saved protocol JSONs
```
