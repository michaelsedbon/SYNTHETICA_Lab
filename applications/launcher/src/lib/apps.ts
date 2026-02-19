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
        managed: false, // runs via systemd on server, or standalone
        startCommands: [
            {
                cwd: ".",
                cmd: "echo 'Fab Planner is managed externally'",
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
];

/**
 * Build the full URL for an app.
 */
export function getAppUrl(app: AppInfo): string {
    if (typeof window === "undefined") return `http://localhost:${app.frontendPort}`;
    const host = window.location.hostname;
    return `http://${host}:${app.frontendPort}`;
}
