export interface AppInfo {
    slug: string;
    name: string;
    description: string;
    icon: string;
    backendPort?: number;
    frontendPort: number;
    status: "running" | "stopped" | "dev";
    tags: string[];
    experiment?: string;
}

export const apps: AppInfo[] = [
    {
        slug: "fab-planner",
        name: "Fab Planner",
        description:
            "Production planning and fabrication management. Track parts, assemblies, jobs, timelines, stock inventory, and share across workspaces.",
        icon: "🏭",
        frontendPort: 3000,
        status: "running",
        tags: ["production", "planning", "fabrication"],
    },
    {
        slug: "adc24-dashboard",
        name: "ADC-24 Electrophysiology",
        description:
            "Real-time recording, visualisation, and export of fungal mycelium electrical signals using a Pico Log ADC-24. Reproduces the Mishra et al. 2024 methodology.",
        icon: "⚡",
        backendPort: 8000,
        frontendPort: 3001,
        status: "dev",
        tags: ["electrophysiology", "hardware", "real-time"],
        experiment: "EXP_001",
    },
];

/**
 * Build the full URL for an app.
 * On the server (or any non-localhost access), uses the current hostname.
 * On localhost, uses localhost.
 */
export function getAppUrl(app: AppInfo): string {
    if (typeof window === "undefined") return `http://localhost:${app.frontendPort}`;
    const host = window.location.hostname;
    return `http://${host}:${app.frontendPort}`;
}
