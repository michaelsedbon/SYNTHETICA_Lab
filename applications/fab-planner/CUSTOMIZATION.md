# Customization Guide

This document explains how to customize Fab Planner for your own manufacturing workflow.

---

## 1. Field Values (No Code Required)

Open **⚙️ Settings** in the app to manage:

- **Statuses** — Add/rename/remove status options (e.g., "QC Hold", "Outsourced")
- **Materials** — Manage your material library
- **Clients / Hospitals** — Track your customers
- **Who** — Team members
- **Type** — Part type categories
- **Fab Mechanism** — Manufacturing methods (CNC, 3D Print, Laser, etc.)

Changes take effect immediately in all dropdowns throughout the app.

---

## 2. Badge Colors (No Code Required)

In **Settings → Badge Colors**, click any status or fab mechanism badge to customize its color. The color picker supports hex values. Colors are saved to the database and persist across sessions.

---

## 3. Column Visibility (No Code Required)

In **Settings → Columns**, toggle which columns appear in the parts table. Hidden columns are still stored in the database — they're just not shown in the table view.

---

## 4. Upload Stages (No Code Required)

The app ships with built-in upload stages (Design, 2D Drawing, Documents). To add **custom upload stages** for specific parts:

1. Open a part's detail panel
2. Click the **+** button next to the upload tabs
3. Enter a stage name (e.g., "CNC Program", "QA Report")

Custom stages are saved per-part and support the same versioning as built-in stages.

---

## 5. UI Design Parameters (No Code Required)

In **Settings → UI Design Parameters**, you can adjust:
- Table font size
- Row height/padding
- Part name column width
- Content density

These are saved to the database and apply globally.

---

## 6. Custom Statuses & Workflow

To change what statuses mean in your workflow:

1. Go to **Settings → Status** and add your desired statuses
2. Parts marked as `complete` or `done` are automatically recognized as finished (used for the "Pending" tab count)
3. To add more "done" statuses, edit the `DONE_STATUSES` set in `app/page.tsx`:

```typescript
const DONE_STATUSES = new Set(["complete", "done", "shipped"]); // add yours here
```

---

## 7. Database Schema Changes

The database schema lives in `prisma/schema.prisma`. To add a field to parts:

1. Add the field to the `Part` model:
```prisma
model Part {
  // ... existing fields
  myNewField  String?  @map("my_new_field")
}
```

2. Push the change:
```bash
npx prisma db push
```

3. Add the field to `DetailPanel.tsx`'s `editableFields` array:
```typescript
{ label: "My New Field", key: "myNewField", type: "text" },
```

4. Optionally add it to `PartsTable.tsx` for table display and `SettingsView.tsx` for column visibility.

---

## 8. Theming & CSS

All styles are in `app/globals.css`. The design system uses CSS custom properties:

```css
:root {
  --bg-primary: #1e1e1e;        /* Main background */
  --bg-secondary: #252526;      /* Panel backgrounds */
  --bg-tertiary: #2d2d2d;       /* Cards, inputs */
  --text-primary: #cccccc;      /* Main text */
  --text-secondary: #808080;    /* Muted text */
  --accent: #569cd6;            /* Primary accent (blue) */
  --accent-green: #4ec9b0;      /* Success */
  --accent-orange: #ce9178;     /* Warning */
  --border-color: #3c3c3c;      /* Borders */
}
```

To switch to a light theme, override these variables. The entire app respects these tokens.

---

## 9. Adding New API Routes

API routes follow Next.js App Router conventions in `app/api/`. Example structure:

```
app/api/my-feature/route.ts     → GET /api/my-feature
app/api/my-feature/[id]/route.ts → GET /api/my-feature/:id
```

Use the existing `prisma` singleton from `lib/prisma.ts` and the logger from `lib/logger.ts`.

---

## 10. Project Tree

Projects support infinite nesting via a self-referencing `parentId` field. To customize:

- Right-click projects in the sidebar to rename, delete, or create sub-projects
- Star projects to pin them as tabs in the main view
- Move parts between projects via right-click context menu

---

## Need Help?

If you're using an AI assistant (like Antigravity), tell it to run the `/catch-up` workflow. It will read all the key files and be ready to help you customize anything.
