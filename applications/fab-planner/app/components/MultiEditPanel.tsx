"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import type { PartData } from "./PartsTable";
import type { ProjectNode } from "./ProjectTree";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Textarea } from "@/app/components/ui/textarea";
import { Separator } from "@/app/components/ui/separator";
import { ScrollArea } from "@/app/components/ui/scroll-area";

interface WorkspaceField {
    id: string;
    key: string;
    label: string;
    fieldType: string;
    sortOrder?: number;
}

interface MultiEditPanelProps {
    partIds: string[];
    onClose: () => void;
    onPartsUpdated?: () => void;
    workspaceFields?: WorkspaceField[];
}

// System fields that always appear (not driven by workspace fields)
const SYSTEM_FIXED_FIELDS: { label: string; key: string; type: string }[] = [
    { label: "Order ID", key: "orderId", type: "text" },
    { label: "Notes", key: "notes", type: "textarea" },
    { label: "Quantity", key: "quantity", type: "number" },
];

export default function MultiEditPanel({ partIds, onClose, onPartsUpdated, workspaceFields }: MultiEditPanelProps) {
    const [parts, setParts] = useState<PartData[]>([]);
    const [loading, setLoading] = useState(true);
    const [saveIndicator, setSaveIndicator] = useState<string | null>(null);
    const [allProjects, setAllProjects] = useState<ProjectNode[]>([]);
    const [allFieldValues, setAllFieldValues] = useState<Record<string, string[]>>({});

    // Fetch all selected parts
    useEffect(() => {
        setLoading(true);
        Promise.all(
            partIds.map((id) => fetch(`/api/parts/${id}`).then((r) => r.json()))
        )
            .then((data) => setParts(data))
            .catch((err) => console.error("Failed to fetch parts:", err))
            .finally(() => setLoading(false));
    }, [partIds]);

    // Fetch projects + field values
    useEffect(() => {
        fetch("/api/projects")
            .then((r) => r.json())
            .then(setAllProjects)
            .catch(() => { });
        fetch("/api/field-values")
            .then((r) => r.json())
            .then((data: Record<string, string[]>) => {
                if (data && typeof data === 'object') setAllFieldValues(data);
            })
            .catch(() => { });
    }, []);

    // Build editable fields from workspace definitions (same ordering as DetailPanel)
    const editableFields = useMemo(() => {
        const wsFields = (workspaceFields || []).map(wf => {
            const ft = wf.fieldType;
            if (ft === "select") return { label: wf.label, key: wf.key, type: "select" as const, options: allFieldValues?.[wf.key] || [] };
            if (ft === "multi-select") return { label: wf.label, key: wf.key, type: "multi-select" as const, options: allFieldValues?.[wf.key] || [] };
            if (ft === "number") return { label: wf.label, key: wf.key, type: "number" as const, options: [] as string[] };
            if (ft === "path") return { label: wf.label, key: wf.key, type: "path" as const, options: [] as string[] };
            return { label: wf.label, key: wf.key, type: "textarea" as const, options: [] as string[] };
        });
        const wsKeys = new Set(wsFields.map(f => f.key));
        return [
            ...wsFields,
            ...SYSTEM_FIXED_FIELDS.filter(f => !wsKeys.has(f.key)).map(f => ({ ...f, options: [] as string[] })),
        ];
    }, [workspaceFields, allFieldValues]);

    // Flatten projects for dropdown
    const flatProjects = useMemo(() => {
        const flatten = (nodes: ProjectNode[], depth = 0): { id: string; name: string; depth: number }[] => {
            const result: { id: string; name: string; depth: number }[] = [];
            for (const n of nodes) {
                result.push({ id: n.id, name: n.name, depth });
                if (n.children) result.push(...flatten(n.children, depth + 1));
            }
            return result;
        };
        return flatten(allProjects);
    }, [allProjects]);

    // Compute merged values: same across all → show value, different → null (Mixed)
    const mergedValues = useMemo(() => {
        if (parts.length === 0) return {};
        const result: Record<string, string | null> = {};
        for (const field of editableFields) {
            const isCustom = !["orderId", "notes", "quantity", "status", "material", "client", "hospital", "who", "type", "fabMechanism", "archivePath", "dueDate"].includes(field.key);
            const values = parts.map((p) => {
                if (isCustom) {
                    const cv = p.customFields?.[field.key];
                    if (Array.isArray(cv)) return cv.join(", ");
                    return cv != null ? String(cv) : "";
                }
                const val = (p as unknown as Record<string, unknown>)[field.key];
                return val != null ? String(val) : "";
            });
            const allSame = values.every((v) => v === values[0]);
            result[field.key] = allSame ? values[0] : null;
        }
        // Project assignment
        const projectIds = parts.map((p) => p.projectId || "");
        result.projectId = projectIds.every((v) => v === projectIds[0]) ? projectIds[0] : null;
        return result;
    }, [parts, editableFields]);

    // Save a field for all selected parts
    const saveBatchField = useCallback(async (field: string, value: string | null) => {
        try {
            const res = await fetch("/api/parts/batch", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ids: partIds,
                    updates: { [field]: value },
                }),
            });
            if (res.ok) {
                setSaveIndicator("saved");
                setTimeout(() => setSaveIndicator(null), 1500);
                // Refresh parts data
                const refreshed = await Promise.all(
                    partIds.map((id) => fetch(`/api/parts/${id}`).then((r) => r.json()))
                );
                setParts(refreshed);
                onPartsUpdated?.();
            } else {
                setSaveIndicator("error");
                setTimeout(() => setSaveIndicator(null), 2000);
            }
        } catch (err) {
            console.error("Batch update failed:", err);
            setSaveIndicator("error");
            setTimeout(() => setSaveIndicator(null), 2000);
        }
    }, [partIds, onPartsUpdated]);

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

    return (
        <div className="right-panel fade-in">
            <div className="panel-header">
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span className="unique-id-badge" style={{ background: "var(--accent-blue)", color: "#fff" }}>
                        {partIds.length}
                    </span>
                    <h2>parts selected</h2>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {saveIndicator && (
                        <span className={`save-indicator ${saveIndicator}`}>
                            {saveIndicator === "saved" ? "✓ Saved" : "✕ Error"}
                        </span>
                    )}
                    <Button variant="ghost" size="icon-sm" onClick={onClose} title="Close panel">
                        ✕
                    </Button>
                </div>
            </div>

            <div className="detail-content">
                {/* Part list summary */}
                <div className="detail-section">
                    <div className="detail-section-header">
                        <h3>Selected Parts</h3>
                    </div>
                    <ScrollArea className="detail-section-body" style={{ maxHeight: 120 }}>
                        {parts.map((p) => (
                            <div key={p.id} className="detail-field" style={{ padding: "2px 0" }}>
                                <span className="field-label" style={{ fontFamily: "monospace", fontSize: 11 }}>
                                    {p.uniqueId}
                                </span>
                                <span className="field-value" style={{ fontSize: 12 }}>
                                    {p.partName}
                                </span>
                            </div>
                        ))}
                    </ScrollArea>
                </div>

                {/* Project Assignment */}
                <div className="detail-section">
                    <div className="detail-section-header">
                        <h3>Batch Edit</h3>
                    </div>
                    <div className="detail-section-body">
                        <div className="detail-field">
                            <span className="field-label">Project</span>
                            <div className="select-wrapper editable-select">
                                <select
                                    value={mergedValues.projectId ?? "__mixed__"}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        if (val === "__mixed__") return;
                                        saveBatchField("projectId", val || null);
                                    }}
                                >
                                    {mergedValues.projectId === null && (
                                        <option value="__mixed__">— Mixed —</option>
                                    )}
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

                        {/* Editable fields — driven by workspace definitions */}
                        {editableFields.map((field) => {
                            const merged = mergedValues[field.key];
                            const isMixed = merged === null;

                            // Select fields — dropdown with options from settings
                            if (field.type === "select") {
                                const options = field.options || [];
                                return (
                                    <div className="detail-field" key={field.key}>
                                        <span className="field-label">{field.label}</span>
                                        <div className="select-wrapper editable-select">
                                            <select
                                                value={isMixed ? "__mixed__" : (merged || "")}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    if (val === "__mixed__") return;
                                                    saveBatchField(field.key, val || null);
                                                }}
                                            >
                                                {isMixed && <option value="__mixed__">— Mixed —</option>}
                                                <option value="">— Not set —</option>
                                                {options.map((opt) => (
                                                    <option key={opt} value={opt}>
                                                        {opt.charAt(0).toUpperCase() + opt.slice(1)}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                );
                            }

                            // Multi-select — dropdown to add values
                            if (field.type === "multi-select") {
                                const options = field.options || [];
                                return (
                                    <div className="detail-field" key={field.key}>
                                        <span className="field-label">{field.label}</span>
                                        <div className="select-wrapper editable-select">
                                            <select
                                                value={isMixed ? "__mixed__" : (merged || "")}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    if (val === "__mixed__") return;
                                                    saveBatchField(field.key, val || null);
                                                }}
                                            >
                                                {isMixed && <option value="__mixed__">— Mixed —</option>}
                                                <option value="">— Not set —</option>
                                                {options.map((opt) => (
                                                    <option key={opt} value={opt}>
                                                        {opt.charAt(0).toUpperCase() + opt.slice(1)}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                );
                            }

                            // Textarea
                            if (field.type === "textarea") {
                                return (
                                    <div className="detail-field detail-field-column" key={field.key}>
                                        <span className="field-label">{field.label}</span>
                                        <Textarea
                                            className="edit-input"
                                            rows={2}
                                            placeholder={isMixed ? "— Mixed —" : "Not set"}
                                            defaultValue={merged || ""}
                                            onBlur={(e) => {
                                                const val = e.target.value;
                                                if (val !== (merged || "")) {
                                                    saveBatchField(field.key, val || null);
                                                }
                                            }}
                                        />
                                    </div>
                                );
                            }

                            // Text, number, path — all render as text input in batch mode
                            return (
                                <div className="detail-field" key={field.key}>
                                    <span className="field-label">{field.label}</span>
                                    <Input
                                        type={field.type === "number" ? "number" : "text"}
                                        className="edit-input"
                                        placeholder={isMixed ? "— Mixed —" : "Not set"}
                                        defaultValue={merged || ""}
                                        key={`${field.key}-${merged}`}
                                        onBlur={(e) => {
                                            const val = e.target.value;
                                            if (val !== (merged || "")) {
                                                saveBatchField(field.key, val || null);
                                            }
                                        }}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter") {
                                                (e.target as HTMLInputElement).blur();
                                            }
                                        }}
                                    />
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}
