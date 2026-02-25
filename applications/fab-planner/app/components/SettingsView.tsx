"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/app/components/ui/button";
import { Separator } from "@/app/components/ui/separator";
import { ScrollArea } from "@/app/components/ui/scroll-area";
import { type AllBadgeColors, DEFAULT_BADGE_COLORS, BADGE_PALETTE, saveBadgeColorsToDB, getBadgeStyle, saveVisibleColumnsToDB } from "@/app/lib/badgeColors";
import { type UIDesignParams, DEFAULT_UI_PARAMS, saveUIParams, applyUIParams } from "@/app/lib/uiDesign";
import { type WorkspaceFieldDef } from "@/app/page";
import { type ViewerSettings, DEFAULT_VIEWER_SETTINGS, loadViewerSettings, saveViewerSettings } from "@/app/lib/viewerSettings";

interface FieldConfig {
    key: string;
    label: string;
    icon: string;
}

const MANAGED_FIELDS: FieldConfig[] = [
    { key: "status", label: "Status", icon: "🔄" },
    { key: "material", label: "Material", icon: "🧱" },
    { key: "client", label: "Client", icon: "👤" },
    { key: "hospital", label: "Hospital", icon: "🏥" },
    { key: "who", label: "Who", icon: "🙋" },
    { key: "type", label: "Type", icon: "📋" },
    { key: "fabMechanism", label: "Fab Mechanism", icon: "⚙️" },
];

// All possible inline table columns (besides fixed ID and Part Name)
export const ALL_TABLE_COLUMNS: { key: string; label: string }[] = [
    { key: "status", label: "Status" },
    { key: "material", label: "Material" },
    { key: "dueDate", label: "Due" },
    { key: "files", label: "Files" },
    { key: "client", label: "Client" },
    { key: "quantity", label: "Qty" },
    { key: "who", label: "Who" },
    { key: "fabMechanism", label: "Fab" },
    { key: "type", label: "Type" },
    { key: "hospital", label: "Hospital" },
];

export const DEFAULT_VISIBLE_COLUMNS = ["status", "material", "dueDate", "files", "client", "quantity", "who", "fabMechanism"];

interface SettingsViewProps {
    onClose: () => void;
    visibleColumns: string[];
    onColumnVisibilityChange: (cols: string[]) => void;
    badgeColors: AllBadgeColors;
    onBadgeColorsChange: (colors: AllBadgeColors) => void;
    uiParams: UIDesignParams;
    onUIParamsChange: (params: UIDesignParams) => void;
    activeWorkspaceId?: string | null;
    activeWorkspaceName?: string;
    workspaceFields?: WorkspaceFieldDef[];
    onWorkspaceFieldsChange?: (fields: WorkspaceFieldDef[]) => void;
    isOwner?: boolean;
    onLoginAsOwner?: (token: string) => Promise<boolean>;
    onLogoutOwner?: () => Promise<void>;
    allWorkspaces?: { id: string; name: string; slug: string; color: string; visibility?: string }[];
    onWorkspaceVisibilityChange?: (id: string, visibility: string) => Promise<void>;
}

type SettingsTab = "fields" | "columns" | "badges" | "appearance" | "viewer" | "access";

/* ─── Viewer Settings Tab (self-contained with live 3D preview) ─── */
function ViewerSettingsTab() {
    const previewRef = useRef<HTMLDivElement>(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rendererRef = useRef<any>(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const meshRef = useRef<any>(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sceneRef = useRef<any>(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const gridRef = useRef<any>(null);
    const animRef = useRef<number | null>(null);
    const [vs, setVs] = useState<ViewerSettings>(loadViewerSettings());

    // We lazily import THREE only on the client
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const threeRef = useRef<any>(null);

    const updateSettings = (patch: Partial<ViewerSettings>) => {
        const next = { ...vs, ...patch };
        setVs(next);
        saveViewerSettings(next);
        window.dispatchEvent(new Event("viewer-settings-changed"));
    };

    useEffect(() => {
        if (!previewRef.current) return;
        const container = previewRef.current;
        let cancelled = false;

        // Dynamic import of Three.js for the preview
        import("three").then((THREE) => {
            if (cancelled) return;
            threeRef.current = THREE;

            const w = container.clientWidth;
            const h = container.clientHeight;

            const scene = new THREE.Scene();
            scene.background = new THREE.Color(vs.backgroundColor);
            sceneRef.current = scene;

            const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 500);
            camera.position.set(3, 2.5, 3);
            camera.lookAt(0, 0, 0);

            const renderer = new THREE.WebGLRenderer({ antialias: true });
            renderer.setSize(w, h);
            renderer.setPixelRatio(window.devicePixelRatio);
            renderer.toneMapping = THREE.ACESFilmicToneMapping;
            renderer.toneMappingExposure = vs.environmentIntensity;
            container.appendChild(renderer.domElement);
            rendererRef.current = renderer;

            // Lighting
            scene.add(new THREE.AmbientLight(0xffffff, 0.3));
            scene.add(new THREE.HemisphereLight(0xf0f0ff, 0x404040, 0.4));
            const dl = new THREE.DirectionalLight(0xffffff, 0.7);
            dl.position.set(5, 8, 5);
            scene.add(dl);
            const dl2 = new THREE.DirectionalLight(0xffffff, 0.3);
            dl2.position.set(-5, 4, -5);
            scene.add(dl2);

            // Grid
            const grid = new THREE.GridHelper(8, 16, 0x3c3c3c, 0x2d2d2d);
            grid.visible = vs.showGrid;
            scene.add(grid);
            gridRef.current = grid;

            // Torus knot
            const geo = new THREE.TorusKnotGeometry(0.85, 0.3, 128, 32);
            const mat = new THREE.MeshStandardMaterial({
                color: new THREE.Color(vs.color),
                metalness: vs.metalness,
                roughness: vs.roughness,
                wireframe: vs.wireframe,
            });
            const mesh = new THREE.Mesh(geo, mat);
            mesh.position.y = 0.5;
            scene.add(mesh);
            meshRef.current = mesh;

            // OrbitControls
            import("three/examples/jsm/controls/OrbitControls.js").then(({ OrbitControls }) => {
                if (cancelled) return;
                const controls = new OrbitControls(camera, renderer.domElement);
                controls.enableDamping = true;
                controls.dampingFactor = 0.05;
                controls.target.set(0, 0.5, 0);
                controls.update();

                function animate() {
                    animRef.current = requestAnimationFrame(animate);
                    controls.update();
                    renderer.render(scene, camera);
                }
                animate();
            });

            // Resize
            const ro = new ResizeObserver(() => {
                const nw = container.clientWidth;
                const nh = container.clientHeight;
                camera.aspect = nw / nh;
                camera.updateProjectionMatrix();
                renderer.setSize(nw, nh);
            });
            ro.observe(container);
        });

        return () => {
            cancelled = true;
            if (animRef.current) cancelAnimationFrame(animRef.current);
            if (rendererRef.current) {
                rendererRef.current.dispose();
                rendererRef.current = null;
            }
            while (container.firstChild) container.removeChild(container.firstChild);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Live-update the preview mesh when settings change
    useEffect(() => {
        const T = threeRef.current;
        if (!T || !meshRef.current) return;
        const mat = meshRef.current.material;
        mat.color.set(vs.color);
        mat.metalness = vs.metalness;
        mat.roughness = vs.roughness;
        mat.wireframe = vs.wireframe;
        mat.needsUpdate = true;

        if (sceneRef.current) {
            sceneRef.current.background?.set(vs.backgroundColor);
        }
        if (gridRef.current) {
            gridRef.current.visible = vs.showGrid;
        }
        if (rendererRef.current) {
            rendererRef.current.toneMappingExposure = vs.environmentIntensity;
        }
    }, [vs]);

    const sliderRow = (label: string, value: number, min: number, max: number, step: number, key: keyof ViewerSettings) => (
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <label style={{ flex: "0 0 130px", fontSize: 12, color: "var(--text-secondary)" }}>{label}</label>
            <input
                type="range" min={min} max={max} step={step}
                value={value}
                onChange={(e) => updateSettings({ [key]: parseFloat(e.target.value) })}
                style={{ flex: 1, accentColor: "var(--ui-accent-color, var(--accent-blue))" }}
            />
            <span style={{ flex: "0 0 40px", textAlign: "right", fontSize: 12, fontWeight: 600, color: "var(--text-primary)", fontVariantNumeric: "tabular-nums" }}>
                {typeof value === "number" ? value.toFixed(2) : value}
            </span>
        </div>
    );

    return (
        <div className="settings-body" style={{ display: "flex", gap: 0, height: "100%", overflow: "hidden" }}>
            {/* Controls panel */}
            <ScrollArea style={{ flex: "0 0 320px", padding: "24px 20px", borderRight: "1px solid var(--border)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                    <h2 style={{ fontSize: 15, margin: 0 }}>🎨 3D Viewer</h2>
                    <Button
                        variant="destructive"
                        size="xs"
                        style={{ fontWeight: 600, fontSize: 10, padding: "3px 10px" }}
                        onClick={() => {
                            updateSettings({ ...DEFAULT_VIEWER_SETTINGS });
                        }}
                    >
                        🔄 Reset
                    </Button>
                </div>
                <p style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 16, lineHeight: 1.5 }}>
                    Customize 3D viewer appearance. Settings are saved locally per device.
                </p>

                {/* Color */}
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                    <label style={{ flex: "0 0 130px", fontSize: 12, color: "var(--text-secondary)" }}>Model Color</label>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <input
                            type="color" value={vs.color}
                            onChange={(e) => updateSettings({ color: e.target.value })}
                            style={{ width: 32, height: 28, border: "none", background: "none", cursor: "pointer", padding: 0 }}
                        />
                        <span style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "monospace" }}>{vs.color}</span>
                    </div>
                </div>

                {/* Background Color */}
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                    <label style={{ flex: "0 0 130px", fontSize: 12, color: "var(--text-secondary)" }}>Background</label>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <input
                            type="color" value={vs.backgroundColor}
                            onChange={(e) => updateSettings({ backgroundColor: e.target.value })}
                            style={{ width: 32, height: 28, border: "none", background: "none", cursor: "pointer", padding: 0 }}
                        />
                        <span style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "monospace" }}>{vs.backgroundColor}</span>
                    </div>
                </div>

                {/* Sliders */}
                {sliderRow("Metalness", vs.metalness, 0, 1, 0.05, "metalness")}
                {sliderRow("Roughness", vs.roughness, 0, 1, 0.05, "roughness")}
                {sliderRow("Exposure", vs.environmentIntensity, 0.2, 3, 0.1, "environmentIntensity")}

                {/* Toggles */}
                <div style={{ marginTop: 6, display: "flex", flexDirection: "column", gap: 8 }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12, color: "var(--text-secondary)", cursor: "pointer" }}>
                        <input type="checkbox" checked={vs.wireframe} onChange={(e) => updateSettings({ wireframe: e.target.checked })} />
                        Wireframe
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12, color: "var(--text-secondary)", cursor: "pointer" }}>
                        <input type="checkbox" checked={vs.showGrid} onChange={(e) => updateSettings({ showGrid: e.target.checked })} />
                        Show Grid
                    </label>
                </div>
            </ScrollArea>

            {/* Live 3D preview */}
            <div style={{ flex: 1, position: "relative", background: "#1a1a1a", minHeight: 300 }}>
                <div ref={previewRef} style={{ position: "absolute", inset: 0 }} />
                <div style={{
                    position: "absolute", bottom: 8, left: 8, fontSize: 10, color: "#666",
                    background: "rgba(0,0,0,0.5)", padding: "3px 8px", borderRadius: 4, pointerEvents: "none",
                }}>
                    Live Preview • Drag to rotate
                </div>
            </div>
        </div>
    );
}

/* ─── Workspace Access Tab (owner mode + visibility toggles) ─── */
function WorkspaceAccessTab({
    isOwner,
    onLoginAsOwner,
    onLogoutOwner,
    allWorkspaces,
    onWorkspaceVisibilityChange,
}: {
    isOwner: boolean;
    onLoginAsOwner?: (token: string) => Promise<boolean>;
    onLogoutOwner?: () => Promise<void>;
    allWorkspaces: { id: string; name: string; slug: string; color: string; visibility?: string }[];
    onWorkspaceVisibilityChange?: (id: string, visibility: string) => Promise<void>;
}) {
    const [token, setToken] = useState("");
    const [error, setError] = useState("");
    const [loginLoading, setLoginLoading] = useState(false);

    const handleLogin = async () => {
        if (!token.trim() || !onLoginAsOwner) return;
        setLoginLoading(true);
        setError("");
        const success = await onLoginAsOwner(token.trim());
        setLoginLoading(false);
        if (!success) {
            setError("Invalid token. Please try again.");
        }
        setToken("");
    };

    return (
        <ScrollArea style={{ flex: 1, padding: 24 }}>
            <div style={{ maxWidth: 560 }}>
                {/* ── Owner Mode Section ── */}
                <div style={{
                    background: isOwner
                        ? "linear-gradient(135deg, rgba(78, 201, 176, 0.08), rgba(78, 201, 176, 0.03))"
                        : "var(--bg-secondary)",
                    border: isOwner ? "1px solid rgba(78, 201, 176, 0.25)" : "1px solid var(--border)",
                    borderRadius: 10,
                    padding: "20px 24px",
                    marginBottom: 28,
                }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                        <h2 style={{ fontSize: 15, margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
                            {isOwner ? "✅" : "🔐"} Owner Mode
                        </h2>
                        {isOwner && (
                            <span style={{
                                fontSize: 10,
                                fontWeight: 700,
                                color: "#4ec9b0",
                                background: "rgba(78, 201, 176, 0.12)",
                                padding: "3px 10px",
                                borderRadius: 20,
                                letterSpacing: "0.5px",
                                textTransform: "uppercase",
                            }}>
                                Active
                            </span>
                        )}
                    </div>

                    {isOwner ? (
                        <div>
                            <p style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 14, lineHeight: 1.6 }}>
                                You're authenticated as the owner. You can see <strong>all workspaces</strong> (including protected ones) and manage their visibility below.
                            </p>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => onLogoutOwner?.()}
                                style={{ fontSize: 11 }}
                            >
                                🚪 Logout
                            </Button>
                        </div>
                    ) : (
                        <div>
                            <p style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 14, lineHeight: 1.6 }}>
                                Enter the owner token to manage workspace visibility. Protected workspaces are only visible when logged in as owner.
                            </p>
                            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                                <input
                                    type="password"
                                    className="settings-add-input"
                                    placeholder="Enter owner token…"
                                    value={token}
                                    onChange={(e) => { setToken(e.target.value); setError(""); }}
                                    onKeyDown={(e) => { if (e.key === "Enter") handleLogin(); }}
                                    style={{ flex: 1 }}
                                    autoFocus
                                />
                                <Button
                                    variant="default"
                                    size="sm"
                                    onClick={handleLogin}
                                    disabled={!token.trim() || loginLoading}
                                    style={{ fontSize: 12 }}
                                >
                                    {loginLoading ? "…" : "🔓 Login"}
                                </Button>
                            </div>
                            {error && (
                                <p style={{ fontSize: 11, color: "#d16969", marginTop: 8, marginBottom: 0 }}>{error}</p>
                            )}
                        </div>
                    )}
                </div>

                {/* ── Workspace Visibility Section ── */}
                {isOwner ? (
                    <div>
                        <h3 style={{ fontSize: 14, marginBottom: 4, color: "var(--text-primary)" }}>Workspace Visibility</h3>
                        <p style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 16, lineHeight: 1.5 }}>
                            <strong>Open</strong> workspaces are visible to everyone. <strong>Protected</strong> workspaces are only visible when logged in as owner.
                        </p>
                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                            {allWorkspaces.map((ws) => {
                                const isProtected = ws.visibility === "protected";
                                return (
                                    <div
                                        key={ws.id}
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "space-between",
                                            padding: "10px 14px",
                                            borderRadius: 8,
                                            background: "var(--bg-secondary)",
                                            border: "1px solid var(--border)",
                                            transition: "all 0.15s",
                                        }}
                                    >
                                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                            <div style={{
                                                width: 10,
                                                height: 10,
                                                borderRadius: "50%",
                                                background: ws.color,
                                                flexShrink: 0,
                                            }} />
                                            <span style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)" }}>
                                                {ws.name}
                                            </span>
                                            {ws.slug === "default" && (
                                                <span style={{ fontSize: 9, color: "var(--text-muted)", background: "var(--bg-tertiary)", padding: "1px 6px", borderRadius: 4 }}>
                                                    default
                                                </span>
                                            )}
                                        </div>
                                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                            <span style={{
                                                fontSize: 10,
                                                fontWeight: 600,
                                                color: isProtected ? "#ce9178" : "#4ec9b0",
                                                letterSpacing: "0.3px",
                                            }}>
                                                {isProtected ? "🔒 Protected" : "🌐 Open"}
                                            </span>
                                            <button
                                                className="workspace-visibility-toggle"
                                                onClick={() => onWorkspaceVisibilityChange?.(ws.id, isProtected ? "open" : "protected")}
                                                data-active={isProtected}
                                                title={isProtected ? "Switch to open" : "Switch to protected"}
                                            >
                                                <span className="workspace-visibility-toggle-knob" />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        {allWorkspaces.length === 0 && (
                            <p style={{ fontSize: 12, color: "var(--text-muted)", textAlign: "center", padding: 24 }}>
                                No workspaces found.
                            </p>
                        )}
                    </div>
                ) : (
                    <div style={{
                        textAlign: "center",
                        padding: "32px 24px",
                        borderRadius: 10,
                        border: "1px dashed var(--border)",
                        color: "var(--text-muted)",
                    }}>
                        <p style={{ fontSize: 28, marginBottom: 8 }}>🔐</p>
                        <p style={{ fontSize: 13, marginBottom: 4 }}>Log in as owner to manage workspace visibility</p>
                        <p style={{ fontSize: 11 }}>Protected workspaces will be hidden from non-owners</p>
                    </div>
                )}
            </div>
        </ScrollArea>
    );
}

export default function SettingsView({
    onClose,
    visibleColumns,
    onColumnVisibilityChange,
    badgeColors,
    onBadgeColorsChange,
    uiParams,
    onUIParamsChange,
    activeWorkspaceId,
    activeWorkspaceName,
    workspaceFields = [],
    onWorkspaceFieldsChange,
    isOwner = false,
    onLoginAsOwner,
    onLogoutOwner,
    allWorkspaces = [],
    onWorkspaceVisibilityChange,
}: SettingsViewProps) {
    const [activeTab, setActiveTab] = useState<SettingsTab>("fields");
    const managedFields = workspaceFields;
    const [activeField, setActiveField] = useState(managedFields[0]?.key || "status");
    const [allValues, setAllValues] = useState<Record<string, string[]>>({});
    const [newValue, setNewValue] = useState("");
    const [loading, setLoading] = useState(true);

    // Badge colors tab state
    const [badgeCategory, setBadgeCategory] = useState<string>("status");
    const [expandedValue, setExpandedValue] = useState<string | null>(null);

    // Add field state
    const [showNewField, setShowNewField] = useState(false);
    const [newFieldName, setNewFieldName] = useState("");
    const [newFieldType, setNewFieldType] = useState<"select" | "multi-select" | "text" | "number" | "path">("select");

    // "New Field" contextual type picker
    const [newFieldMenu, setNewFieldMenu] = useState<{ x: number; y: number } | null>(null);

    // System field keys that cannot be deleted
    const SYSTEM_KEYS = ["status"];

    // Right-click context menu for sidebar fields
    const [fieldCtx, setFieldCtx] = useState<{ x: number; y: number; field: typeof workspaceFields[0] } | null>(null);

    // Drag reorder state
    const [dragIdx, setDragIdx] = useState<number | null>(null);
    const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

    // Derive dynamic column list from workspace fields + system columns
    const dynamicTableColumns: { key: string; label: string }[] = [
        { key: "status", label: "Status" },
        ...workspaceFields
            .filter(f => f.key !== "status")
            .map(f => ({ key: f.key, label: f.label })),
        { key: "dueDate", label: "Due" },
        { key: "files", label: "Files" },
        { key: "quantity", label: "Qty" },
    ];

    const fetchValues = useCallback(async () => {
        try {
            const res = await fetch("/api/field-values");
            if (res.ok) {
                const data = await res.json();
                setAllValues(data);
            }
        } catch (err) {
            console.error("Failed to fetch field values:", err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchValues();
    }, [fetchValues]);

    const handleDelete = async (field: string, value: string) => {
        if (!confirm(`Delete "${value}" from all parts?`)) return;
        try {
            const params = new URLSearchParams({ field, value });
            const res = await fetch(`/api/field-values?${params.toString()}`, {
                method: "DELETE",
            });
            if (res.ok) {
                const data = await res.json();
                setAllValues((prev) => ({
                    ...prev,
                    [field]: (prev[field] || []).filter((v) => v !== value),
                }));
                alert(`✓ Cleared from ${data.cleared} part(s).`);
            }
        } catch (err) {
            console.error("Failed to delete value:", err);
        }
    };

    const handleAdd = async (field: string) => {
        const trimmed = newValue.trim();
        if (!trimmed) return;
        try {
            const res = await fetch("/api/field-values", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ field, value: trimmed }),
            });
            if (res.ok) {
                setAllValues((prev) => ({
                    ...prev,
                    [field]: [...(prev[field] || []), trimmed].sort((a, b) => a.localeCompare(b)),
                }));
                setNewValue("");
            }
        } catch (err) {
            console.error("Failed to add value:", err);
        }
    };

    const handleRename = async (field: string, oldValue: string) => {
        const newName = prompt(`Rename "${oldValue}" to:`, oldValue);
        if (!newName || newName.trim() === oldValue) return;

        try {
            const res = await fetch("/api/field-values", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ field, oldValue, newValue: newName.trim() }),
            });
            if (res.ok) {
                const data = await res.json();
                setAllValues((prev) => ({
                    ...prev,
                    [field]: (prev[field] || [])
                        .map((v) => (v === oldValue ? newName.trim() : v))
                        .sort((a, b) => a.localeCompare(b)),
                }));
                alert(`✓ Renamed on ${data.updated} part(s).`);
            }
        } catch (err) {
            console.error("Failed to rename value:", err);
        }
    };

    const toggleColumn = (key: string) => {
        let next: string[];
        if (visibleColumns.includes(key)) {
            next = visibleColumns.filter((c) => c !== key);
        } else {
            const allKeys = dynamicTableColumns.map((c) => c.key);
            next = allKeys.filter((k) => visibleColumns.includes(k) || k === key);
        }
        saveVisibleColumnsToDB(next, activeWorkspaceId);
        onColumnVisibilityChange(next);
    };

    const setBadgeColor = (category: string, value: string, color: string | null) => {
        const next = { ...badgeColors };
        next[category] = { ...(next[category] || {}) };
        if (color) {
            next[category][value.toLowerCase()] = color;
        } else {
            delete next[category][value.toLowerCase()];
        }
        saveBadgeColorsToDB(next);
        onBadgeColorsChange(next);
    };

    const currentValues = allValues[activeField] || [];
    const currentFieldDef = workspaceFields.find((f) => f.key === activeField);
    const currentFieldLabel = currentFieldDef?.label || activeField;

    // Handler: create a new workspace field
    const handleCreateField = async (typeOverride?: string) => {
        if (!newFieldName.trim() || !activeWorkspaceId) return;
        const key = newFieldName.trim().replace(/[^a-zA-Z0-9_ ]/g, "").replace(/\s+/g, "_").toLowerCase();
        const ft = typeOverride || newFieldType;
        try {
            const res = await fetch("/api/workspace-fields", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    workspaceId: activeWorkspaceId,
                    key,
                    label: newFieldName.trim(),
                    fieldType: ft,
                    sortOrder: workspaceFields.length,
                }),
            });
            if (res.ok) {
                const created = await res.json();
                onWorkspaceFieldsChange?.([...workspaceFields, created]);
                setNewFieldName("");
                setShowNewField(false);
                setActiveField(created.key);
            }
        } catch { /* ignore */ }
    };

    // Quick-create field with a specific type from contextual menu
    const quickCreateField = (ft: string) => {
        setNewFieldMenu(null);
        setNewFieldType(ft as typeof newFieldType);
        setShowNewField(true);
    };

    // Persist field reorder
    const handleReorder = async (fromIdx: number, toIdx: number) => {
        if (fromIdx === toIdx) return;
        const reordered = [...workspaceFields];
        const [moved] = reordered.splice(fromIdx, 1);
        reordered.splice(toIdx, 0, moved);
        onWorkspaceFieldsChange?.(reordered);
        // Persist sortOrder for each field
        for (let i = 0; i < reordered.length; i++) {
            fetch("/api/workspace-fields", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: reordered[i].id, sortOrder: i }),
            }).catch(() => { /* ignore */ });
        }
    };

    // Handler: delete a workspace field
    const handleDeleteField = async (fieldId: string) => {
        const fieldToDelete = workspaceFields.find(f => f.id === fieldId);
        if (!fieldToDelete) return;

        try {
            const res = await fetch(`/api/workspace-fields?id=${fieldId}`, { method: "DELETE" });
            if (res.ok) {
                // 1. Remove from local fields list
                const updated = workspaceFields.filter(f => f.id !== fieldId);
                onWorkspaceFieldsChange?.(updated);

                // 2. Remove from active field if deleting the current one
                if (activeField === fieldToDelete.key) {
                    setActiveField(updated[0]?.key || "status");
                }

                // 3. Remove from visible columns list and save
                if (visibleColumns.includes(fieldToDelete.key)) {
                    const nextCols = visibleColumns.filter(c => c !== fieldToDelete.key);
                    onColumnVisibilityChange(nextCols);
                    saveVisibleColumnsToDB(nextCols, activeWorkspaceId);
                }

                // 4. Refresh field values
                fetchValues();
            }
        } catch { /* ignore */ }
    };

    // Get values for badge color editing
    const badgeValues = allValues[badgeCategory] || [];

    // All select/multi-select fields that can have badges
    const badgeableFields = workspaceFields.filter(f => f.fieldType === "select" || f.fieldType === "multi-select");

    // Helper: field type icon
    const fieldTypeIcon = (ft: string) => {
        switch (ft) {
            case "select": return "◉";
            case "multi-select": return "☰";
            case "number": return "#";
            case "path": return "🔗";
            default: return "T";
        }
    };

    return (
        <div className="settings-overlay">
            <div className="settings-container">
                {/* Header */}
                <div className="settings-header">
                    <h1>⚙️ Settings</h1>
                    <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                        <Button
                            variant={activeTab === "fields" ? "default" : "ghost"}
                            size="sm"
                            onClick={() => setActiveTab("fields")}
                            style={{ fontSize: 12 }}
                        >
                            📋 Field Values
                        </Button>
                        <Button
                            variant={activeTab === "columns" ? "default" : "ghost"}
                            size="sm"
                            onClick={() => setActiveTab("columns")}
                            style={{ fontSize: 12 }}
                        >
                            📊 Table Columns
                        </Button>
                        <Button
                            variant={activeTab === "badges" ? "default" : "ghost"}
                            size="sm"
                            onClick={() => setActiveTab("badges")}
                            style={{ fontSize: 12 }}
                        >
                            🎨 Badge Colors
                        </Button>
                        <Button
                            variant={activeTab === "appearance" ? "default" : "ghost"}
                            size="sm"
                            onClick={() => setActiveTab("appearance")}
                            style={{ fontSize: 12 }}
                        >
                            🖌️ Appearance
                        </Button>
                        <Button
                            variant={activeTab === "viewer" ? "default" : "ghost"}
                            size="sm"
                            onClick={() => setActiveTab("viewer")}
                            style={{ fontSize: 12 }}
                        >
                            🎨 3D Viewer
                        </Button>
                        <Button
                            variant={activeTab === "access" ? "default" : "ghost"}
                            size="sm"
                            onClick={() => setActiveTab("access")}
                            style={{ fontSize: 12 }}
                        >
                            🔐 Workspace Access
                        </Button>
                    </div>
                    <Button variant="ghost" size="icon-sm" className="settings-close" onClick={onClose} title="Close (Esc)">
                        ✕
                    </Button>
                </div>

                {activeTab === "fields" ? (
                    <div className="settings-body">
                        {/* Sidebar — field tabs */}
                        <div className="settings-sidebar">
                            {managedFields.map((f, idx) => (
                                <button
                                    key={f.key}
                                    className={`settings-tab ${activeField === f.key ? "active" : ""}`}
                                    onClick={() => { setActiveField(f.key); setNewValue(""); }}
                                    onContextMenu={(e) => {
                                        e.preventDefault();
                                        setFieldCtx({ x: e.clientX, y: e.clientY, field: f });
                                    }}
                                    draggable
                                    onDragStart={() => setDragIdx(idx)}
                                    onDragOver={(e) => { e.preventDefault(); setDragOverIdx(idx); }}
                                    onDragLeave={() => setDragOverIdx(null)}
                                    onDrop={(e) => { e.preventDefault(); if (dragIdx !== null) handleReorder(dragIdx, idx); setDragIdx(null); setDragOverIdx(null); }}
                                    onDragEnd={() => { setDragIdx(null); setDragOverIdx(null); }}
                                    style={{
                                        opacity: dragIdx === idx ? 0.4 : 1,
                                        borderTop: dragOverIdx === idx && dragIdx !== null && dragIdx > idx ? "2px solid var(--accent-blue)" : undefined,
                                        borderBottom: dragOverIdx === idx && dragIdx !== null && dragIdx < idx ? "2px solid var(--accent-blue)" : undefined,
                                    }}
                                >
                                    <span className="settings-tab-icon" style={{ fontSize: 11, fontWeight: 700, opacity: 0.5, cursor: "grab" }}>⠿</span>
                                    <span className="settings-tab-icon" style={{ fontSize: 11, fontWeight: 700, opacity: 0.5 }}>{fieldTypeIcon(f.fieldType)}</span>
                                    <span className="settings-tab-label">{f.label}</span>
                                    <span className="settings-tab-count">{(allValues[f.key] || []).length}</span>
                                </button>
                            ))}

                            {/* Right-click context menu for fields */}
                            {fieldCtx && (
                                <>
                                    <div style={{ position: "fixed", inset: 0, zIndex: 9998 }} onClick={() => setFieldCtx(null)} onContextMenu={(e) => { e.preventDefault(); setFieldCtx(null); }} />
                                    <div
                                        className="context-menu"
                                        style={{ position: "fixed", top: fieldCtx.y, left: fieldCtx.x, zIndex: 9999, minWidth: 160 }}
                                    >
                                        <div className="context-menu-header" style={{ padding: "6px 12px", fontSize: 11, opacity: 0.6 }}>
                                            {fieldCtx.field.label} ({fieldCtx.field.fieldType})
                                        </div>
                                        <Separator className="context-menu-divider" />
                                        <button
                                            className="context-menu-item danger"
                                            disabled={SYSTEM_KEYS.includes(fieldCtx.field.key)}
                                            style={SYSTEM_KEYS.includes(fieldCtx.field.key) ? { opacity: 0.4, cursor: "not-allowed" } : {}}
                                            onClick={() => {
                                                const f = fieldCtx.field;
                                                setFieldCtx(null);
                                                if (SYSTEM_KEYS.includes(f.key)) return;
                                                if (confirm(`⚠️ Delete field "${f.label}"?\n\nThis will permanently:\n• Remove the field from this workspace\n• Delete all "${f.label}" values from EVERY part\n\nThis action cannot be undone.`)) {
                                                    handleDeleteField(f.id);
                                                }
                                            }}
                                        >
                                            <span className="context-menu-icon">🗑</span>
                                            Delete Field
                                        </button>
                                    </div>
                                </>
                            )}

                            {/* New Field — type picker */}
                            <button
                                className="settings-tab"
                                style={{ borderTop: "1px solid var(--border)", marginTop: 4, paddingTop: 8, opacity: 0.7 }}
                                onClick={(e) => setNewFieldMenu({ x: e.clientX, y: e.clientY })}
                            >
                                <span className="settings-tab-icon">+</span>
                                <span className="settings-tab-label">New Field</span>
                            </button>

                            {/* New Field contextual type picker menu */}
                            {newFieldMenu && (
                                <>
                                    <div style={{ position: "fixed", inset: 0, zIndex: 9998 }} onClick={() => setNewFieldMenu(null)} />
                                    <div
                                        className="context-menu"
                                        style={{ position: "fixed", top: newFieldMenu.y, left: newFieldMenu.x, zIndex: 9999, minWidth: 180 }}
                                    >
                                        <div className="context-menu-header" style={{ padding: "6px 12px", fontSize: 11, opacity: 0.6 }}>Choose field type</div>
                                        <Separator className="context-menu-divider" />
                                        {([
                                            { type: "select", label: "Select", icon: "◉", desc: "Single choice from a list" },
                                            { type: "multi-select", label: "Multi-select", icon: "☰", desc: "Multiple choices from a list" },
                                            { type: "text", label: "Text", icon: "T", desc: "Free text input" },
                                            { type: "number", label: "Number", icon: "#", desc: "Numeric value" },
                                            { type: "path", label: "Path / URL", icon: "🔗", desc: "Clickable file path or web link" },
                                        ] as const).map(opt => (
                                            <button
                                                key={opt.type}
                                                className="context-menu-item"
                                                onClick={() => quickCreateField(opt.type)}
                                            >
                                                <span className="context-menu-icon">{opt.icon}</span>
                                                <span style={{ display: "flex", flexDirection: "column" }}>
                                                    <span>{opt.label}</span>
                                                    <span style={{ fontSize: 10, opacity: 0.5 }}>{opt.desc}</span>
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Main content — values list */}
                        <div className="settings-content">
                            <div className="settings-content-header">
                                <h2>{currentFieldLabel} Values <span style={{ fontSize: 11, fontWeight: 500, color: "var(--text-muted)", marginLeft: 6, textTransform: "capitalize" }}>({currentFieldDef?.fieldType || "text"})</span></h2>
                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                    <span className="settings-value-count">
                                        {currentValues.length} value{currentValues.length !== 1 ? "s" : ""}
                                    </span>
                                    {currentFieldDef && !SYSTEM_KEYS.includes(currentFieldDef.key) && (
                                        <Button
                                            variant="destructive"
                                            size="xs"
                                            style={{ fontSize: 10 }}
                                            onClick={() => { if (confirm(`⚠️ Delete field "${currentFieldLabel}"?\n\nThis will permanently:\n• Remove the field from this workspace\n• Delete all "${currentFieldLabel}" values from EVERY part\n\nThis action cannot be undone.`)) handleDeleteField(currentFieldDef.id); }}
                                            title="Delete this field from workspace"
                                        >🗑 Delete Field</Button>
                                    )}
                                </div>
                            </div>

                            {/* New field creation form */}
                            {showNewField && (
                                <div style={{ background: "var(--bg-secondary)", borderRadius: 8, padding: 12, marginBottom: 12, border: "1px solid var(--border)" }}>
                                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Create New Field <span style={{ fontSize: 11, fontWeight: 400, opacity: 0.6, textTransform: "capitalize" }}>({newFieldType})</span></div>
                                    <input
                                        type="text"
                                        className="settings-add-input"
                                        placeholder="Field name (e.g. Surgeon)"
                                        value={newFieldName}
                                        onChange={(e) => setNewFieldName(e.target.value)}
                                        onKeyDown={(e) => { if (e.key === "Enter") handleCreateField(); if (e.key === "Escape") setShowNewField(false); }}
                                        autoFocus
                                        style={{ marginBottom: 8 }}
                                    />
                                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                                        <label style={{ fontSize: 11, color: "var(--text-secondary)" }}>Type:</label>
                                        <select
                                            value={newFieldType}
                                            onChange={(e) => setNewFieldType(e.target.value as typeof newFieldType)}
                                            style={{ fontSize: 11, background: "var(--bg-tertiary)", color: "var(--text-primary)", border: "1px solid var(--border)", borderRadius: 4, padding: "2px 6px" }}
                                        >
                                            <option value="select">Select (single choice)</option>
                                            <option value="multi-select">Multi-select (multiple choices)</option>
                                            <option value="text">Text</option>
                                            <option value="number">Number</option>
                                            <option value="path">Path / URL</option>
                                        </select>
                                        <div style={{ flex: 1 }} />
                                        <Button variant="ghost" size="xs" onClick={() => setShowNewField(false)} style={{ fontSize: 11 }}>Cancel</Button>
                                        <Button variant="default" size="xs" onClick={() => handleCreateField()} disabled={!newFieldName.trim()} style={{ fontSize: 11 }}>Create</Button>
                                    </div>
                                </div>
                            )}

                            {/* Add new value */}
                            <div className="settings-add-row">
                                <input
                                    type="text"
                                    className="settings-add-input"
                                    placeholder={`Add a new ${currentFieldLabel.toLowerCase()} value...`}
                                    value={newValue}
                                    onChange={(e) => setNewValue(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") handleAdd(activeField);
                                    }}
                                />
                                <Button
                                    variant="default"
                                    size="sm"
                                    onClick={() => handleAdd(activeField)}
                                    disabled={!newValue.trim()}
                                >
                                    + Add
                                </Button>
                            </div>

                            {/* Values list */}
                            {loading ? (
                                <div className="settings-empty">Loading...</div>
                            ) : currentValues.length === 0 ? (
                                <div className="settings-empty">
                                    <p>No values yet for {currentFieldLabel}.</p>
                                    <p style={{ color: "var(--text-muted)", fontSize: 12 }}>
                                        Values appear here when you fill in this field on any part.
                                    </p>
                                </div>
                            ) : (
                                <div className="settings-values-list">
                                    {currentValues.map((value) => (
                                        <div key={value} className="settings-value-row">
                                            <span className="settings-value-text">{value}</span>
                                            <div className="settings-value-actions">
                                                <button
                                                    className="btn-settings-action"
                                                    onClick={() => handleRename(activeField, value)}
                                                    title="Rename this value across all parts"
                                                >
                                                    ✏️
                                                </button>
                                                <button
                                                    className="btn-settings-action danger"
                                                    onClick={() => handleDelete(activeField, value)}
                                                    title="Delete this value from all parts"
                                                >
                                                    🗑
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                ) : activeTab === "columns" ? (
                    /* Columns tab */
                    <div className="settings-body">
                        <div className="settings-content" style={{ flex: 1 }}>
                            <div className="settings-content-header">
                                <h2>📊 Visible Columns{activeWorkspaceName ? ` — ${activeWorkspaceName}` : ""}</h2>
                                <span className="settings-value-count">
                                    {visibleColumns.length} of {dynamicTableColumns.length} shown
                                </span>
                            </div>
                            <p style={{ color: "var(--text-secondary)", fontSize: 12, margin: "0 0 12px", padding: "0 4px" }}>
                                Choose which columns appear in the parts table. ID and Part Name are always visible.
                            </p>
                            <div className="settings-values-list">
                                {dynamicTableColumns.map((col) => {
                                    const isOn = visibleColumns.includes(col.key);
                                    return (
                                        <div key={col.key} className="settings-value-row" style={{ cursor: "pointer" }} onClick={() => toggleColumn(col.key)}>
                                            <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                                <span style={{
                                                    width: 18,
                                                    height: 18,
                                                    borderRadius: 4,
                                                    border: isOn ? "2px solid var(--accent-blue)" : "2px solid var(--border)",
                                                    background: isOn ? "var(--accent-blue)" : "transparent",
                                                    display: "inline-flex",
                                                    alignItems: "center",
                                                    justifyContent: "center",
                                                    fontSize: 11,
                                                    color: "#fff",
                                                    transition: "all 0.15s",
                                                    flexShrink: 0,
                                                }}>
                                                    {isOn ? "✓" : ""}
                                                </span>
                                                <span className="settings-value-text">{col.label}</span>
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                ) : activeTab === "badges" ? (
                    /* Badge Colors tab */
                    <div className="settings-body">
                        <div className="settings-sidebar">
                            {badgeableFields.map((f) => (
                                <button
                                    key={f.key}
                                    className={`settings-tab ${badgeCategory === f.key ? "active" : ""}`}
                                    onClick={() => { setBadgeCategory(f.key); setExpandedValue(null); }}
                                >
                                    <span className="settings-tab-icon" style={{ fontSize: 11, fontWeight: 700, opacity: 0.5 }}>{fieldTypeIcon(f.fieldType)}</span>
                                    <span className="settings-tab-label">{f.label}</span>
                                </button>
                            ))}
                        </div>

                        <div className="settings-content" style={{ flex: 1 }}>
                            <div className="settings-content-header">
                                <h2>{badgeableFields.find(f => f.key === badgeCategory)?.label || badgeCategory} Badge Colors</h2>
                            </div>
                            <p style={{ color: "var(--text-secondary)", fontSize: 12, margin: "0 0 12px", padding: "0 4px" }}>
                                Click a value to pick its badge color. Colors are saved automatically.
                            </p>

                            {badgeValues.length === 0 ? (
                                <div className="settings-empty">
                                    <p>No values defined yet for {badgeableFields.find(f => f.key === badgeCategory)?.label || badgeCategory}.</p>
                                    <p style={{ color: "var(--text-muted)", fontSize: 12 }}>
                                        Add values in the Field Values tab first.
                                    </p>
                                </div>
                            ) : (
                                <div className="settings-values-list">
                                    {badgeValues.map((value) => {
                                        const currentColor = (badgeColors[badgeCategory] || {})[value.toLowerCase()];
                                        const isExpanded = expandedValue === value;

                                        return (
                                            <div key={value} style={{ borderBottom: "1px solid var(--border)" }}>
                                                <div
                                                    className="settings-value-row"
                                                    style={{ cursor: "pointer" }}
                                                    onClick={() => setExpandedValue(isExpanded ? null : value)}
                                                >
                                                    <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                                        <span style={currentColor ? getBadgeStyle(currentColor) : {
                                                            fontSize: 11,
                                                            fontWeight: 600,
                                                            padding: "2px 8px",
                                                            borderRadius: 4,
                                                            background: "var(--surface-hover)",
                                                            color: "var(--text-secondary)",
                                                        }}>
                                                            {value}
                                                        </span>
                                                    </span>
                                                    <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                                                        {currentColor ? currentColor : "No color"} {isExpanded ? "▲" : "▼"}
                                                    </span>
                                                </div>

                                                {isExpanded && (
                                                    <div style={{
                                                        padding: "8px 12px 12px",
                                                        display: "flex",
                                                        flexWrap: "wrap",
                                                        gap: 6,
                                                        background: "var(--bg-elevated)",
                                                        borderTop: "1px solid var(--border)",
                                                    }}>
                                                        {/* No color option */}
                                                        <button
                                                            onClick={() => setBadgeColor(badgeCategory, value, null)}
                                                            style={{
                                                                width: 28,
                                                                height: 28,
                                                                borderRadius: 6,
                                                                border: !currentColor ? "2px solid #fff" : "2px solid var(--border)",
                                                                background: "var(--surface-hover)",
                                                                cursor: "pointer",
                                                                display: "flex",
                                                                alignItems: "center",
                                                                justifyContent: "center",
                                                                fontSize: 12,
                                                                color: "var(--text-muted)",
                                                            }}
                                                            title="Remove color"
                                                        >
                                                            ✕
                                                        </button>

                                                        {BADGE_PALETTE.map((color) => (
                                                            <button
                                                                key={color}
                                                                onClick={() => setBadgeColor(badgeCategory, value, color)}
                                                                style={{
                                                                    width: 28,
                                                                    height: 28,
                                                                    borderRadius: 6,
                                                                    border: currentColor === color ? "2px solid #fff" : "2px solid transparent",
                                                                    background: color,
                                                                    cursor: "pointer",
                                                                    boxShadow: currentColor === color ? `0 0 8px ${color}88` : "none",
                                                                    transition: "all 0.15s",
                                                                }}
                                                                title={color}
                                                            />
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                ) : activeTab === "appearance" ? (
                    <ScrollArea className="settings-body" style={{ padding: 32 }}>
                        <div style={{ maxWidth: 560 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
                                <h2 style={{ fontSize: 16 }}>🖌️ Appearance Settings</h2>
                                <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => {
                                        if (!confirm("Reset all settings to defaults? This will restore appearance, badge colors, and column visibility.")) return;
                                        // Restore ALL defaults
                                        const defaults = { ...DEFAULT_UI_PARAMS };
                                        applyUIParams(defaults);
                                        saveUIParams(defaults);
                                        onUIParamsChange(defaults);

                                        // Reset badge colors to curated defaults
                                        const defaultBadge: AllBadgeColors = JSON.parse(JSON.stringify(DEFAULT_BADGE_COLORS));
                                        saveBadgeColorsToDB(defaultBadge);
                                        onBadgeColorsChange(defaultBadge);

                                        // Reset column visibility
                                        saveVisibleColumnsToDB(DEFAULT_VISIBLE_COLUMNS, activeWorkspaceId);
                                        onColumnVisibilityChange([...DEFAULT_VISIBLE_COLUMNS]);
                                    }}
                                    style={{ fontWeight: 600, fontSize: 11 }}
                                    title="Resets appearance, badge colors, and column visibility to factory defaults"
                                >
                                    🔄 Restore All Defaults
                                </Button>
                            </div>

                            <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 20 }}>
                                Adjust the look and feel of the app. Changes are saved automatically and shared with all users.
                            </p>

                            {([
                                { key: "detailPanelWidth" as const, label: "Detail Panel Width", unit: "%", min: 15, max: 60, step: 1 },
                                { key: "baseFontSize" as const, label: "Base Font Size", unit: "px", min: 11, max: 18, step: 1 },
                                { key: "tableFontSize" as const, label: "Table Font Size", unit: "px", min: 10, max: 16, step: 1 },
                                { key: "tableRowHeight" as const, label: "Table Row Padding", unit: "px", min: 3, max: 16, step: 1 },
                                { key: "badgeRadius" as const, label: "Badge Roundness", unit: "px", min: 0, max: 12, step: 1 },
                                { key: "headerHeight" as const, label: "Header Height", unit: "px", min: 36, max: 64, step: 2 },
                            ] as const).map(({ key, label, unit, min, max, step }) => (
                                <div key={key} style={{ marginBottom: 18, display: "flex", alignItems: "center", gap: 12 }}>
                                    <label style={{ flex: "0 0 160px", fontSize: 13, color: "var(--text-secondary)" }}>{label}</label>
                                    <input
                                        type="range"
                                        min={min}
                                        max={max}
                                        step={step}
                                        value={uiParams[key]}
                                        onChange={(e) => {
                                            const next = { ...uiParams, [key]: Number(e.target.value) };
                                            applyUIParams(next);
                                            onUIParamsChange(next);
                                            saveUIParams(next);
                                        }}
                                        style={{ flex: 1, accentColor: "var(--ui-accent-color, var(--accent-blue))" }}
                                    />
                                    <span style={{
                                        flex: "0 0 48px",
                                        textAlign: "right",
                                        fontSize: 12,
                                        fontWeight: 600,
                                        color: "var(--text-primary)",
                                        fontVariantNumeric: "tabular-nums",
                                    }}>
                                        {uiParams[key]}{unit}
                                    </span>
                                </div>
                            ))}

                            {/* Accent color picker */}
                            <div style={{ marginBottom: 18, display: "flex", alignItems: "center", gap: 12 }}>
                                <label style={{ flex: "0 0 160px", fontSize: 13, color: "var(--text-secondary)" }}>Accent Color</label>
                                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", flex: 1 }}>
                                    {["#569cd6", "#4ec9b0", "#c586c0", "#dcdcaa", "#ce9178", "#6a9955", "#4fc1ff", "#d16969", "#e040fb", "#64ffda"].map((color) => (
                                        <div
                                            key={color}
                                            onClick={() => {
                                                const next = { ...uiParams, accentColor: color };
                                                applyUIParams(next);
                                                onUIParamsChange(next);
                                                saveUIParams(next);
                                            }}
                                            style={{
                                                width: 28,
                                                height: 28,
                                                borderRadius: 6,
                                                background: color,
                                                cursor: "pointer",
                                                border: uiParams.accentColor === color ? "2px solid #fff" : "2px solid transparent",
                                                boxShadow: uiParams.accentColor === color ? `0 0 8px ${color}88` : "none",
                                                transition: "all 0.15s",
                                            }}
                                            title={color}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>
                    </ScrollArea>
                ) : activeTab === "viewer" ? (
                    <ViewerSettingsTab />
                ) : activeTab === "access" ? (
                    <WorkspaceAccessTab
                        isOwner={isOwner}
                        onLoginAsOwner={onLoginAsOwner}
                        onLogoutOwner={onLogoutOwner}
                        allWorkspaces={allWorkspaces}
                        onWorkspaceVisibilityChange={onWorkspaceVisibilityChange}
                    />
                ) : null}
            </div>
        </div>
    );
}
