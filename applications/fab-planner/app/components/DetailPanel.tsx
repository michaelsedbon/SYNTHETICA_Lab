"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import dynamic from "next/dynamic";
import FileUpload from "./FileUpload";
import type { PartData, RevisionData } from "./PartsTable";
import type { ProjectNode } from "./ProjectTree";
import { Button } from "@/app/components/ui/button";
import { ButtonGroup } from "@/app/components/ui/button-group";
import { Input } from "@/app/components/ui/input";
import { Textarea } from "@/app/components/ui/textarea";
import { Badge } from "@/app/components/ui/badge";
import { Separator } from "@/app/components/ui/separator";

// Dynamic import for Three.js (no SSR)
const ModelViewer = dynamic(() => import("./ModelViewer"), { ssr: false });
const DxfViewer = dynamic(() => import("./DxfViewer"), { ssr: false });

import type { UndoableAction } from "@/app/lib/useUndoRedo";
import { isManagedField, DEFAULT_STATUS_OPTIONS, isBuiltInFieldKey } from "@/lib/constants";
import { type WorkspaceFieldDef } from "@/app/page";
import { flattenProjects } from "@/app/lib/projectUtils";

interface DetailPanelProps {
    partId: string;
    onClose: () => void;
    onPartUpdated?: () => void;
    pushAction?: (action: UndoableAction) => void;
    activeWorkspaceId?: string;
    onJumpToSource?: (originWorkspaceId: string, partId: string, projectId?: string | null) => void;
    workspaceFields?: WorkspaceFieldDef[];
    refreshKey?: number;
}



// Viewer tab definitions
type ViewerTab = "design" | "solidworks" | "2d_drawing" | "laser_cutting";
const VIEWER_TABS: { key: ViewerTab; label: string; icon: string }[] = [
    { key: "design", label: "Design", icon: "🎨" },
    { key: "solidworks", label: "SolidWorks", icon: "🔩" },
    { key: "2d_drawing", label: "2D Drawing", icon: "📐" },
    { key: "laser_cutting", label: "Laser Cutting", icon: "✂️" },
];

// Revision category tabs
const REVISION_CATEGORIES = [
    { key: "all", label: "All" },
    { key: "design", label: "🎨 Design" },
    { key: "solidworks", label: "🔩 SolidWorks" },
    { key: "cnc_program", label: "🔧 CNC" },
    { key: "2d_drawing", label: "📐 2D Drawing" },
    { key: "laser_cutting", label: "✂️ Laser Cutting" },
    { key: "document", label: "📄 Document" },
];

function formatDateDisplay(dateStr: string | null | undefined): string {
    if (!dateStr) return "—";
    try {
        return new Date(dateStr).toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric",
        });
    } catch {
        return "—";
    }
}

function toInputDate(dateStr: string | null | undefined): string {
    if (!dateStr) return "";
    try {
        return new Date(dateStr).toISOString().split("T")[0];
    } catch {
        return "";
    }
}

function getStageName(stage: string): string {
    const map: Record<string, string> = {
        design: "Design",
        solidworks: "SolidWorks",
        cnc_program: "CNC",
        "2d_drawing": "2D Drawing",
        laser_cutting: "Laser Cutting",
        document: "Document",
    };
    if (stage.startsWith("custom_")) return stage.replace("custom_", "");
    return map[stage] || stage;
}

function getStageClass(stage: string): string {
    const map: Record<string, string> = {
        design: "badge-design",
        solidworks: "badge-solidworks",
        cnc_program: "badge-manufacturing",
        "2d_drawing": "badge-drawing",
        laser_cutting: "badge-laser",
        document: "badge-document",
    };
    if (stage.startsWith("custom_")) return "badge-custom";
    return map[stage] || "badge-design";
}

// Inline 2D Drawing Viewer with Pan & Zoom
function DrawingViewer({ fileUrl, fileType }: { fileUrl: string | null; fileType: string }) {
    const [scale, setScale] = useState(1);
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const [isPanning, setIsPanning] = useState(false);
    const [pdfFit, setPdfFit] = useState(false);
    const panStartRef = useRef({ x: 0, y: 0 });
    const offsetStartRef = useRef({ x: 0, y: 0 });

    // Reset when file changes
    useEffect(() => {
        setScale(1);
        setOffset({ x: 0, y: 0 });
    }, [fileUrl]);

    const handleWheel = useCallback((e: React.WheelEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const factor = e.deltaY > 0 ? 0.9 : 1.1;
        setScale(prev => Math.min(Math.max(prev * factor, 0.1), 10));
    }, []);

    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        if (e.button !== 0) return; // only left click
        setIsPanning(true);
        panStartRef.current = { x: e.clientX, y: e.clientY };
        offsetStartRef.current = { ...offset };
    }, [offset]);

    const handleMouseMove = useCallback((e: React.MouseEvent) => {
        if (!isPanning) return;
        setOffset({
            x: offsetStartRef.current.x + (e.clientX - panStartRef.current.x),
            y: offsetStartRef.current.y + (e.clientY - panStartRef.current.y),
        });
    }, [isPanning]);

    const handleMouseUp = useCallback(() => {
        setIsPanning(false);
    }, []);

    const zoomIn = () => setScale(prev => Math.min(prev * 1.3, 10));
    const zoomOut = () => setScale(prev => Math.max(prev / 1.3, 0.1));
    const resetView = () => { setScale(1); setOffset({ x: 0, y: 0 }); };

    if (!fileUrl) {
        return (
            <div className="viewer-container">
                <div className="viewer-placeholder">
                    <div className="icon">📐</div>
                    <p>No 2D drawing uploaded yet</p>
                </div>
            </div>
        );
    }

    const isImage = ["png", "jpg", "jpeg", "svg"].includes(fileType);
    const isPdf = fileType === "pdf";

    if (isImage) {
        return (
            <div className="viewer-container drawing-viewer">
                <div className="drawing-viewer-controls">
                    <button onClick={zoomIn} title="Zoom In">🔍+</button>
                    <button onClick={zoomOut} title="Zoom Out">🔍−</button>
                    <button onClick={resetView} title="Reset View">↺ Reset</button>
                    <span className="viewer-zoom-level">{Math.round(scale * 100)}%</span>
                </div>
                <div
                    className="drawing-viewer-wrapper"
                    onWheel={handleWheel}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                    style={{ cursor: isPanning ? "grabbing" : "grab" }}
                >
                    <img
                        src={fileUrl}
                        alt="2D Drawing"
                        draggable={false}
                        style={{
                            transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
                            transformOrigin: "center center",
                            maxWidth: "100%",
                            maxHeight: "100%",
                            objectFit: "contain",
                            transition: isPanning ? "none" : "transform 0.1s ease",
                            pointerEvents: "none",
                        }}
                    />
                </div>
            </div>
        );
    }

    if (isPdf) {
        const pdfSrc = `${fileUrl}#toolbar=0&navpanes=0${pdfFit ? '&view=Fit' : ''}`;
        return (
            <div className="viewer-container drawing-viewer">
                <div
                    className="drawing-viewer-wrapper"
                    style={{ width: '100%', height: '100%' }}
                >
                    <iframe
                        key={pdfSrc}
                        src={pdfSrc}
                        title="2D Drawing PDF"
                        draggable={false}
                        style={{
                            width: "100%",
                            height: "100%",
                            border: "none",
                        }}
                    />
                </div>
                <div className="drawing-viewer-controls" style={{ justifyContent: 'center' }}>
                    <button onClick={() => setPdfFit(f => !f)} title="Fit to Screen">
                        {pdfFit ? '↔ Original Size' : '⊞ Fit to Screen'}
                    </button>
                    <button
                        type="button"
                        title="Open in Preview"
                        onClick={async () => {
                            const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            const nativeBridge = (window as any).webkit?.messageHandlers?.nativeDownload;
                            const partId = fileUrl!.split('/')[3];
                            try {
                                if (isLocal) {
                                    await fetch('/api/save-to-downloads', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ partIds: [partId] }),
                                    });
                                } else if (nativeBridge) {
                                    const fileName = fileUrl!.split('/').pop() || 'file';
                                    nativeBridge.postMessage({ url: `${fileUrl}?download=1`, filename: fileName });
                                } else {
                                    const iframe = document.createElement('iframe');
                                    iframe.style.display = 'none';
                                    iframe.src = `${fileUrl}?download=1`;
                                    document.body.appendChild(iframe);
                                    setTimeout(() => iframe.remove(), 60000);
                                }
                            } catch (err) {
                                console.error('Download failed:', err);
                            }
                        }}
                    >📄 Open in Preview</button>
                </div>
            </div>
        );
    }

    return (
        <div className="viewer-container">
            <div className="viewer-placeholder">
                <div className="icon">📄</div>
                <p>Preview not available for .{fileType}</p>
                <Button variant="default" size="sm" asChild style={{ marginTop: 8 }}>
                    <a href={fileUrl} download>⬇ Download file</a>
                </Button>
            </div>
        </div>
    );
}

export default function DetailPanel({ partId, onClose, onPartUpdated, pushAction, activeWorkspaceId, onJumpToSource, workspaceFields = [], refreshKey }: DetailPanelProps) {
    const [part, setPart] = useState<PartData | null>(null);
    const [loading, setLoading] = useState(true);
    const [selectedRevisionId, setSelectedRevisionId] = useState<string | null>(null);
    const [saveIndicator, setSaveIndicator] = useState<string | null>(null);
    const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
        viewer: true,
        details: true,
        revisions: true,
        upload: true,
    });

    // Viewer tab state
    const [activeViewerTab, setActiveViewerTab] = useState<ViewerTab>("design");

    // Revision tab state
    const [activeRevisionTab, setActiveRevisionTab] = useState<string>("all");

    // Editing state
    const [editingField, setEditingField] = useState<string | null>(null);
    const [editValue, setEditValue] = useState<string>("");
    const editRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);

    // Custom upload stages for this part
    const [customStages, setCustomStages] = useState<string[]>([]);

    // Dynamic status options (fetched from field-values API)
    const [statusOptions, setStatusOptions] = useState<string[]>(DEFAULT_STATUS_OPTIONS);

    // Autocomplete suggestions
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const suggestTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Projects for assignment dropdown
    const [allProjects, setAllProjects] = useState<ProjectNode[]>([]);

    // All field values (for custom select field dropdowns)
    const [allFieldValues, setAllFieldValues] = useState<Record<string, string[]>>({});

    useEffect(() => {
        fetch("/api/projects")
            .then((r) => r.json())
            .then(setAllProjects)
            .catch(() => { });
        // Fetch dynamic status options
        fetch("/api/field-values?field=status")
            .then((r) => r.json())
            .then((values: string[]) => {
                if (Array.isArray(values) && values.length > 0) setStatusOptions(values);
            })
            .catch(() => { /* keep defaults */ });
        // Fetch all field values (for custom select dropdowns)
        fetch("/api/field-values")
            .then((r) => r.json())
            .then((data: Record<string, string[]>) => {
                if (data && typeof data === 'object') setAllFieldValues(data);
            })
            .catch(() => { /* ignore */ });
    }, []);



    const flatProjects = flattenProjects(allProjects);

    const handleProjectChange = useCallback(async (projectId: string | null) => {
        if (!part) return;
        try {
            const res = await fetch(`/api/parts/${part.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ projectId }),
            });
            if (res.ok) {
                const updated = await res.json();
                setPart((prev) => (prev ? { ...prev, ...updated } : prev));
                setSaveIndicator("saved");
                setTimeout(() => setSaveIndicator(null), 1500);
                onPartUpdated?.();
            }
        } catch (err) {
            console.error("Failed to save project:", err);
            setSaveIndicator("error");
            setTimeout(() => setSaveIndicator(null), 2000);
        }
    }, [part, onPartUpdated]);

    const fetchPart = useCallback(async () => {
        try {
            const wsParam = activeWorkspaceId ? `?workspaceId=${activeWorkspaceId}` : '';
            const res = await fetch(`/api/parts/${partId}${wsParam}`);
            if (!res.ok) {
                if (res.status === 404) {
                    setPart(null);
                    onClose();
                    return;
                }
                throw new Error("Failed to fetch");
            }
            const data = await res.json();
            setPart(data);
            // Default to latest revision matching current viewer tab
            if (data.revisions?.length > 0 && !selectedRevisionId) {
                const matchingRev = data.revisions.find(
                    (r: RevisionData) => r.uploadStage === activeViewerTab
                );
                if (matchingRev) setSelectedRevisionId(matchingRev.id);
                else setSelectedRevisionId(data.revisions[0].id);
            }
        } catch (err) {
            console.error("Failed to fetch part:", err);
        } finally {
            setLoading(false);
        }
    }, [partId, selectedRevisionId, activeViewerTab]);

    useEffect(() => {
        setLoading(true);
        setSelectedRevisionId(null);
        fetchPart();
    }, [partId, refreshKey]); // eslint-disable-line react-hooks/exhaustive-deps

    // When viewer tab changes, auto-select the latest matching revision
    useEffect(() => {
        if (!part?.revisions) return;
        const matchingRev = part.revisions.find(
            (r) => r.uploadStage === activeViewerTab
        );
        setSelectedRevisionId(matchingRev?.id || null);
    }, [activeViewerTab, part?.revisions]);

    // Focus input when editing starts
    useEffect(() => {
        if (editingField && editRef.current) {
            editRef.current.focus();
        }
    }, [editingField]);

    const toggleSection = (key: string) => {
        setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));
    };

    // Save a single field
    const saveField = useCallback(
        async (field: string, value: string | string[] | null) => {
            if (!part) return;
            const isCustom = !isBuiltInFieldKey(field) && !['partName', 'orderId', 'notes', 'archivePath', 'dueDate', 'quantity', 'status'].includes(field);
            const oldValue = isCustom
                ? (part.customFields?.[field] ?? null)
                : ((part as unknown as Record<string, unknown>)[field] as string | null);
            const patchBody = isCustom ? { customFields: { [field]: value } } : { [field]: value };
            const undoBody = isCustom ? { customFields: { [field]: oldValue } } : { [field]: oldValue };
            try {
                const res = await fetch(`/api/parts/${part.id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(patchBody),
                });
                if (res.ok) {
                    const updated = await res.json();
                    setPart((prev) => (prev ? { ...prev, ...updated } : prev));
                    setSaveIndicator("saved");
                    setTimeout(() => setSaveIndicator(null), 1500);
                    onPartUpdated?.();
                    // Register undo action
                    if (pushAction && oldValue !== value) {
                        const partId = part.id;
                        pushAction({
                            label: `Edit ${field}`,
                            timestamp: Date.now(),
                            undo: async () => {
                                await fetch(`/api/parts/${partId}`, {
                                    method: "PATCH",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify(undoBody),
                                });
                                onPartUpdated?.();
                            },
                            redo: async () => {
                                await fetch(`/api/parts/${partId}`, {
                                    method: "PATCH",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify(patchBody),
                                });
                                onPartUpdated?.();
                            },
                        });
                    }
                    // Auto-add new value to FieldValue table for managed or custom fields
                    if (value) {
                        if (isManagedField(field) || isCustom) {
                            const valuesToAdd = Array.isArray(value) ? value : [value.trim()];
                            for (const v of valuesToAdd) {
                                fetch("/api/field-values", {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({ field, value: v.trim() }),
                                }).catch(() => { /* ignore */ });
                            }
                        }
                    }
                }
            } catch (err) {
                console.error("Failed to save:", err);
                setSaveIndicator("error");
                setTimeout(() => setSaveIndicator(null), 2000);
            }
            setEditingField(null);
        },
        [part, onPartUpdated, pushAction]
    );

    // Begin editing a text field
    const startEditing = (field: string, currentValue: string | null) => {
        setEditingField(field);
        setEditValue(currentValue || "");
        setSuggestions([]);
        // Immediately fetch suggestions for suggestable fields
        fetchSuggestions(field, "");
    };

    // Fetch autocomplete suggestions (debounced)
    const fetchSuggestions = useCallback((field: string, query: string) => {
        const suggestableFields = ["material", "orderId", "client", "hospital", "partName", "status", "who", "type", "fabMechanism"];
        // Also allow custom fields (non-built-in)
        const isCustom = !isBuiltInFieldKey(field) && !['partName', 'orderId', 'notes', 'archivePath', 'dueDate', 'quantity', 'status'].includes(field);
        if (!suggestableFields.includes(field) && !isCustom) {
            setSuggestions([]);
            return;
        }

        if (suggestTimerRef.current) clearTimeout(suggestTimerRef.current);

        suggestTimerRef.current = setTimeout(async () => {
            try {
                const res = await fetch(`/api/suggest?field=${field}&q=${encodeURIComponent(query)}`);
                if (res.ok) {
                    const data = await res.json();
                    setSuggestions(data.filter((s: string) => s.toLowerCase() !== query.toLowerCase()));
                }
            } catch {
                setSuggestions([]);
            }
        }, 200);
    }, []);

    // Trigger suggestions when editValue changes
    useEffect(() => {
        if (editingField) {
            fetchSuggestions(editingField, editValue);
        } else {
            setSuggestions([]);
        }
    }, [editValue, editingField, fetchSuggestions]);

    // Handle blur / Enter to save
    const handleEditBlur = (field: string) => {
        const isCustom = !isBuiltInFieldKey(field) && !['partName', 'orderId', 'notes', 'archivePath', 'dueDate', 'quantity', 'status'].includes(field);
        const current = field === "dueDate"
            ? toInputDate(part?.dueDate)
            : isCustom
                ? (part?.customFields?.[field] ?? "")
                : ((part as unknown as Record<string, unknown>)?.[field] as string) || "";
        if (editValue !== current) {
            saveField(field, editValue || null);
        } else {
            setEditingField(null);
        }
    };

    const handleEditKeyDown = (e: React.KeyboardEvent, field: string) => {
        if (e.key === "Enter" && field !== "notes") {
            handleEditBlur(field);
        }
        if (e.key === "Escape") {
            setEditingField(null);
        }
    };

    // Reveal in Finder
    const handleReveal = useCallback(async () => {
        if (!part) return;
        try {
            await fetch(`/api/parts/${part.id}/reveal`, { method: "POST" });
        } catch (err) {
            console.error("Failed to reveal:", err);
        }
    }, [part]);

    // Delete entire part
    const handleDeletePart = useCallback(async () => {
        if (!part) return;
        if (!confirm(`Delete part "${part.partName}" (${part.uniqueId})? This will remove all revisions and files permanently.`)) return;
        try {
            const res = await fetch(`/api/parts/${part.id}`, { method: "DELETE" });
            if (res.ok) {
                onPartUpdated?.();
                onClose();
            }
        } catch (err) {
            console.error("Failed to delete part:", err);
        }
    }, [part, onPartUpdated, onClose]);

    // Delete a single revision
    const handleDeleteRevision = useCallback(async (revisionId: string, fileName: string) => {
        if (!part) return;
        if (!confirm(`Delete revision "${fileName}"? The file will be permanently removed.`)) return;
        try {
            const res = await fetch(`/api/parts/${part.id}/revisions/${revisionId}`, { method: "DELETE" });
            if (res.ok) {
                fetchPart();
            }
        } catch (err) {
            console.error("Failed to delete revision:", err);
        }
    }, [part, fetchPart]);

    // Filtered revisions for the active viewer tab
    const viewerRevisions = useMemo(() => {
        if (!part?.revisions) return [];
        return part.revisions.filter((r) => r.uploadStage === activeViewerTab);
    }, [part?.revisions, activeViewerTab]);

    // Filtered revisions for the revision section tabs
    const filteredRevisions = useMemo(() => {
        if (!part?.revisions) return [];
        if (activeRevisionTab === "all") return part.revisions;
        return part.revisions.filter((r) => r.uploadStage === activeRevisionTab);
    }, [part?.revisions, activeRevisionTab]);

    // Detect custom stages from existing revisions
    const customRevisionTabs = useMemo(() => {
        if (!part?.revisions) return [];
        const stages = new Set(part.revisions.map((r) => r.uploadStage));
        return Array.from(stages)
            .filter((s) => s.startsWith("custom_"))
            .map((s) => ({ key: s, label: `🏷️ ${s.replace("custom_", "")}` }));
    }, [part?.revisions]);

    const allRevisionTabs = [...REVISION_CATEGORIES, ...customRevisionTabs];

    if (loading) {
        return (
            <div className="right-panel fade-in">
                <div className="panel-header">
                    <h2>Loading...</h2>
                    <Button variant="ghost" size="icon-sm" onClick={onClose}>✕</Button>
                </div>
            </div>
        );
    }

    if (!part) {
        return (
            <div className="right-panel fade-in">
                <div className="panel-header">
                    <h2>Part not found</h2>
                    <Button variant="ghost" size="icon-sm" onClick={onClose}>✕</Button>
                </div>
            </div>
        );
    }

    // Active revision for the current viewer tab
    const selectedRevision: RevisionData | undefined = viewerRevisions.find(
        (r) => r.id === selectedRevisionId
    );
    const latestViewerRevision: RevisionData | undefined = viewerRevisions[0];
    const activeRevision = selectedRevision || latestViewerRevision;

    // Build file URL for the viewer
    let fileUrl: string | null = null;
    let fileType = "";
    if (activeRevision) {
        const ext = activeRevision.filePath.split(".").pop() || activeRevision.fileType;
        const diskFile = `${activeRevision.uploadStage}_v${activeRevision.versionNumber}.${ext}`;
        fileUrl = `/api/files/${part.id}/${diskFile}`;
        fileType = activeRevision.fileType;
    }

    // Editable fields config — built from workspace field definitions + system fields
    // System fields that always exist (not driven by workspace fields)
    const SYSTEM_FIXED_FIELDS: { label: string; key: string; type: "text" | "select" | "multi-select" | "date" | "textarea" | "number" | "path"; options?: string[] }[] = [
        { label: "Order ID", key: "orderId", type: "text" },
        { label: "Due Date", key: "dueDate", type: "date" },
        { label: "Notes", key: "notes", type: "textarea" },
        { label: "Quantity", key: "quantity", type: "number" },
        { label: "Archive Path", key: "archivePath", type: "path" },
    ];

    // Build workspace-driven fields in sortOrder
    const wsFields: typeof SYSTEM_FIXED_FIELDS = (workspaceFields || []).map(wf => {
        const baseType = wf.fieldType as string;
        if (baseType === "multi-select") {
            return { label: wf.label, key: wf.key, type: "multi-select" as const, options: allFieldValues[wf.key] || [] };
        } else if (baseType === "select") {
            return { label: wf.label, key: wf.key, type: "select" as const, options: allFieldValues[wf.key] || [] };
        } else if (baseType === "number") {
            return { label: wf.label, key: wf.key, type: "number" as const };
        } else if (baseType === "path") {
            return { label: wf.label, key: wf.key, type: "path" as const };
        } else {
            return { label: wf.label, key: wf.key, type: "textarea" as const };
        }
    });

    // Combine: workspace fields first (in sortOrder), then system fixed fields not already covered
    const wsKeys = new Set(wsFields.map(f => f.key));
    const editableFields = [
        ...wsFields,
        ...SYSTEM_FIXED_FIELDS.filter(f => !wsKeys.has(f.key)),
    ];

    const readOnlyFields = [
        { label: "Created", value: formatDateDisplay(part.createdAt) },
        { label: "Last Synced", value: formatDateDisplay(part.syncedAt) },
    ];

    const renderEditableField = (field: typeof editableFields[number]) => {
        // For custom fields, read from part.customFields; for built-in, read from part directly
        const isCustom = !isBuiltInFieldKey(field.key) && !['partName', 'orderId', 'notes', 'archivePath', 'dueDate', 'quantity', 'status'].includes(field.key);
        const rawValue = isCustom
            ? (part.customFields?.[field.key] ?? null)
            : (part as unknown as Record<string, unknown>)[field.key];

        if (field.type === "multi-select") {
            // Multi-select: tag/chip UI
            const currentTags: string[] = Array.isArray(rawValue) ? rawValue : (rawValue ? [String(rawValue)] : []);
            const availableOptions = (field.options || []).filter(opt => !currentTags.includes(opt));
            return (
                <div className="detail-field" key={field.key}>
                    <span className="field-label">{field.label}</span>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4, alignItems: "center", minHeight: 28 }}>
                        {currentTags.map((tag) => (
                            <span
                                key={tag}
                                style={{
                                    display: "inline-flex", alignItems: "center", gap: 4,
                                    background: "var(--accent-blue)", color: "#fff",
                                    borderRadius: 4, padding: "2px 8px", fontSize: 11, fontWeight: 600, cursor: "pointer",
                                }}
                                title="Click to remove"
                                onClick={() => {
                                    const next = currentTags.filter(t => t !== tag);
                                    saveField(field.key, next.length > 0 ? next : null);
                                }}
                            >
                                {tag} <span style={{ opacity: 0.7 }}>✕</span>
                            </span>
                        ))}
                        {availableOptions.length > 0 && (
                            <select
                                value=""
                                onChange={(e) => {
                                    if (e.target.value) {
                                        const next = [...currentTags, e.target.value];
                                        saveField(field.key, next);
                                    }
                                }}
                                style={{
                                    fontSize: 11, padding: "2px 6px", background: "var(--bg-tertiary)",
                                    color: "var(--text-secondary)", border: "1px solid var(--border)",
                                    borderRadius: 4, cursor: "pointer",
                                }}
                            >
                                <option value="">+ Add</option>
                                {availableOptions.map(opt => (
                                    <option key={opt} value={opt}>{opt}</option>
                                ))}
                            </select>
                        )}
                        {currentTags.length === 0 && availableOptions.length === 0 && (
                            <span style={{ color: "var(--text-muted)", fontSize: 12 }}>No options defined</span>
                        )}
                    </div>
                </div>
            );
        }

        const value = rawValue != null ? String(rawValue) : null;

        if (field.type === "select") {
            return (
                <div className="detail-field" key={field.key}>
                    <span className="field-label">{field.label}</span>
                    <div className="select-wrapper editable-select">
                        <select
                            value={value || ""}
                            onChange={(e) => saveField(field.key, e.target.value || null)}
                        >
                            <option value="">— Not set —</option>
                            {field.options!.map((opt) => (
                                <option key={opt} value={opt}>
                                    {opt.charAt(0).toUpperCase() + opt.slice(1)}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            );
        }

        if (field.type === "date") {
            const displayVal = formatDateDisplay(value);
            if (editingField === field.key) {
                return (
                    <div className="detail-field" key={field.key}>
                        <span className="field-label">{field.label}</span>
                        <Input
                            ref={editRef as React.RefObject<HTMLInputElement>}
                            type="date"
                            className="edit-input"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={() => handleEditBlur(field.key)}
                            onKeyDown={(e) => handleEditKeyDown(e, field.key)}
                        />
                    </div>
                );
            }
            return (
                <div className="detail-field" key={field.key}>
                    <span className="field-label">{field.label}</span>
                    <span
                        className={`field-value editable ${!value ? "missing" : ""}`}
                        onClick={() => startEditing(field.key, toInputDate(value))}
                        title="Click to edit"
                    >
                        {displayVal === "—" ? "Not set" : displayVal}
                        <span className="edit-icon">✎</span>
                    </span>
                </div>
            );
        }

        if (field.type === "textarea") {
            if (editingField === field.key) {
                return (
                    <div className="detail-field detail-field-column" key={field.key}>
                        <span className="field-label">{field.label}</span>
                        <Textarea
                            ref={editRef as React.RefObject<HTMLTextAreaElement>}
                            className="edit-input"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={() => handleEditBlur(field.key)}
                            rows={3}
                        />
                    </div>
                );
            }
            return (
                <div className="detail-field detail-field-column" key={field.key}>
                    <span className="field-label">{field.label}</span>
                    <span
                        className={`field-value editable ${!value ? "missing" : ""}`}
                        onClick={() => startEditing(field.key, value)}
                        title="Click to edit"
                    >
                        {value || "Not set"}
                        <span className="edit-icon">✎</span>
                    </span>
                </div>
            );
        }

        // number
        if (field.type === "number") {
            if (editingField === field.key) {
                return (
                    <div className="detail-field" key={field.key}>
                        <span className="field-label">{field.label}</span>
                        <Input
                            ref={editRef as React.RefObject<HTMLInputElement>}
                            type="number"
                            className="edit-input"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={() => handleEditBlur(field.key)}
                            onKeyDown={(e) => handleEditKeyDown(e, field.key)}
                        />
                    </div>
                );
            }
            return (
                <div className="detail-field" key={field.key}>
                    <span className="field-label">{field.label}</span>
                    <span
                        className={`field-value editable ${!value ? "missing" : ""}`}
                        onClick={() => startEditing(field.key, value)}
                        title="Click to edit"
                    >
                        {value || "Not set"}
                        <span className="edit-icon">✎</span>
                    </span>
                </div>
            );
        }

        // path — clickable link to file path or URL
        if (field.type === "path") {
            if (editingField === field.key) {
                return (
                    <div className="detail-field" key={field.key}>
                        <span className="field-label">{field.label}</span>
                        <Input
                            ref={editRef as React.RefObject<HTMLInputElement>}
                            type="text"
                            className="edit-input"
                            placeholder="Path or URL…"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={() => handleEditBlur(field.key)}
                            onKeyDown={(e) => handleEditKeyDown(e, field.key)}
                        />
                    </div>
                );
            }
            const isUrl = value && (value.startsWith("http://") || value.startsWith("https://"));
            return (
                <div className="detail-field" key={field.key}>
                    <span className="field-label">{field.label}</span>
                    {value ? (
                        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <a
                                href={isUrl ? value : "#"}
                                target={isUrl ? "_blank" : undefined}
                                rel={isUrl ? "noopener noreferrer" : undefined}
                                onClick={(e) => {
                                    if (!isUrl) {
                                        e.preventDefault();
                                        // Open in Finder
                                        fetch(`/api/parts/${part.id}/reveal`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ path: value }) }).catch(() => { });
                                    }
                                }}
                                style={{ color: "var(--accent-blue)", cursor: "pointer", fontSize: 12, wordBreak: "break-all", textDecoration: "underline" }}
                                title={isUrl ? "Open in browser" : "Open in Finder"}
                            >
                                🔗 {value}
                            </a>
                            <span
                                className="edit-icon"
                                style={{ cursor: "pointer", opacity: 0.5 }}
                                onClick={() => startEditing(field.key, value)}
                                title="Edit"
                            >✎</span>
                        </span>
                    ) : (
                        <span
                            className="field-value editable missing"
                            onClick={() => startEditing(field.key, "")}
                            title="Click to set path"
                        >
                            Not set
                            <span className="edit-icon">✎</span>
                        </span>
                    )}
                </div>
            );
        }

        // text
        if (editingField === field.key) {
            return (
                <div className="detail-field" key={field.key} style={{ position: "relative" }}>
                    <span className="field-label">{field.label}</span>
                    <div className="edit-input-wrapper">
                        <Input
                            ref={editRef as React.RefObject<HTMLInputElement>}
                            type="text"
                            className="edit-input"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={() => {
                                // Small delay to allow clicking suggestions
                                setTimeout(() => handleEditBlur(field.key), 150);
                            }}
                            onKeyDown={(e) => handleEditKeyDown(e, field.key)}
                        />
                        {suggestions.length > 0 && (
                            <div className="autocomplete-dropdown">
                                {suggestions.map((s, i) => (
                                    <div
                                        key={i}
                                        className="autocomplete-item"
                                        onMouseDown={(e) => {
                                            e.preventDefault();
                                            setEditValue(s);
                                            setSuggestions([]);
                                            saveField(field.key, s);
                                        }}
                                    >
                                        {s}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            );
        }
        return (
            <div className="detail-field" key={field.key}>
                <span className="field-label">{field.label}</span>
                <span
                    className={`field-value editable ${!value ? "missing" : ""}`}
                    onClick={() => startEditing(field.key, value)}
                    title="Click to edit"
                >
                    {value || "Not set"}
                    <span className="edit-icon">✎</span>
                </span>
            </div>
        );
    };

    return (
        <div className="right-panel fade-in">
            <div className="panel-header">
                <div style={{ display: "flex", alignItems: "center", gap: 10, overflow: "hidden", minWidth: 0, flex: 1 }}>
                    <span className="unique-id-badge">{part.uniqueId}</span>
                    {part._isShared && part._originWorkspace && (
                        <div
                            className="shared-origin-indicator"
                            title={`Shared from ${part._originWorkspace.name}`}
                            onClick={() => onJumpToSource?.(part._originWorkspace!.id, part.id, part.projectId)}
                            style={{
                                display: "flex", alignItems: "center", gap: 5,
                                padding: "2px 8px", borderRadius: 12,
                                background: "rgba(255,100,0,0.1)",
                                border: "1px solid rgba(255,100,0,0.3)",
                                cursor: "pointer", transition: "all 0.2s",
                                fontSize: 11, fontWeight: 600, color: "var(--accent-orange, #ff6400)"
                            }}
                        >
                            <span style={{ background: part._originWorkspace.color, width: 6, height: 6, borderRadius: "50%" }} />
                            ↗ Shared from {part._originWorkspace.name}
                        </div>
                    )}
                    {/* Jump to Shared Remote Workspaces */}
                    {(() => {
                        const sharedTo = (part as any)._sharedTo || [];
                        if (sharedTo.length === 0) return null;

                        return sharedTo.map((s: any) => (
                            <div
                                key={s.workspaceId}
                                className="shared-remote-indicator"
                                title={`Shared to ${s.workspaceName}`}
                                onClick={() => onJumpToSource?.(s.workspaceId, part.id, s.targetProjectId || "")}
                                style={{
                                    display: "flex", alignItems: "center", gap: 5,
                                    padding: "2px 8px", borderRadius: 12,
                                    background: "rgba(86, 156, 214, 0.1)",
                                    border: "1px solid rgba(86, 156, 214, 0.3)",
                                    cursor: "pointer", transition: "all 0.2s",
                                    fontSize: 11, fontWeight: 600, color: "#569cd6"
                                }}
                            >
                                <span style={{ background: s.workspaceColor, width: 6, height: 6, borderRadius: "50%" }} />
                                ↘ Shared to {s.workspaceName}
                            </div>
                        ));
                    })()}
                    {editingField === "partName" ? (
                        <Input
                            ref={editRef as React.RefObject<HTMLInputElement>}
                            type="text"
                            className="edit-input header-edit"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={() => handleEditBlur("partName")}
                            onKeyDown={(e) => handleEditKeyDown(e, "partName")}
                        />
                    ) : (
                        <h2
                            className="editable-header"
                            onClick={() => startEditing("partName", part.partName)}
                            title={part.partName}
                        >
                            <span className="truncate-text">{part.partName}</span>
                            <span className="edit-icon">✎</span>
                        </h2>
                    )}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                    {saveIndicator && (
                        <span className={`save-indicator ${saveIndicator}`}>
                            {saveIndicator === "saved" ? "✓ Saved" : "✕ Error"}
                        </span>
                    )}
                    <ButtonGroup>
                        {part.revisions && part.revisions.length > 0 && (
                            <Button
                                variant="outline"
                                size="sm"
                                className="btn-grouped"
                                title="Download ZIP of latest files from each category"
                                onClick={async () => {
                                    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
                                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                    const nativeBridge = (window as any).webkit?.messageHandlers?.nativeDownload;
                                    try {
                                        if (isLocal) {
                                            const res = await fetch('/api/save-to-downloads', {
                                                method: 'POST',
                                                headers: { 'Content-Type': 'application/json' },
                                                body: JSON.stringify({ partIds: [part.id] }),
                                            });
                                            if (res.ok) {
                                                setSaveIndicator('saved');
                                                setTimeout(() => setSaveIndicator(null), 2000);
                                            }
                                        } else if (nativeBridge) {
                                            nativeBridge.postMessage({ url: `/api/download?partIds=${part.id}`, filename: `${part.uniqueId}_files.zip` });
                                            setSaveIndicator('saved');
                                            setTimeout(() => setSaveIndicator(null), 2000);
                                        } else {
                                            const iframe = document.createElement('iframe');
                                            iframe.style.display = 'none';
                                            iframe.src = `/api/download?partIds=${part.id}`;
                                            document.body.appendChild(iframe);
                                            setTimeout(() => iframe.remove(), 60000);
                                            setSaveIndicator('saved');
                                            setTimeout(() => setSaveIndicator(null), 2000);
                                        }
                                    } catch {
                                        setSaveIndicator('error');
                                        setTimeout(() => setSaveIndicator(null), 2000);
                                    }
                                }}
                            >
                                ⬇ Download All
                            </Button>
                        )}
                        <Button
                            variant="outline"
                            size="sm"
                            className="btn-grouped"
                            onClick={handleReveal}
                            title="Open folder in Finder"
                        >
                            📂 Reveal
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            className="btn-grouped"
                            onClick={handleDeletePart}
                            title="Delete this part and all its files"
                        >
                            🗑
                        </Button>
                    </ButtonGroup>
                    <Button variant="ghost" size="icon-sm" onClick={onClose} title="Close panel">
                        ✕
                    </Button>
                </div>
            </div>

            <div className="detail-content">
                {/* ── Viewer Section with Tabs ─────────────── */}
                <div className="detail-section">
                    <div
                        className="detail-section-header"
                        onClick={() => toggleSection("viewer")}
                    >
                        <h3>File Preview</h3>
                        <span style={{ color: "var(--text-muted)", fontSize: 11 }}>
                            {expandedSections.viewer ? "▾" : "▸"}
                        </span>
                    </div>
                    {expandedSections.viewer && (
                        <div>
                            {/* Viewer tab strip */}
                            <div className="viewer-tabs">
                                {VIEWER_TABS.map((tab) => {
                                    const count = part.revisions?.filter(
                                        (r) => r.uploadStage === tab.key
                                    ).length || 0;
                                    return (
                                        <button
                                            key={tab.key}
                                            className={`viewer-tab ${activeViewerTab === tab.key ? "active" : ""}`}
                                            onClick={() => setActiveViewerTab(tab.key)}
                                        >
                                            {tab.icon} {tab.label}
                                            {count > 0 && (
                                                <span className="viewer-tab-count">{count}</span>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Viewer content */}
                            {activeViewerTab === "laser_cutting" && fileType === "dxf" ? (
                                <DxfViewer fileUrl={fileUrl} />
                            ) : activeViewerTab === "laser_cutting" || activeViewerTab === "2d_drawing" ? (
                                <DrawingViewer fileUrl={fileUrl} fileType={fileType} />
                            ) : (
                                <ModelViewer fileUrl={fileUrl} fileType={fileType} />
                            )}

                            {/* Revision dropdown for this viewer tab */}
                            {viewerRevisions.length > 1 && (
                                <div style={{ padding: "8px 14px", borderTop: "1px solid var(--border)" }}>
                                    <div className="select-wrapper">
                                        <select
                                            value={selectedRevisionId || ""}
                                            onChange={(e) => setSelectedRevisionId(e.target.value)}
                                        >
                                            {viewerRevisions.map((rev) => (
                                                <option key={rev.id} value={rev.id}>
                                                    v{rev.versionNumber} — {rev.fileName}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            )}
                            {viewerRevisions.length === 0 && (
                                <div style={{ padding: "12px 14px", color: "var(--text-muted)", fontSize: 12 }}>
                                    No {activeViewerTab === "design" ? "design" : activeViewerTab === "solidworks" ? "SolidWorks" : activeViewerTab === "laser_cutting" ? "laser cutting" : "2D drawing"} files uploaded yet.
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* ── Part Details Section — EDITABLE ─────── */}
                <div className="detail-section">
                    <div
                        className="detail-section-header"
                        onClick={() => toggleSection("details")}
                    >
                        <h3>Part Details</h3>
                        <span style={{ color: "var(--text-muted)", fontSize: 11 }}>
                            {expandedSections.details ? "▾" : "▸"}
                        </span>
                    </div>
                    {expandedSections.details && (
                        <div className="detail-section-body">
                            {/* Project Assignment Dropdown */}
                            <div className="detail-field">
                                <span className="field-label">Assigned Project</span>
                                <div className="select-wrapper">
                                    <select
                                        value={part.projectId || ""}
                                        onChange={(e) => handleProjectChange(e.target.value || null)}
                                    >
                                        <option value="">— No Project —</option>
                                        {flatProjects.map((p) => (
                                            <option key={p.id} value={p.id}>
                                                {"\u00A0\u00A0".repeat(p.depth)}{p.depth > 0 ? "└ " : ""}{p.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <Separator className="detail-divider" />
                            {editableFields.map(renderEditableField)}
                            <Separator className="detail-divider" />
                            {readOnlyFields.map((f) => (
                                <div className="detail-field" key={f.label}>
                                    <span className="field-label">{f.label}</span>
                                    <span className={`field-value ${f.value === "—" ? "missing" : ""}`}>
                                        {f.value}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* ── Sharing Section ─────────────────── */}
                {(() => {
                    const sharedTo = (part as PartData & { _sharedTo?: { workspaceId: string; workspaceName: string; workspaceColor: string; sharedAt: string; targetProjectId?: string | null; targetProjectPath?: string | null }[] })._sharedTo;
                    const isShared = (part as PartData & { _isShared?: boolean })._isShared;
                    const originWs = (part as PartData & { _originWorkspace?: { id: string; name: string; color: string } | null })._originWorkspace;
                    const targetProjectPath = (part as PartData & { _targetProjectPath?: string | null })._targetProjectPath;

                    if (!sharedTo?.length && !isShared) return null;

                    const handleUnshare = async (targetWorkspaceId: string) => {
                        if (!confirm("Stop sharing this part to this workspace?")) return;
                        try {
                            const res = await fetch(`/api/parts/${part.id}/share?workspaceId=${targetWorkspaceId}`, { method: "DELETE" });
                            if (res.ok) {
                                fetchPart();
                                onPartUpdated?.();
                            }
                        } catch (err) {
                            console.error("Failed to unshare:", err);
                        }
                    };

                    return (
                        <div className="detail-section">
                            <div
                                className="detail-section-header"
                                onClick={() => toggleSection("sharing")}
                            >
                                <h3>
                                    🔗 Sharing
                                </h3>
                                <span style={{ color: "var(--text-muted)", fontSize: 11 }}>
                                    {expandedSections.sharing !== false ? "▾" : "▸"}
                                </span>
                            </div>
                            {expandedSections.sharing !== false && (
                                <div className="detail-section-body">
                                    {isShared && originWs && (
                                        <div className="sharing-origin">
                                            <span style={{ color: "var(--text-muted)", fontSize: 12 }}>Shared from</span>
                                            <div className="sharing-workspace-tag">
                                                <span className="workspace-dot" style={{ background: originWs.color, width: 8, height: 8 }} />
                                                <span>{originWs.name}</span>
                                            </div>
                                            {targetProjectPath && (
                                                <div className="sharing-project-path">
                                                    <span style={{ color: "var(--text-muted)", fontSize: 11 }}>📁</span>
                                                    <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>{targetProjectPath}</span>
                                                </div>
                                            )}
                                            <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    style={{ fontSize: 11 }}
                                                    onClick={() => {
                                                        if (onJumpToSource && originWs) {
                                                            onJumpToSource(originWs.id, part.id, part.projectId);
                                                        }
                                                    }}
                                                    title="Switch to the source workspace and select this part"
                                                >
                                                    ↗ View in source workspace
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    style={{ fontSize: 11, color: "var(--accent-red)", borderColor: "var(--accent-red)" }}
                                                    onClick={() => activeWorkspaceId && handleUnshare(activeWorkspaceId)}
                                                    title="Remove this shared part from your workspace"
                                                >
                                                    ✕ Stop Sharing
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                    {sharedTo && sharedTo.length > 0 && (
                                        <div className="sharing-targets">
                                            <span style={{ color: "var(--text-muted)", fontSize: 12 }}>Shared to</span>
                                            {sharedTo.map((s) => (
                                                <div key={s.workspaceId} className="sharing-target-entry">
                                                    <div className="sharing-workspace-tag">
                                                        <span className="workspace-dot" style={{ background: s.workspaceColor, width: 8, height: 8 }} />
                                                        <span>{s.workspaceName}</span>
                                                        {s.targetProjectPath && (
                                                            <span className="sharing-path-separator">→</span>
                                                        )}
                                                        {s.targetProjectPath && (
                                                            <span className="sharing-path-text">{s.targetProjectPath}</span>
                                                        )}
                                                        <button
                                                            className="btn-unshare"
                                                            onClick={() => handleUnshare(s.workspaceId)}
                                                            title={`Stop sharing to ${s.workspaceName}`}
                                                        >
                                                            ✕
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })()}

                {/* ── Revisions Section with Category Tabs ── */}
                <div className="detail-section">
                    <div
                        className="detail-section-header"
                        onClick={() => toggleSection("revisions")}
                    >
                        <h3>
                            Revisions{" "}
                            <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>
                                ({part.revisions?.length || 0})
                            </span>
                        </h3>
                        <span style={{ color: "var(--text-muted)", fontSize: 11 }}>
                            {expandedSections.revisions ? "▾" : "▸"}
                        </span>
                    </div>
                    {expandedSections.revisions && (
                        <div className="detail-section-body">
                            {/* Category tabs */}
                            <div className="revision-tabs">
                                {allRevisionTabs.map((tab) => {
                                    const count = tab.key === "all"
                                        ? (part.revisions?.length || 0)
                                        : (part.revisions?.filter((r) => r.uploadStage === tab.key).length || 0);
                                    // Hide tabs with 0 items (except "all")
                                    if (tab.key !== "all" && count === 0) return null;
                                    return (
                                        <button
                                            key={tab.key}
                                            className={`revision-tab ${activeRevisionTab === tab.key ? "active" : ""}`}
                                            onClick={() => setActiveRevisionTab(tab.key)}
                                        >
                                            {tab.label}
                                            <span className="revision-tab-count">{count}</span>
                                        </button>
                                    );
                                })}
                            </div>

                            {filteredRevisions.length === 0 ? (
                                <p style={{ color: "var(--text-muted)", fontSize: 12, padding: "8px 0" }}>
                                    No revisions{activeRevisionTab !== "all" ? ` in ${getStageName(activeRevisionTab)}` : ""}. Upload a file below.
                                </p>
                            ) : (
                                <ul className="revision-list">
                                    {filteredRevisions.map((rev) => (
                                        <li
                                            key={rev.id}
                                            className="revision-item"
                                            style={{
                                                background:
                                                    rev.id === selectedRevisionId
                                                        ? "rgba(86, 156, 214, 0.1)"
                                                        : "transparent",
                                                cursor: "pointer",
                                                padding: "8px 4px",
                                                borderRadius: "var(--radius-sm)",
                                            }}
                                            onClick={() => {
                                                setSelectedRevisionId(rev.id);
                                                // Also switch viewer tab to match this revision's stage
                                                if (rev.uploadStage === "design" || rev.uploadStage === "solidworks" || rev.uploadStage === "2d_drawing" || rev.uploadStage === "laser_cutting") {
                                                    setActiveViewerTab(rev.uploadStage);
                                                }
                                            }}
                                        >
                                            <div className="rev-info">
                                                <span className="rev-version">v{rev.versionNumber}</span>
                                                <span className="rev-file">{rev.fileName}</span>
                                                <Badge
                                                    className={`rev-stage ${getStageClass(rev.uploadStage)}`}
                                                >
                                                    {getStageName(rev.uploadStage)}
                                                </Badge>
                                                <button
                                                    className="btn-download-rev"
                                                    onClick={async (e) => {
                                                        e.stopPropagation();
                                                        const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
                                                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                                        const nativeBridge = (window as any).webkit?.messageHandlers?.nativeDownload;
                                                        try {
                                                            if (isLocal) {
                                                                await fetch('/api/save-to-downloads', {
                                                                    method: 'POST',
                                                                    headers: { 'Content-Type': 'application/json' },
                                                                    body: JSON.stringify({ partIds: [part.id] }),
                                                                });
                                                            } else if (nativeBridge) {
                                                                nativeBridge.postMessage({ url: `/api/files/${part.id}/${rev.fileName}?download=1`, filename: rev.fileName });
                                                            } else {
                                                                const iframe = document.createElement('iframe');
                                                                iframe.style.display = 'none';
                                                                iframe.src = `/api/files/${part.id}/${rev.fileName}?download=1`;
                                                                document.body.appendChild(iframe);
                                                                setTimeout(() => iframe.remove(), 60000);
                                                            }
                                                        } catch { /* ignore */ }
                                                    }}
                                                    title={`Download ${rev.fileName}`}
                                                >
                                                    ⬇
                                                </button>
                                                <button
                                                    className="btn-delete-rev"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDeleteRevision(rev.id, rev.fileName);
                                                    }}
                                                    title={`Delete ${rev.fileName}`}
                                                >
                                                    ✕
                                                </button>
                                            </div>
                                            <span className="rev-date">{formatDateDisplay(rev.createdAt)}</span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    )}
                </div>

                {/* ── Upload Section ──────────────────────── */}
                <div className="detail-section">
                    <div
                        className="detail-section-header"
                        onClick={() => toggleSection("upload")}
                    >
                        <h3>Upload New Revision</h3>
                        <span style={{ color: "var(--text-muted)", fontSize: 11 }}>
                            {expandedSections.upload ? "▾" : "▸"}
                        </span>
                    </div>
                    {expandedSections.upload && (
                        <div className="detail-section-body">
                            <FileUpload
                                partId={part.id}
                                onUploadComplete={fetchPart}
                                customStages={customStages}
                                onAddCustomStage={(name) => setCustomStages((prev) => [...prev, name])}
                            />
                        </div>
                    )}
                </div>
            </div>
        </div >
    );
}
