# Experiment Designer — Catchup

## 2026-03-09 — Initial build

- Created experiment designer companion app for EXP_010
- Frontend: Next.js 16 + Tailwind 4 + shadcn, Skill Manager dark theme
- Features: protocol builder with block/stimulus editors, interactive timeline preview, JSON import/export, literature presets (dose-response + adaptation), JSON preview panel
- Backend: FastAPI with full CRUD (create/read/update/delete) + validation endpoint
- Protocol schema matches brainstorming Round 3 spec (pulse/train types, block randomization, ISI overrides, baselines)
