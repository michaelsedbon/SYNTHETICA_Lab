// UI Design parameters — shared across all users via DB

export interface UIDesignParams {
    detailPanelWidth: number;    // right pane % (5–60)
    tableFontSize: number;       // table body font size px (10–16)
    tableRowHeight: number;      // row padding px (4–16)
    headerHeight: number;        // top header height px (36–64)
    accentColor: string;         // primary accent color
    badgeRadius: number;         // badge border-radius px (0–12)
    baseFontSize: number;        // base body font size px (12–18)
}

export const DEFAULT_UI_PARAMS: UIDesignParams = {
    detailPanelWidth: 38,
    tableFontSize: 12,
    tableRowHeight: 8,
    headerHeight: 48,
    accentColor: "#569cd6",
    badgeRadius: 4,
    baseFontSize: 13,
};

export async function loadUIParams(): Promise<UIDesignParams> {
    try {
        const res = await fetch("/api/settings");
        if (res.ok) {
            const data = await res.json();
            if (data.uiDesign) {
                return { ...DEFAULT_UI_PARAMS, ...data.uiDesign };
            }
        }
    } catch { /* ignore */ }
    return { ...DEFAULT_UI_PARAMS };
}

export async function saveUIParams(params: UIDesignParams) {
    try {
        await fetch("/api/settings", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ key: "uiDesign", value: params }),
        });
    } catch { /* ignore */ }
}

// Apply params as CSS custom properties on <html>
export function applyUIParams(params: UIDesignParams) {
    const root = document.documentElement;
    root.style.setProperty("--ui-table-font-size", `${params.tableFontSize}px`);
    root.style.setProperty("--ui-table-row-padding", `${params.tableRowHeight}px`);
    root.style.setProperty("--ui-header-height", `${params.headerHeight}px`);
    root.style.setProperty("--ui-accent-color", params.accentColor);
    root.style.setProperty("--ui-badge-radius", `${params.badgeRadius}px`);
    root.style.setProperty("--ui-base-font-size", `${params.baseFontSize}px`);
}
