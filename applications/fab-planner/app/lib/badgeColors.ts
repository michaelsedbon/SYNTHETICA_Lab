// Badge color configuration — VS Code dark mode inspired fluorescent palette
// Stored in database (AppSettings), shared across all users

export interface BadgeColorMap {
    [value: string]: string; // value → hex color
}

export type AllBadgeColors = Record<string, BadgeColorMap>;

// Factory-default badge colors — curated color scheme
export const DEFAULT_BADGE_COLORS: AllBadgeColors = {
    status: {
        completed: "#76ff03",
        design: "#dcdcaa",
        manufacturing: "#ff6e40",
        new: "#00e5ff",
        review: "#e040fb",
        urgent: "#f44747",
    },
    fabMechanism: {
        "3d printing": "#00e5ff",
        cnc: "#f44747",
        "sheet metal": "#76ff03",
    },
};

// Bright fluorescent palette inspired by VS Code dark theme
export const BADGE_PALETTE = [
    "#4ec9b0", // teal/cyan
    "#569cd6", // blue
    "#c586c0", // purple/magenta
    "#dcdcaa", // yellow
    "#ce9178", // orange
    "#d16969", // red
    "#6a9955", // green
    "#4fc1ff", // bright cyan
    "#9cdcfe", // light blue
    "#d7ba7d", // gold
    "#f44747", // bright red
    "#b5cea8", // light green
    "#e040fb", // neon magenta
    "#00e5ff", // neon cyan
    "#76ff03", // neon green
    "#ffea00", // neon yellow
    "#ff6e40", // neon orange
    "#ea80fc", // soft purple
    "#18ffff", // aqua
    "#64ffda", // mint
];

// ─── API helpers ────────────────────────────────────────

export async function loadBadgeColorsFromDB(): Promise<AllBadgeColors> {
    try {
        const res = await fetch("/api/settings");
        if (res.ok) {
            const data = await res.json();
            if (data.badgeColors) return data.badgeColors;
        }
    } catch { /* ignore */ }
    return { ...DEFAULT_BADGE_COLORS };
}

export async function saveBadgeColorsToDB(colors: AllBadgeColors) {
    try {
        await fetch("/api/settings", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ key: "badgeColors", value: colors }),
        });
    } catch { /* ignore */ }
}

export async function loadVisibleColumnsFromDB(workspaceId?: string | null): Promise<string[] | null> {
    try {
        const url = workspaceId ? `/api/settings?workspaceId=${workspaceId}` : "/api/settings";
        const res = await fetch(url);
        if (res.ok) {
            const data = await res.json();
            if (data.visibleColumns) return data.visibleColumns;
        }
        // If workspace-scoped has no columns, fall back to global
        if (workspaceId) {
            const globalRes = await fetch("/api/settings");
            if (globalRes.ok) {
                const globalData = await globalRes.json();
                if (globalData.visibleColumns) return globalData.visibleColumns;
            }
        }
    } catch { /* ignore */ }
    return null;
}

export async function saveVisibleColumnsToDB(cols: string[], workspaceId?: string | null) {
    try {
        await fetch("/api/settings", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ key: "visibleColumns", value: cols, ...(workspaceId ? { workspaceId } : {}) }),
        });
    } catch { /* ignore */ }
}

// ─── Style helper ────────────────────────────────────────

/** Return relative luminance (0 = black, 1 = white) for a hex color */
function luminance(hex: string): number {
    const h = hex.replace("#", "");
    const r = parseInt(h.substring(0, 2), 16) / 255;
    const g = parseInt(h.substring(2, 4), 16) / 255;
    const b = parseInt(h.substring(4, 6), 16) / 255;
    const toLinear = (c: number) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
    return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

export function getBadgeStyle(color: string | undefined): React.CSSProperties {
    if (!color) return {};
    const textColor = luminance(color) > 0.35 ? "#1a1a2e" : "#ffffff";
    return {
        background: color,
        color: textColor,
        border: "none",
        padding: "2px 8px",
        borderRadius: 4,
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: "0.3px",
        whiteSpace: "nowrap",
        display: "inline-block",
    };
}
