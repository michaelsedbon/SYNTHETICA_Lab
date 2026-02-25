# Manifesto — Working Conventions

> How Michael and the AI assistant collaborate on this project.
> **Updated:** 2026-02-15

---

## Project Context

- **Company:** Prosthesis design & manufacturing
- **App purpose:** Fabrication planning dashboard — track orders, upload CAD files, manage production priority
- **Users:** Michael (manager/priority), Engineers (design upload), CNC operators (program upload)

## Tech Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Framework | Next.js 16 (App Router) | Full-stack React, API routes, SSR |
| Database | SQLite + Prisma 7 | Zero-config, portable, good for <10 users |
| 3D Viewer | Three.js + STLLoader + occt-import-js | STL native, STEP via WASM |
| Drag & Drop | dnd-kit | Modern React DnD, accessible |
| Styling | Vanilla CSS | Full control, no dependency bloat |
| Theme | Dark (VS Code-inspired) | User preference |
| Driver adapter | @prisma/adapter-better-sqlite3 | Required by Prisma 7 for SQLite |

## Working Rules

1. **All secrets in `.env`** — Never hardcode API keys, DB paths, or tokens. Use `lib/config.ts` to access them typed.
2. **Update MEMORY.md** after every session — Log what was done, files changed, decisions made.
3. **Update MANIFESTO.md** when conventions change — New tools, patterns, or rules go here.
4. **Update README.md** when features change — Keep the feature table and structure tree current.
5. **File uploads go to `./uploads/`** — Organized as `uploads/{partId}/{filename}`.
6. **SQLite is the source of truth** — Parts are created and managed locally.
7. **Prisma 7 quirks:**
   - Client generated at `app/generated/prisma/client.ts` (not index)
   - Requires `PrismaBetterSqlite3` adapter (note casing: lowercase `q`)
   - `datasource` block in schema has no `url` — it's in `prisma.config.ts`
8. **Components are in `app/components/`** — keep them focused and reusable.

## Git Conventions

- `.env` is gitignored — `.env.example` is committed as a template
- `uploads/` is gitignored
- `dev.db` is gitignored
- `app/generated/` is gitignored (regenerated via `npx prisma generate`)

## Known Gotchas

- **Node.js:** Installed via Homebrew (`brew install node`), v25.6.1
- **Prisma 7 PrismaClient:** Must use driver adapter, `new PrismaClient()` with no args fails at runtime
- **Next.js Turbopack:** `@/` alias maps to project root via `tsconfig.json` paths
