export interface StartCommand {
    cwd: string;   // relative to workspace root
    cmd: string;   // shell command
    port: number;  // port to check for health
    label: string; // "backend" | "frontend"
}

export interface AppInfo {
    slug: string;
    name: string;
    description: string;
    icon: string;
    backendPort?: number;
    frontendPort: number;
    tags: string[];
    experiment?: string;
    startCommands: StartCommand[];
    managed?: boolean;  // false = externally managed (e.g. systemd), don't start/stop
}

export const apps: AppInfo[] = [
    {
        slug: "fab-planner",
        name: "Fab Planner",
        description:
            "Production planning and fabrication management. Track parts, assemblies, jobs, timelines, stock inventory, and share across workspaces.",
        icon: "🏭",
        frontendPort: 3000,
        tags: ["production", "planning", "fabrication"],
        managed: true,
        startCommands: [
            {
                cwd: "applications/fab-planner",
                cmd: "npm run dev -- -p 3000",
                port: 3000,
                label: "frontend",
            },
        ],
    },
    {
        slug: "adc24-dashboard",
        name: "ADC-24 Electrophysiology",
        description:
            "Real-time recording, visualisation, and export of fungal mycelium electrical signals using a Pico Log ADC-24. Reproduces the Mishra et al. 2024 methodology.",
        icon: "⚡",
        backendPort: 8000,
        frontendPort: 3001,
        tags: ["electrophysiology", "hardware", "real-time"],
        experiment: "EXP_001",
        managed: true,
        startCommands: [
            {
                cwd: "applications/adc24-dashboard/server",
                cmd: "python3 -m uvicorn main:app --host 0.0.0.0 --port 8000",
                port: 8000,
                label: "backend",
            },
            {
                cwd: "applications/adc24-dashboard/dashboard",
                cmd: "npm run dev -- -p 3001",
                port: 3001,
                label: "frontend",
            },
        ],
    },
    {
        slug: "virtual-lab",
        name: "Virtual Lab",
        description:
            "Interactive 3D model of the laboratory. Explore equipment, workstations, and layout in a browser-based viewer.",
        icon: "🧪",
        frontendPort: 8080,
        tags: ["3D", "visualisation", "lab"],
        managed: true,
        startCommands: [
            {
                cwd: "applications/virtual-lab",
                cmd: "python3 -m http.server 8080 --bind 0.0.0.0",
                port: 8080,
                label: "frontend",
            },
        ],
    },
    {
        slug: "research-scout",
        name: "Research Scout",
        description:
            "Scrape and map interdisciplinary research spaces. Identify key people at the intersection of synthetic biology, robotics, art/design, AI, and DIYbio for the Paris community.",
        icon: "🔬",
        backendPort: 8002,
        frontendPort: 3003,
        tags: ["research", "scraping", "community"],
        managed: true,
        startCommands: [
            {
                cwd: "applications/research-scout/server",
                cmd: "python3 -m uvicorn main:app --host 0.0.0.0 --port 8002",
                port: 8002,
                label: "backend",
            },
            {
                cwd: "applications/research-scout/dashboard",
                cmd: "npm run dev -- -p 3003",
                port: 3003,
                label: "frontend",
            },
        ],
    },
    {
        slug: "experiment-viewer",
        name: "Experiment Notebooks",
        description:
            "Browse and read all experiment markdown files. Renders tables, code blocks, images, and GFM syntax in a polished dark-mode reader.",
        icon: "📓",
        backendPort: 8001,
        frontendPort: 3002,
        tags: ["experiments", "documentation", "markdown"],
        managed: true,
        startCommands: [
            {
                cwd: "applications/experiment-viewer/server",
                cmd: "python3 -m uvicorn main:app --host 0.0.0.0 --port 8001",
                port: 8001,
                label: "backend",
            },
            {
                cwd: "applications/experiment-viewer/dashboard",
                cmd: "npm run dev -- -p 3002",
                port: 3002,
                label: "frontend",
            },
        ],
    },
    {
        slug: "plasmid-viewer",
        name: "Plasmid Viewer",
        description:
            "Visualize and annotate plasmid DNA sequences. Import GenBank files, explore circular and linear maps, detect ORFs, and edit annotations.",
        icon: "🧬",
        backendPort: 8003,
        frontendPort: 3004,
        tags: ["biology", "plasmid", "visualisation"],
        managed: true,
        startCommands: [
            {
                cwd: "applications/plasmid-viewer/server",
                cmd: "python3 -c \"import uvicorn; uvicorn.run('main:app', host='0.0.0.0', port=8003)\"",
                port: 8003,
                label: "backend",
            },
            {
                cwd: "applications/plasmid-viewer/dashboard",
                cmd: "npm run dev -- -p 3004",
                port: 3004,
                label: "frontend",
            },
        ],
    },
];

/**
 * Build the full URL for an app.
 */
export function getAppUrl(app: AppInfo): string {
    if (typeof window === "undefined") return `http://localhost:${app.frontendPort}`;
    const host = window.location.hostname;
    return `http://${host}:${app.frontendPort}`;
}
