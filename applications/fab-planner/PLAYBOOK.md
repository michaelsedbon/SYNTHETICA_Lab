# Michael's Project Playbook
> Everything learned from building Fab Planner — reusable patterns for future apps.
> Last updated: 2026-02-15

---

## 1. Project Scaffolding

### Quick start recipe
```bash
npx -y create-next-app@latest ./ --ts --app --eslint --no-tailwind --no-src-dir --import-alias "@/*"
npm install prisma @prisma/client @prisma/adapter-better-sqlite3 better-sqlite3
npm install -D @types/better-sqlite3
npx prisma init --datasource-provider sqlite
```

### Essential files to create immediately
| File | Purpose |
|------|---------|
| `.env.example` | Template for secrets (commit this) |
| `.env` | Actual secrets (gitignored) |
| `MANIFESTO.md` | Tech decisions + working conventions |
| `MEMORY.md` | Session changelog |
| `README.md` | Setup + features + structure |
| `CUSTOMIZATION.md` | How to extend/customize the app |
| `.agent/workflows/catch-up.md` | AI onboarding workflow |

### .gitignore essentials
```gitignore
.env
.env.local
.env.*.local
/node_modules
/.next/
/app/generated/prisma
*.tsbuildinfo
next-env.d.ts
```

> **⚠️ NEVER commit credentials.** Use `process.env.VAR_NAME` everywhere. If you accidentally commit a secret, scrub it from history with `git filter-branch` and rotate the credential immediately.

---

## 2. Prisma 7 + SQLite Setup

### The quirks that will waste hours
1. **Driver adapter is mandatory** — `new PrismaClient()` with no args fails at runtime
2. **Client is generated** at `app/generated/prisma/client.ts` (not `index`)
3. **`datasource` block** in schema has no `url` — it lives in `prisma.config.ts`

### prisma.config.ts
```typescript
import path from "node:path";
import type { PrismaConfig } from "prisma";

export default {
  earlyAccess: true,
  schema: path.join("prisma", "schema.prisma"),
} satisfies PrismaConfig;
```

### lib/prisma.ts — singleton pattern
```typescript
import { PrismaClient } from "@/app/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import Database from "better-sqlite3";

const db = new Database(process.env.DATABASE_URL?.replace("file:", "") || "./dev.db");
const adapter = new PrismaBetterSqlite3(db);

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };
export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```

### Schema patterns
```prisma
// Auto-incrementing IDs via counter table
model Counter {
  id    String @id
  value Int    @default(0)
}

// Self-referencing hierarchy (projects, categories, etc.)
model Project {
  id        String    @id @default(uuid())
  name      String
  parentId  String?   @map("parent_id")
  parent    Project?  @relation("ProjectHierarchy", fields: [parentId], references: [id])
  children  Project[] @relation("ProjectHierarchy")
}

// JSON settings blob
model AppSettings {
  id    String @id @default("default")
  data  String @default("{}")  // JSON stringified
}

// Managed field values (dynamic dropdowns)
model FieldValue {
  id        String @id @default(uuid())
  field     String  // e.g. "status", "material"
  value     String
  sortOrder Int    @default(0)
  @@unique([field, value])
}
```

---

## 3. Architecture Patterns

### Two-panel layout
```
┌──────────────────┬──────────────────┐
│                  │                  │
│   Parts Table    │  Detail Panel    │
│   (left panel)   │  (right panel)   │
│                  │                  │
│   - sortable     │  - file preview  │
│   - filterable   │  - 3D viewer     │
│   - draggable    │  - edit fields   │
│                  │                  │
└──────────────────┴──────────────────┘
```

### State management (page.tsx)
- Keep all core state in the main `page.tsx`
- Pass data + callbacks down to components as props
- Use `useMemo` for filtered/sorted lists
- Use `useCallback` for handlers passed to children
- No state management library needed for small apps

### API routes structure
```
app/api/
├── items/
│   ├── route.ts           # GET list, POST create, PATCH reorder
│   └── [id]/
│       ├── route.ts       # GET one, PATCH update, DELETE
│       └── upload/route.ts # POST file upload
├── field-values/route.ts   # Managed dropdown values
├── settings/route.ts       # UI settings persistence
├── export/route.ts         # CSV/data export
├── logs/route.ts           # Activity logs
└── files/[...path]/route.ts # Serve uploaded files
```

### API handler pattern
```typescript
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const items = await prisma.item.findMany({ orderBy: { priorityOrder: "asc" } });
    return NextResponse.json(items);
  } catch (error) {
    console.error("Failed:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
```

---

## 4. Component Patterns

### Component checklist for a data management app
| Component | Responsibility |
|-----------|---------------|
| **DataTable** | Sortable, filterable table with column visibility |
| **DetailPanel** | Selected item details, file preview, edit fields |
| **FileUpload** | Drag-drop upload with revision tracking |
| **ContextMenu** | Right-click actions (rename, delete, move) |
| **SettingsView** | App configuration overlay |
| **Timeline/Gantt** | Time-based visualization |
| **LogViewer** | Activity log display |
| **ProjectTree** | Hierarchical sidebar navigation |

### Drag-and-drop (dnd-kit)
```bash
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```
- Use `PointerSensor` with `activationConstraint: { distance: 5 }` to avoid triggering on clicks
- Persist reorder via PATCH to `/api/items` with new priority values

### Context menu pattern
```typescript
const [contextMenu, setContextMenu] = useState<{ x: number; y: number; item: T } | null>(null);

// On row
onContextMenu={(e) => {
  e.preventDefault();
  setContextMenu({ x: e.clientX, y: e.clientY, item });
}}

// Render
{contextMenu && <ContextMenu x={contextMenu.x} y={contextMenu.y} ... onClose={() => setContextMenu(null)} />}
```

---

## 5. 3D Viewer (Three.js)

### Setup
```bash
npm install three occt-import-js
npm install -D @types/three
```

### Key patterns
- **STL files:** `STLLoader` from `three/examples/jsm/loaders/STLLoader`
- **STEP files:** `occt-import-js` (WASM-based) — needs `public/wasm/` directory with WASM binary
- **Camera:** `OrbitControls` from `three/examples/jsm/controls/OrbitControls`
- **Lighting:** Hemisphere light (ambient) + 2 directional lights for metal/plastic look
- **Material:** `MeshPhysicalMaterial` with `metalness`, `roughness`, `clearcoat` for realistic prosthetics

### Oriented Bounding Box (PCA)
For accurate dimensions on rotated objects, use PCA instead of `computeBoundingBox()`:
1. Extract vertex positions
2. Compute covariance matrix (3×3)
3. Find eigenvectors (principal axes) via power iteration
4. Project all vertices onto principal axes
5. Measure min/max along each axis → true dimensions

---

## 6. Styling (Dark Theme)

### CSS custom properties
```css
:root {
  --bg-primary: #1e1e1e;
  --bg-secondary: #252526;
  --bg-tertiary: #2d2d2d;
  --text-primary: #cccccc;
  --text-secondary: #808080;
  --accent: #569cd6;
  --accent-green: #4ec9b0;
  --accent-orange: #ce9178;
  --border-color: #3c3c3c;
}
```

### Design rules
- Use CSS variables for everything — makes theming trivial
- No Tailwind unless explicitly requested
- Vanilla CSS with BEM-like class naming
- Status badges: colored with configurable badge colors stored in DB
- Hover states on every interactive element
- Smooth transitions on panels/overlays (`transition: 0.2s ease`)

---

## 7. File Upload System

### Upload directory structure
```
uploads/
└── {itemId}/
    ├── design_v1.stl
    ├── design_v2.stl
    └── cnc_v1.nc
```

### Revision tracking pattern
```prisma
model Revision {
  id        String   @id @default(uuid())
  itemId    String
  item      Item     @relation(fields: [itemId], references: [id], onDelete: Cascade)
  stage     String   // "design", "2d_drawing", "documents", or custom
  version   Int
  fileName  String
  filePath  String
  fileType  String
  fileSize  Int
  createdAt DateTime @default(now())
}
```

### Upload API pattern
```typescript
export async function POST(request: Request, { params }: { params: { id: string } }) {
  const formData = await request.formData();
  const file = formData.get("file") as File;
  const stage = formData.get("stage") as string;

  // Get next version number
  const lastRevision = await prisma.revision.findFirst({
    where: { itemId: params.id, stage },
    orderBy: { version: "desc" },
  });
  const version = (lastRevision?.version ?? 0) + 1;

  // Save file
  const fileName = `${stage}_v${version}${path.extname(file.name)}`;
  const filePath = path.join(UPLOAD_DIR, params.id, fileName);
  // ... write to disk
}
```

---

## 8. Settings & Customization System

### Three-layer customization
1. **No-code (UI):** Field values, badge colors, columns, UI params → stored in DB
2. **Config (.env):** DB path, upload dir, port, API keys
3. **Code:** Schema changes, new components, new API routes

### Dynamic field values pattern
Store dropdown options in a `FieldValue` table instead of hardcoding. Load them in components via:
```typescript
const [options, setOptions] = useState<string[]>([]);
useEffect(() => {
  fetch("/api/field-values?field=status").then(r => r.json()).then(setOptions);
}, []);
```

---

## 9. Logging

### Structured logging pattern
```typescript
// lib/logger.ts
const LOG_TYPES = { USER: "user", APP: "app" };

async function log(type: string, action: string, details: string) {
  await prisma.logEntry.create({
    data: { type, action, details, timestamp: new Date() }
  });
}

export const userLog = {
  info: (action: string, details: string) => log("user", action, details),
};
export const appLog = {
  error: (action: string, details: string) => log("app", action, details),
};
```

---

## 10. Security Checklist

- [ ] `.env` is in `.gitignore`
- [ ] `.env.example` is committed (with placeholder values only)
- [ ] No hardcoded API keys, tokens, or passwords anywhere in code
- [ ] No credential files committed (check with `git log --all -p | grep -c "your_token_prefix"`)
- [ ] `uploads/` directory is gitignored
- [ ] `dev.db` is gitignored
- [ ] File uploads validate file type and size
- [ ] Delete operations prompt for confirmation

---

## 11. Desktop App Wrapper (macOS)

Turn any Next.js app into a macOS desktop app:
1. Generate icon → `public/icon.png`
2. Create `manifest.json` for PWA
3. Create `.app` bundle with shell script launcher
4. Convert icon to `.icns` with `iconutil`
5. Create `Info.plist`

Full workflow available in `.agent/workflows/make-desktop-app.md`.

---

## 12. AI Onboarding Workflow

Create `.agent/workflows/catch-up.md` in every project so an AI agent can understand the codebase:

```markdown
---
description: Read key project files to understand the codebase
---
## Steps
1. Read README.md (overview)
2. Read MANIFESTO.md (conventions)
3. Read CUSTOMIZATION.md (how to extend)
4. Read prisma/schema.prisma (data models)
5. Read .env.example (configuration)
6. Skim main page.tsx outline (state + orchestration)
7. Skim key component outlines
8. Skim API route outlines
9. Summarize and ask what to do
```

---

## 13. Git Conventions

- Meaningful commit messages: `feat:`, `fix:`, `docs:`, `security:`, `refactor:`
- Never commit credentials — if you do, scrub with `git filter-branch` + force push + rotate
- `dev.db`, `uploads/`, `.env`, `app/generated/` all gitignored
- `.env.example` always committed

---

## 14. Quick Reference: npm Packages

| Package | Purpose |
|---------|---------|
| `next` | Framework |
| `react` / `react-dom` | UI |
| `prisma` / `@prisma/client` | ORM |
| `@prisma/adapter-better-sqlite3` + `better-sqlite3` | SQLite driver |
| `three` + `@types/three` | 3D rendering |
| `occt-import-js` | STEP file loading (WASM) |
| `@dnd-kit/core` + `@dnd-kit/sortable` | Drag and drop |
| `uuid` | ID generation |
| `dotenv` | Environment variables |
| `archiver` | ZIP downloads |
