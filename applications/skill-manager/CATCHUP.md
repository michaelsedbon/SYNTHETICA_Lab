# Skill Manager — Catchup

## 2026-03-08 — Initial build

- Created FastAPI backend with 5 endpoints (workspaces, skills, installed, install, uninstall)
- Built vanilla HTML/JS/CSS frontend with dark theme
- Auto-discovers workspaces by scanning for `.agent/` directories
- Auto-discovers skills from `~/antigravity-skills/` (built-in, custom, third-party)
- Toggle switches install/uninstall skills as symlinks
- Search and filter by category
- Registered in app launcher
