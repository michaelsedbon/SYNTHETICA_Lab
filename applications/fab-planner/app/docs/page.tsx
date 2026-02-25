"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import "./docs.css";

/* ─── Data: Documentation tree ───────────────────────────────── */
interface DocSection {
    id: string;
    title: string;
    icon: string;
    children?: DocSection[];
}

const DOC_TREE: DocSection[] = [
    {
        id: "getting-started",
        title: "Getting Started",
        icon: "🚀",
        children: [
            { id: "overview", title: "Overview", icon: "📋" },
            { id: "interface-layout", title: "Interface Layout", icon: "🖥️" },
            { id: "quick-start", title: "Quick Start Guide", icon: "⚡" },
        ],
    },
    {
        id: "workspaces",
        title: "Workspaces",
        icon: "🏢",
        children: [
            { id: "workspace-switching", title: "Switching Workspaces", icon: "🔄" },
            { id: "workspace-create", title: "Creating & Managing", icon: "➕" },
        ],
    },
    {
        id: "projects",
        title: "Projects",
        icon: "📁",
        children: [
            { id: "project-tree", title: "Project Tree", icon: "🌳" },
            { id: "project-folders", title: "Creating Folders", icon: "📂" },
            { id: "project-starring", title: "Starred Projects", icon: "⭐" },
        ],
    },
    {
        id: "parts-management",
        title: "Parts Management",
        icon: "🔧",
        children: [
            { id: "parts-table", title: "Parts Table", icon: "📊" },
            { id: "inline-editing", title: "Inline Editing", icon: "✏️" },
            { id: "creating-parts", title: "Creating Parts", icon: "➕" },
            { id: "drag-drop", title: "Drag & Drop Upload", icon: "📥" },
            { id: "bulk-actions", title: "Bulk Actions", icon: "⚡" },
            { id: "context-menu", title: "Context Menu", icon: "📋" },
        ],
    },
    {
        id: "detail-panel",
        title: "Detail Panel",
        icon: "📝",
        children: [
            { id: "part-details", title: "Viewing & Editing Fields", icon: "🔍" },
            { id: "file-upload", title: "File Upload & Revisions", icon: "📎" },
            { id: "3d-viewer", title: "3D Viewer", icon: "📦" },
            { id: "section-clipping", title: "Section Clipping", icon: "🔪" },
        ],
    },
    {
        id: "filtering-sorting",
        title: "Filtering & Sorting",
        icon: "🔻",
        children: [
            { id: "search", title: "Search", icon: "🔍" },
            { id: "column-filters", title: "Column Filters", icon: "🔻" },
            { id: "sorting", title: "Sorting & Importance", icon: "⭐" },
        ],
    },
    {
        id: "timeline",
        title: "Timeline View",
        icon: "📅",
    },
    {
        id: "sharing",
        title: "Sharing & Collaboration",
        icon: "🔗",
        children: [
            { id: "share-parts", title: "Sharing Parts", icon: "📤" },
            { id: "shared-indicators", title: "Shared Indicators", icon: "🏷️" },
        ],
    },
    {
        id: "settings",
        title: "Settings",
        icon: "⚙️",
        children: [
            { id: "field-values", title: "Field Values", icon: "📋" },
            { id: "table-columns", title: "Table Columns", icon: "📊" },
            { id: "badge-colors", title: "Badge Colors", icon: "🎨" },
            { id: "appearance", title: "Appearance", icon: "🖌️" },
            { id: "viewer-config", title: "3D Viewer Config", icon: "🎨" },
        ],
    },
    {
        id: "export-download",
        title: "Export & Download",
        icon: "⬇️",
        children: [
            { id: "csv-export", title: "CSV Export", icon: "📥" },
            { id: "file-download", title: "File Download", icon: "⬇️" },
        ],
    },
    {
        id: "keyboard-shortcuts",
        title: "Keyboard Shortcuts",
        icon: "⌨️",
    },
    {
        id: "advanced",
        title: "Advanced",
        icon: "🔬",
        children: [
            { id: "undo-redo", title: "Undo / Redo", icon: "↩️" },
            { id: "logs", title: "Activity Logs", icon: "📋" },
            { id: "deep-links", title: "Deep Links", icon: "🔗" },
        ],
    },
    {
        id: "complaint-journal",
        title: "Complaint Journal",
        icon: "📝",
    },
];

/* ─── Content for each section ───────────────────────────────── */
function getContent(id: string, onNavigate?: (id: string) => void): React.ReactNode {
    switch (id) {
        case "overview":
            return (
                <>
                    <h2>📋 Overview</h2>
                    <p>
                        <strong>Fab Planner</strong> is a manufacturing production management tool built for teams
                        that need to track parts, manage file revisions, visualize 3D models, and coordinate
                        fabrication workflows. It runs locally with a SQLite database and supports multiple
                        workspaces and projects.
                    </p>
                    <div className="feature-grid">
                        <div className="feature-card clickable" onClick={() => onNavigate?.("parts-table")}><span className="feature-icon">📊</span><h4>Parts Table</h4><p>Inline-editable production queue with drag-and-drop ordering</p><span className="card-arrow">→</span></div>
                        <div className="feature-card clickable" onClick={() => onNavigate?.("3d-viewer")}><span className="feature-icon">📦</span><h4>3D Viewer</h4><p>STL, FBX, and STEP file preview with section clipping</p><span className="card-arrow">→</span></div>
                        <div className="feature-card clickable" onClick={() => onNavigate?.("project-tree")}><span className="feature-icon">📁</span><h4>Projects</h4><p>Hierarchical project folders for organization</p><span className="card-arrow">→</span></div>
                        <div className="feature-card clickable" onClick={() => onNavigate?.("workspace-switching")}><span className="feature-icon">🏢</span><h4>Workspaces</h4><p>Multiple isolated environments for different teams</p><span className="card-arrow">→</span></div>
                        <div className="feature-card clickable" onClick={() => onNavigate?.("field-values")}><span className="feature-icon">⚙️</span><h4>Settings</h4><p>Customizable fields, badges, columns, and appearance</p><span className="card-arrow">→</span></div>
                        <div className="feature-card clickable" onClick={() => onNavigate?.("share-parts")}><span className="feature-icon">🔗</span><h4>Sharing</h4><p>Share parts across workspaces with full tracking</p><span className="card-arrow">→</span></div>
                    </div>
                </>
            );

        case "interface-layout":
            return (
                <>
                    <h2>🖥️ Interface Layout</h2>
                    <p>The application is composed of four main areas:</p>
                    <div className="layout-diagram">
                        <div className="layout-box layout-sidebar">
                            <strong>📁 Project Tree</strong>
                            <span>Toggleable sidebar showing hierarchical project folders</span>
                        </div>
                        <div className="layout-box layout-center">
                            <strong>📊 Parts Table</strong>
                            <span>Main production queue with sortable, filterable rows</span>
                        </div>
                        <div className="layout-box layout-right">
                            <strong>📝 Detail Panel</strong>
                            <span>Part details, file upload, and 3D viewer</span>
                        </div>
                    </div>
                    <div className="layout-box layout-toolbar" style={{ marginTop: 8 }}>
                        <strong>🔧 Toolbar</strong>
                        <span>Search, filters, tabs, export, new part, settings</span>
                    </div>
                </>
            );

        case "quick-start":
            return (
                <>
                    <h2>⚡ Quick Start Guide</h2>
                    <ol className="steps-list">
                        <li><strong>Create a workspace</strong> — Click the workspace switcher and add a new workspace</li>
                        <li><strong>Create a project</strong> — Right-click in the project tree and select &ldquo;New Folder&rdquo;</li>
                        <li><strong>Add parts</strong> — Click <kbd>+ New Part</kbd> or drag-and-drop CAD files onto the table</li>
                        <li><strong>Edit inline</strong> — Double-click any field in the table to edit it directly</li>
                        <li><strong>Upload files</strong> — Select a part and use the upload tabs in the detail panel</li>
                        <li><strong>Customize</strong> — Open Settings to configure columns, badge colors, and appearance</li>
                    </ol>
                </>
            );

        case "workspace-switching":
        case "workspace-create":
            return (
                <>
                    <h2>🏢 Workspaces</h2>
                    <p>
                        Workspaces are isolated environments that contain their own parts, projects, and settings.
                        Use them to separate different teams, clients, or product lines.
                    </p>
                    <div className="info-box">
                        <strong>💡 Tip:</strong> Each workspace has its own color indicator, making it easy to identify which workspace you are currently in.
                    </div>
                    <h3>Managing Workspaces</h3>
                    <ul>
                        <li><strong>Switch</strong> — Click the workspace selector in the header and choose a workspace</li>
                        <li><strong>Create</strong> — Click &ldquo;+ New Workspace&rdquo; at the bottom of the dropdown</li>
                        <li><strong>Rename / Delete</strong> — Hover over a workspace in the dropdown to reveal edit and delete buttons</li>
                        <li><strong>Color</strong> — Each workspace has a customizable color</li>
                    </ul>
                    <div className="demo-video">
                        <h4>🎬 Demo: Workspaces & Projects</h4>
                        <img src="/docs/workspace_projects_demo.webp" alt="Workspace and projects demo" />
                    </div>
                </>
            );

        case "project-tree":
        case "project-folders":
        case "project-starring":
            return (
                <>
                    <h2>📁 Project Organization</h2>
                    <p>
                        Projects are hierarchical folders used to organize parts. The project tree
                        appears as a toggleable sidebar on the left side of the application.
                    </p>
                    <h3>🌳 Project Tree</h3>
                    <ul>
                        <li><strong>Navigate</strong> — Click a project folder to filter the parts table to that project</li>
                        <li><strong>Create folder</strong> — Right-click a project and select &ldquo;New Sub-folder&rdquo;</li>
                        <li><strong>Rename / Delete</strong> — Right-click for context menu options</li>
                        <li><strong>Toggle</strong> — Press <kbd>⌘ B</kbd> or click the 📁 icon to show/hide the tree</li>
                    </ul>
                    <h3>⭐ Starred Projects</h3>
                    <p>
                        Star important projects to create quick-access tabs in the tab bar.
                        Starred projects appear as dedicated tabs above the table, showing part counts.
                    </p>
                    <div className="demo-video">
                        <h4>🎬 Demo: Workspace & Project Management</h4>
                        <img src="/docs/workspace_projects_demo.webp" alt="Workspace and project management demo" />
                    </div>
                </>
            );

        case "parts-table":
        case "inline-editing":
        case "creating-parts":
        case "drag-drop":
        case "bulk-actions":
            return (
                <>
                    <h2>🔧 Parts Management</h2>
                    <p>
                        The parts table is the core of Fab Planner. Every part in your production queue is displayed
                        as a row with configurable columns showing status badges, material info, dates, and more.
                    </p>

                    <h3>📊 Parts Table</h3>
                    <ul>
                        <li><strong>Select</strong> — Click a row to select it; the detail panel opens on the right</li>
                        <li><strong>Multi-select</strong> — Hold <kbd>⌘</kbd> (Cmd) to toggle individual rows, or <kbd>⇧</kbd> (Shift) for range selection</li>
                        <li><strong>Reorder</strong> — Drag the ⠿ handle to reorder parts by importance</li>
                        <li><strong>Badges</strong> — Status, material, type, and other select fields display as colored badges</li>
                    </ul>

                    <h3>✏️ Inline Editing</h3>
                    <p>Double-click any editable cell (part name, material, status, etc.) to edit it directly in the table. Changes are saved automatically on Enter or blur.</p>
                    <ul>
                        <li><kbd>Enter</kbd> — Save changes</li>
                        <li><kbd>Escape</kbd> — Cancel editing</li>
                        <li>Autocomplete suggestions appear for fields with existing values</li>
                    </ul>

                    <h3>➕ Creating Parts</h3>
                    <ul>
                        <li><strong>New Part button</strong> — Click <kbd>+ New Part</kbd> in the toolbar to create an empty part</li>
                        <li><strong>Drag & Drop</strong> — Drop CAD files (STL, FBX, STEP) onto the table to auto-create parts from files</li>
                        <li>New parts are automatically placed in the currently selected project</li>
                    </ul>

                    <h3>⚡ Bulk Actions</h3>
                    <p>When multiple parts are selected, a bulk action bar appears at the top of the table with options to:</p>
                    <ul>
                        <li>Batch-update status, material, or other fields</li>
                        <li>Move parts to a different project</li>
                        <li>Delete multiple parts at once</li>
                        <li>Download all files for selected parts</li>
                    </ul>

                    <div className="demo-video">
                        <h4>🎬 Demo: Parts Table & Inline Editing</h4>
                        <img src="/docs/parts_table_demo.webp" alt="Parts table and inline editing demo" />
                    </div>
                </>
            );

        case "context-menu":
            return (
                <>
                    <h2>📋 Right-Click Context Menu</h2>
                    <p>
                        Right-click any part row in the table to open a context menu with quick actions.
                        The menu adapts based on whether you have a single part or multiple parts selected.
                    </p>

                    <h3>🖱️ Single Part Actions</h3>
                    <p>Right-click a single part to access these actions:</p>
                    <table className="shortcuts-table">
                        <thead>
                            <tr><th>Action</th><th>Description</th></tr>
                        </thead>
                        <tbody>
                            <tr><td><strong>✏️ Rename</strong></td><td>Start inline editing of the part name directly in the table</td></tr>
                            <tr><td><strong>📁 Move to Project</strong></td><td>Opens a submenu showing the full project tree — select a folder to move the part into, or choose &ldquo;No Project&rdquo; to unassign</td></tr>
                            <tr><td><strong>⬇ Download Files</strong></td><td>Download all file revisions associated with this part as a ZIP archive</td></tr>
                            <tr><td><strong>🔗 Copy Link</strong></td><td>Copies a deep link URL to your clipboard that will navigate directly to this part when opened</td></tr>
                            <tr><td><strong>↗️ Share to…</strong></td><td>Opens a submenu listing all other workspaces with their project trees — share the part to a specific workspace and project</td></tr>
                            <tr><td><strong>❌ Unshare</strong></td><td>If this part was shared from another workspace, remove it from the current workspace (only appears for shared parts)</td></tr>
                            <tr><td><strong>🗑 Delete Part</strong></td><td>Permanently delete the part and all its files (with confirmation dialog)</td></tr>
                        </tbody>
                    </table>

                    <h3>👥 Bulk Actions (Multiple Parts)</h3>
                    <p>
                        When you have multiple parts selected (<kbd>⌘</kbd>-click or <kbd>⇧</kbd>-click),
                        right-click to see bulk actions:
                    </p>
                    <table className="shortcuts-table">
                        <thead>
                            <tr><th>Action</th><th>Description</th></tr>
                        </thead>
                        <tbody>
                            <tr><td><strong>📁 Move All to Project</strong></td><td>Move all selected parts to a project folder at once</td></tr>
                            <tr><td><strong>⬇ Download All Files</strong></td><td>Download files for all selected parts in one ZIP</td></tr>
                            <tr><td><strong>🗑 Delete N Parts</strong></td><td>Delete all selected parts at once (with confirmation)</td></tr>
                        </tbody>
                    </table>

                    <div className="info-box">
                        <strong>💡 Tip:</strong> The context menu automatically positions itself to stay within the viewport — it will flip upward or to the left if there isn&apos;t enough space below or to the right.
                    </div>

                    <h3>📁 Project Tree Context Menu</h3>
                    <p>Right-click on a project folder in the sidebar to access project-specific actions:</p>
                    <ul>
                        <li><strong>New Sub-folder</strong> — Create a child project inside this folder</li>
                        <li><strong>Rename</strong> — Rename the project folder</li>
                        <li><strong>Star / Unstar</strong> — Toggle the project as a starred tab in the tab bar</li>
                        <li><strong>Delete</strong> — Remove the project and reassign its parts</li>
                    </ul>
                </>
            );

        case "part-details":
        case "file-upload":
        case "3d-viewer":
        case "section-clipping":
            return (
                <>
                    <h2>📝 Detail Panel</h2>
                    <p>
                        The detail panel appears on the right side when a part is selected. It shows all part metadata,
                        file revisions, and a live 3D viewer for supported file types.
                    </p>

                    <h3>🔍 Fields & Metadata</h3>
                    <ul>
                        <li>Click any field value to edit it inline</li>
                        <li>Fields include: status, material, type, client, hospital, order ID, notes, due date, and more</li>
                        <li>Custom fields can be configured per workspace via Settings</li>
                    </ul>

                    <h3>📎 File Upload & Revisions</h3>
                    <p>Upload files to parts using tabbed categories:</p>
                    <ul>
                        <li><strong>Design</strong> — Original CAD files (STL, STEP, FBX, etc.)</li>
                        <li><strong>CNC</strong> — Machine-ready files (G-code, NC files)</li>
                        <li><strong>2D Drawings</strong> — Technical drawings (PDF, DXF)</li>
                        <li><strong>Documents</strong> — Reference documents</li>
                        <li><strong>Custom tabs</strong> — Create your own upload categories</li>
                    </ul>
                    <p>Each upload creates a new revision, maintaining a full history of file changes.</p>

                    <h3>📦 3D Viewer</h3>
                    <p>
                        Supported 3D formats (<strong>STL, FBX, STEP</strong>) are rendered inline with a full-featured viewer:
                    </p>
                    <ul>
                        <li><strong>Orbit, Pan, Zoom</strong> — Mouse drag to orbir; Scroll to zoom; Right-drag to pan</li>
                        <li><strong>BBox</strong> — Toggle bounding box with OBB dimensions (mm)</li>
                        <li><strong>Section Clipping</strong> — Slice the model along X, Y, Z axes to inspect internals</li>
                        <li><strong>Material Settings</strong> — Configurable in Settings → 3D Viewer tab</li>
                    </ul>

                    <div className="demo-video">
                        <h4>🎬 Demo: Detail Panel & 3D Viewer</h4>
                        <img src="/docs/detail_panel_demo.webp" alt="Detail panel and 3D viewer demo" />
                    </div>
                </>
            );

        case "search":
        case "column-filters":
        case "sorting":
            return (
                <>
                    <h2>🔻 Filtering & Sorting</h2>

                    <h3>🔍 Search</h3>
                    <p>Type in the search bar to instantly filter parts by name, unique ID, order ID, material, or any other field. The search is case-insensitive and matches across all visible columns.</p>

                    <h3>🔻 Column Filters</h3>
                    <p>Click the <kbd>🔻 Filters</kbd> button to reveal dropdown filters for:</p>
                    <ul>
                        <li><strong>Status</strong> — Filter by part status (e.g., New, In Progress, Done)</li>
                        <li><strong>Material</strong> — Filter by material type</li>
                        <li><strong>Client</strong> — Filter by client name</li>
                        <li><strong>Hospital</strong> — Filter by hospital</li>
                    </ul>
                    <p>Active filters are indicated by a dot (●) on the Filters button.</p>

                    <h3>⭐ Sorting & Importance</h3>
                    <ul>
                        <li><strong>Column headers</strong> — Click any column header to sort by that column (ascending/descending)</li>
                        <li><strong>Importance mode</strong> — Click <kbd>⭐ Importance</kbd> to sort by drag-order priority</li>
                        <li><strong>Drag reordering</strong> — When in importance mode, drag parts to set their priority</li>
                    </ul>
                </>
            );

        case "timeline":
            return (
                <>
                    <h2>📅 Timeline View</h2>
                    <p>
                        Toggle the timeline view to see a Gantt-style visualization of your production schedule.
                        Parts with due dates are shown as horizontal bars on a time axis.
                    </p>
                    <ul>
                        <li>Toggle with <kbd>📅 Timeline</kbd> button or press <kbd>⌘ T</kbd></li>
                        <li>Hover over bars to see detailed status history</li>
                        <li>Color-coded bars represent different part statuses</li>
                        <li>Scroll horizontally to navigate through time</li>
                    </ul>
                    <div className="demo-video">
                        <h4>🎬 See Timeline in Action</h4>
                        <img src="/docs/parts_table_demo.webp" alt="Timeline view demo" />
                    </div>
                </>
            );

        case "share-parts":
        case "shared-indicators":
            return (
                <>
                    <h2>🔗 Sharing & Collaboration</h2>
                    <p>Share parts across workspaces to collaborate with different teams.</p>

                    <h3>📤 Sharing Parts</h3>
                    <ol>
                        <li>Right-click a part in the table</li>
                        <li>Select &ldquo;Share to…&rdquo; from the context menu</li>
                        <li>Choose the target workspace and project</li>
                        <li>The part appears in both workspaces with a link indicator</li>
                    </ol>

                    <h3>🏷️ Shared Indicators</h3>
                    <ul>
                        <li><strong>Incoming shares</strong> — Shown with a colored workspace dot and &ldquo;↗ Workspace Name&rdquo; tag on the part name</li>
                        <li><strong>Outgoing shares</strong> — Shown with clickable workspace tags below the part name</li>
                        <li><strong>Click to navigate</strong> — Click any share tag to jump directly to the source/target workspace</li>
                        <li><strong>Stop sharing</strong> — Available via the detail panel or context menu</li>
                    </ul>
                </>
            );

        case "field-values":
        case "table-columns":
        case "badge-colors":
        case "appearance":
        case "viewer-config":
            return (
                <>
                    <h2>⚙️ Settings</h2>
                    <p>Open Settings (<kbd>⌘ ,</kbd>) to customize the application to your workflow.</p>

                    <div className="settings-grid">
                        <div className="setting-card">
                            <h4>📋 Field Values</h4>
                            <p>Define the available options for select fields (status, material, type, etc.). Add new values, rename existing ones, or remove unused options.</p>
                        </div>
                        <div className="setting-card">
                            <h4>📊 Table Columns</h4>
                            <p>Choose which columns appear in the parts table. Toggle visibility, and the changes are saved per workspace.</p>
                        </div>
                        <div className="setting-card">
                            <h4>🎨 Badge Colors</h4>
                            <p>Assign colors to field values (e.g., green for &ldquo;Done&rdquo;, yellow for &ldquo;Pending&rdquo;). Colors appear as badges in the table and detail panel.</p>
                        </div>
                        <div className="setting-card">
                            <h4>🖌️ Appearance</h4>
                            <p>Adjust UI scale, font sizes, border radius, and accent colors. Changes are applied in real-time with a preview.</p>
                        </div>
                        <div className="setting-card">
                            <h4>🎨 3D Viewer Config</h4>
                            <p>Customize the 3D viewer: model color, metalness, roughness, exposure, wireframe mode, and grid visibility. Includes a live preview with an interactive 3D torus knot. Settings are saved per device.</p>
                        </div>
                    </div>

                    <div className="demo-video">
                        <h4>🎬 Demo: Settings Panel</h4>
                        <img src="/docs/settings_demo.webp" alt="Settings panel demo" />
                    </div>
                </>
            );

        case "csv-export":
        case "file-download":
            return (
                <>
                    <h2>⬇️ Export & Download</h2>

                    <h3>📥 CSV Export</h3>
                    <p>Click <kbd>📥 Export</kbd> in the toolbar to download a CSV file containing all parts and their metadata. The export includes all fields and can be opened in Excel or Google Sheets.</p>

                    <h3>⬇️ File Download</h3>
                    <ul>
                        <li><strong>Single part</strong> — Right-click a part → &ldquo;Download Files&rdquo;</li>
                        <li><strong>Multiple parts</strong> — Select parts, then use the bulk action bar → &ldquo;Download&rdquo;</li>
                        <li><strong>All parts</strong> — Click <kbd>⬇ Download All</kbd> in the toolbar</li>
                    </ul>
                    <p>Downloads are packaged as ZIP files containing all file revisions organized by part.</p>
                </>
            );

        case "keyboard-shortcuts":
            return (
                <>
                    <h2>⌨️ Keyboard Shortcuts</h2>
                    <p>Press <kbd>?</kbd> anywhere in the app to see the full shortcuts reference. Here are the most important ones:</p>
                    <table className="shortcuts-table">
                        <thead>
                            <tr><th>Shortcut</th><th>Action</th></tr>
                        </thead>
                        <tbody>
                            <tr><td><kbd>⌘</kbd> + <kbd>Z</kbd></td><td>Undo last action</td></tr>
                            <tr><td><kbd>⌘</kbd> + <kbd>⇧</kbd> + <kbd>Z</kbd></td><td>Redo</td></tr>
                            <tr><td><kbd>⌘</kbd> + <kbd>N</kbd></td><td>Create new part</td></tr>
                            <tr><td><kbd>⌘</kbd> + <kbd>,</kbd></td><td>Open settings</td></tr>
                            <tr><td><kbd>⌘</kbd> + <kbd>F</kbd></td><td>Toggle filters</td></tr>
                            <tr><td><kbd>⌘</kbd> + <kbd>T</kbd></td><td>Toggle timeline</td></tr>
                            <tr><td><kbd>⌘</kbd> + <kbd>B</kbd></td><td>Toggle project tree</td></tr>
                            <tr><td><kbd>⌘</kbd> + <kbd>L</kbd></td><td>Toggle logs</td></tr>
                            <tr><td><kbd>⌘</kbd> + <kbd>A</kbd></td><td>Select all parts</td></tr>
                            <tr><td><kbd>Delete</kbd> / <kbd>Backspace</kbd></td><td>Delete selected parts</td></tr>
                            <tr><td><kbd>↑</kbd> / <kbd>↓</kbd></td><td>Navigate between parts</td></tr>
                            <tr><td><kbd>⌘</kbd> + <kbd>R</kbd></td><td>Refresh data</td></tr>
                            <tr><td><kbd>?</kbd></td><td>Show keyboard shortcuts</td></tr>
                            <tr><td><kbd>Escape</kbd></td><td>Close overlay / cancel edit</td></tr>
                        </tbody>
                    </table>
                </>
            );

        case "undo-redo":
            return (
                <>
                    <h2>↩️ Undo / Redo</h2>
                    <p>
                        Fab Planner tracks your recent actions and lets you undo or redo them.
                        This works for creating, deleting, renaming, and reordering parts.
                    </p>
                    <ul>
                        <li><kbd>⌘ Z</kbd> — Undo the last action</li>
                        <li><kbd>⌘ ⇧ Z</kbd> — Redo</li>
                        <li>Toast notifications appear with an &ldquo;Undo&rdquo; button for destructive actions</li>
                    </ul>
                </>
            );

        case "logs":
            return (
                <>
                    <h2>📋 Activity Logs</h2>
                    <p>
                        Click <kbd>📋 Logs</kbd> in the toolbar (or press <kbd>⌘ L</kbd>) to view the application activity log.
                        The log tracks all CRUD operations — creating, updating, and deleting parts — with timestamps.
                    </p>
                    <ul>
                        <li>Real-time log with auto-refresh</li>
                        <li>Clear logs with the trash button</li>
                        <li>Useful for debugging and auditing changes</li>
                    </ul>
                </>
            );

        case "deep-links":
            return (
                <>
                    <h2>🔗 Deep Links</h2>
                    <p>
                        You can link directly to a specific part by appending its unique ID to the URL:
                    </p>
                    <pre className="code-block">
                        http://localhost:3000?partId=FAB-0001
                    </pre>
                    <p>
                        The app will automatically navigate to the correct workspace and project,
                        scroll to the part, and select it.
                    </p>
                </>
            );

        case "complaint-journal":
            return (
                <>
                    <h2>📝 Complaint Journal</h2>
                    <p>
                        Use the journal to report issues, bugs, or suggestions about the app.
                        Attach screenshots or screen recordings to help explain the problem.
                        Each entry can be tracked through its lifecycle: open → in progress → resolved.
                    </p>
                    <div className="info-box">
                        <strong>💡 Tip:</strong> The Complaint Journal now has its own dedicated page for easier access.
                        Click the button below or use the <strong>📝 Complaints</strong> button in the main app toolbar.
                    </div>
                    <a
                        href="/complaints"
                        className="cj-btn cj-btn-submit"
                        style={{ display: "inline-block", textDecoration: "none", marginTop: 8, padding: "10px 20px", fontSize: 14 }}
                    >
                        Open Complaint Journal →
                    </a>
                </>
            );

        default:
            return (
                <>
                    <h2>{id}</h2>
                    <p>Documentation coming soon for this section.</p>
                </>
            );
    }
}

/* ─── Tree Item Component ────────────────────────────────────── */
function TreeItem({
    section,
    activeId,
    onSelect,
    depth = 0,
}: {
    section: DocSection;
    activeId: string;
    onSelect: (id: string) => void;
    depth?: number;
}) {
    const [open, setOpen] = useState(true);
    const hasChildren = section.children && section.children.length > 0;
    const isActive = activeId === section.id || section.children?.some((c) => c.id === activeId);

    return (
        <div className="tree-item">
            <div
                className={`tree-node ${isActive ? "active" : ""} ${!hasChildren && activeId === section.id ? "selected" : ""}`}
                style={{ paddingLeft: 12 + depth * 16 }}
                onClick={() => {
                    if (hasChildren) {
                        setOpen(!open);
                        onSelect(section.children![0].id); // Navigate to first child
                    } else {
                        onSelect(section.id);
                    }
                }}
            >
                {hasChildren && <span className={`tree-chevron ${open ? "open" : ""}`}>▸</span>}
                <span className="tree-icon">{section.icon}</span>
                <span className="tree-label">{section.title}</span>
            </div>
            {hasChildren && open && (
                <div className="tree-children">
                    {section.children!.map((child) => (
                        <TreeItem key={child.id} section={child} activeId={activeId} onSelect={onSelect} depth={depth + 1} />
                    ))}
                </div>
            )}
        </div>
    );
}

/* ─── Main Documentation Page ────────────────────────────────── */
export default function DocsPage() {
    const [activeId, setActiveId] = useState("overview");
    const contentRef = useRef<HTMLDivElement>(null);
    const router = useRouter();

    // Scroll content to top when section changes
    useEffect(() => {
        contentRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    }, [activeId]);

    // Escape key → back to app
    useEffect(() => {
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                e.preventDefault();
                router.push("/");
            }
        };
        window.addEventListener("keydown", handleKey);
        return () => window.removeEventListener("keydown", handleKey);
    }, [router]);

    return (
        <div className="docs-layout">
            {/* Sidebar */}
            <nav className="docs-sidebar">
                <div className="docs-sidebar-header">
                    <h1>📘 Fab Planner</h1>
                    <span className="docs-version">Documentation</span>
                </div>
                <div className="docs-tree">
                    {DOC_TREE.map((section) => (
                        <TreeItem key={section.id} section={section} activeId={activeId} onSelect={setActiveId} />
                    ))}
                </div>
                <div className="docs-sidebar-footer">
                    <a href="/" className="back-link">← Back to App</a>
                </div>
            </nav>

            {/* Content */}
            <main className="docs-content" ref={contentRef}>
                <div className="docs-content-inner">
                    {getContent(activeId, setActiveId)}
                </div>
            </main>
        </div>
    );
}
