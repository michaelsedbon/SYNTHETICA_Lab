/**
 * 3D Viewer Settings — client-side only (localStorage).
 * Each user gets their own configuration.
 */

export interface ViewerSettings {
    /** Model material color (hex string) */
    color: string;
    /** PBR metalness 0-1 */
    metalness: number;
    /** PBR roughness 0-1 */
    roughness: number;
    /** Show wireframe overlay */
    wireframe: boolean;
    /** Environment/ambient light intensity 0-2 */
    environmentIntensity: number;
    /** Show ground grid */
    showGrid: boolean;
    /** Scene background color (hex string) */
    backgroundColor: string;
}

export const DEFAULT_VIEWER_SETTINGS: ViewerSettings = {
    color: "#569cd6",
    metalness: 0.2,
    roughness: 0.55,
    wireframe: false,
    environmentIntensity: 1.0,
    showGrid: true,
    backgroundColor: "#1a1a1a",
};

const STORAGE_KEY = "fab-planner-viewer-settings";

export function loadViewerSettings(): ViewerSettings {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
            return { ...DEFAULT_VIEWER_SETTINGS, ...JSON.parse(raw) };
        }
    } catch { /* ignore */ }
    return { ...DEFAULT_VIEWER_SETTINGS };
}

export function saveViewerSettings(settings: ViewerSettings): void {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch { /* ignore */ }
}
