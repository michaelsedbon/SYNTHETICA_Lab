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
