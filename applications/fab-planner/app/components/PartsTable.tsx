"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ALL_TABLE_COLUMNS } from "./SettingsView";
import { type AllBadgeColors, getBadgeStyle } from "@/app/lib/badgeColors";
import { type WorkspaceFieldDef } from "@/app/page";
import { showToast } from "@/app/components/Toaster";

export interface PartData {
    id: string;
    uniqueId: string;
    partName: string;
    status: string;
    material: string | null;
    orderId: string | null;
    archivePath: string | null;
    project: string | null;
    projectId: string | null;
    client: string | null;
    hospital: string | null;
    notes: string | null;
    who: string | null;
    type: string | null;
    quantity: number;
    fabMechanism: string | null;
    priorityOrder: number;
    dueDate: string | null;
    syncedAt: string | null;
    createdAt: string;
    updatedAt: string;
    completedAt: string | null;
    revisions?: RevisionData[];
    customFields?: Record<string, string | string[]>;
    _isShared?: boolean;
    _originWorkspace?: { id: string; name: string; color: string } | null;
    _sharedTo?: { workspaceId: string; workspaceName: string; workspaceColor: string; sharedAt: string; targetProjectId: string | null; targetProjectPath: string | null }[];
}

export interface RevisionData {
    id: string;
    fileName: string;
    filePath: string;
    fileType: string;
    versionNumber: number;
    uploadStage: string;
    uploadedBy: string;
    createdAt: string;
}

function getStatusBadgeClass(status: string) {
    const s = status?.toLowerCase().replace(/\s+/g, "_") || "new";
    return `status-badge status-${s}`;
}

function formatDate(dateStr: string | null) {
    if (!dateStr) return "—";
    try {
        const d = new Date(dateStr);
        return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
    } catch {
        return "—";
    }
}

// Editable fields and their types
const EDITABLE_FIELDS: Record<string, "text" | "number" | "date"> = {
    partName: "text",
    status: "text",
    material: "text",
    client: "text",
    who: "text",
    quantity: "number",
    dueDate: "date",
    fabMechanism: "text",
    type: "text",
    hospital: "text",
};

// Render a specific column cell
function renderColumn(key: string, part: PartData, badgeColors: AllBadgeColors) {
    const muted = <span style={{ color: "var(--text-muted)" }}>—</span>;
    const secondary = { color: "var(--text-secondary)", fontSize: 12 } as const;

    switch (key) {
        case "status": {
            const color = badgeColors.status[part.status?.toLowerCase()];
            const style = color ? getBadgeStyle(color) : {
                fontSize: 11, fontWeight: 600 as const, padding: "2px 8px", borderRadius: 4,
                background: "rgba(255,255,255,0.06)", color: "#9da5b4",
                border: "1px solid rgba(255,255,255,0.12)", whiteSpace: "nowrap" as const, display: "inline-block" as const,
            };
            return (
                <div key={key}>
                    <span style={style}>{part.status}</span>
                </div>
            );
        }
        case "material":
        case "client":
        case "who":
        case "type":
        case "hospital":
        case "fabMechanism": {
            const val = part[key as keyof PartData] as string | null;
            if (!val) return <div key={key} style={secondary}>{muted}</div>;
            const fieldColor = (badgeColors[key] || {})[val.toLowerCase()];
            const badgeStyle = fieldColor ? getBadgeStyle(fieldColor) : {
                fontSize: 11, fontWeight: 600 as const, padding: "2px 8px", borderRadius: 4,
                background: "rgba(255,255,255,0.06)", color: "#9da5b4",
                border: "1px solid rgba(255,255,255,0.12)", whiteSpace: "nowrap" as const, display: "inline-block" as const,
            };
            return (
                <div key={key}>
                    <span style={badgeStyle} title={val}>{val}</span>
                </div>
            );
        }
        case "dueDate":
            return (
                <div key={key} style={{ fontSize: 11, color: "var(--text-muted)" }}>
                    {formatDate(part.dueDate)}
                </div>
            );
        case "files":
            return (
                <div key={key} className="file-indicators">
                    {part.revisions?.some((r) => r.uploadStage === "design") && (
                        <span className="file-indicator design" title="Has design file">📐</span>
                    )}
                    {part.revisions?.some((r) => r.uploadStage === "cnc") && (
                        <span className="file-indicator cnc" title="Has CNC file">⚙️</span>
                    )}
                    {(!part.revisions || part.revisions.length === 0) && (
                        <span className="file-indicator none" title="No files">—</span>
                    )}
                </div>
            );
        case "quantity":
            return (
                <div key={key} style={{ fontSize: 12, color: "var(--text-secondary)", textAlign: "center" }}>
                    {part.quantity ?? 1}
                </div>
            );
        default: {
            // Custom field — look up from part.customFields
            const rawVal = part.customFields?.[key];
            const displayVal = Array.isArray(rawVal) ? rawVal.join(", ") : (rawVal || "");
            if (!displayVal) return <div key={key} style={secondary}>{muted}</div>;

            // Check for badge colors defined for this field
            const fieldColors = badgeColors[key];
            if (fieldColors) {
                // For multi-value (comma-separated), render each as a badge
                const values = Array.isArray(rawVal) ? rawVal : [displayVal];
                return (
                    <div key={key} style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
                        {values.map((v, i) => {
                            const color = fieldColors[v.toLowerCase()];
                            const style = color ? getBadgeStyle(color) : {
                                fontSize: 11, fontWeight: 600 as const, padding: "2px 8px", borderRadius: 4,
                                background: "rgba(255,255,255,0.06)", color: "#9da5b4",
                                border: "1px solid rgba(255,255,255,0.12)", whiteSpace: "nowrap" as const, display: "inline-block" as const,
                            };
                            return <span key={i} style={style} title={v}>{v}</span>;
                        })}
                    </div>
                );
            }
            return (
                <div key={key} style={secondary} title={displayVal}>
                    {displayVal}
                </div>
            );
        }
    }
}

// Default column widths for building dynamic grid
const DEFAULT_COLUMN_WIDTHS: Record<string, number> = {
    uniqueId: 72,
    partName: 250,
    status: 110,
    material: 100,
    dueDate: 55,
    files: 44,
    client: 80,
    quantity: 36,
    who: 60,
    fabMechanism: 100,
    type: 80,
    hospital: 100,
};

const STORAGE_KEY = "fab-planner-col-widths";

function loadColumnWidths(): Record<string, number> {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) return { ...DEFAULT_COLUMN_WIDTHS, ...JSON.parse(saved) };
    } catch { /* ignore */ }
    return { ...DEFAULT_COLUMN_WIDTHS };
}

function saveColumnWidths(widths: Record<string, number>) {
    try {
        // Only save overrides
        const overrides: Record<string, number> = {};
        for (const [k, v] of Object.entries(widths)) {
            if (v !== DEFAULT_COLUMN_WIDTHS[k]) overrides[k] = v;
        }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
    } catch { /* ignore */ }
}

export function buildGridTemplate(visibleColumns: string[], colWidths?: Record<string, number>): string {
    const widths = colWidths || DEFAULT_COLUMN_WIDTHS;
    const idWidth = widths["uniqueId"] || 72;
    const nameWidth = widths["partName"] || 250;
    const cols = visibleColumns.map((k) => `${widths[k] || 80}px`);
    return `32px ${idWidth}px ${nameWidth}px ${cols.join(" ")}`;
}

// Fields that should show dropdown suggestions
const SUGGEST_FIELDS = ["status", "material", "client", "who", "fabMechanism", "type", "hospital"];

// ── Inline Edit Cell ────────────────────────
function InlineEditCell({
    value,
    field,
    partId,
    type,
    onSave,
    onCancel,
    suggestions: rawSuggestions,
}: {
    value: string;
    field: string;
    partId: string;
    type: "text" | "number" | "date";
    onSave: (partId: string, field: string, value: string | number | null) => void;
    onCancel: () => void;
    suggestions?: string[];
}) {
    const [editValue, setEditValue] = useState(value);
    const [highlightIdx, setHighlightIdx] = useState(-1);
    const [showDropdown, setShowDropdown] = useState(true);
    const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number; width: number } | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const sizerRef = useRef<HTMLSpanElement>(null);
    const [inputWidth, setInputWidth] = useState<number | undefined>(undefined);

    // Auto-size input to match text content
    useEffect(() => {
        if (sizerRef.current) {
            const w = sizerRef.current.scrollWidth + 24; // 24px padding for cursor + breathing room
            setInputWidth(Math.max(60, Math.min(w, 320)));
        }
    }, [editValue]);

    useEffect(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
    }, []);

    // Calculate fixed position for dropdown whenever input renders
    useEffect(() => {
        if (inputRef.current) {
            const rect = inputRef.current.getBoundingClientRect();
            setDropdownPos({ top: rect.bottom + 2, left: rect.left, width: rect.width });
        }
    }, [editValue, showDropdown]);

    // Build filtered suggestion list:
    // Show all options except exact match; substring matches sort first
    const allSuggestions = (rawSuggestions || []).filter(
        (s) => s.toLowerCase() !== editValue.trim().toLowerCase()
    );
    // Sort: substring matches first, then the rest alphabetically
    const filtered = editValue.trim()
        ? [
            ...allSuggestions.filter((s) => s.toLowerCase().includes(editValue.toLowerCase())),
            ...allSuggestions.filter((s) => !s.toLowerCase().includes(editValue.toLowerCase())),
        ]
        : allSuggestions;
    const hasSuggestions = SUGGEST_FIELDS.includes(field) && showDropdown && filtered.length > 0;

    const handleSave = (val?: string) => {
        const saveVal = val ?? editValue;
        let finalValue: string | number | null = saveVal;
        if (type === "number") finalValue = parseInt(saveVal) || 0;
        if (type === "date" && !saveVal) finalValue = null;
        if (saveVal === value) {
            onCancel();
            return;
        }
        onSave(partId, field, finalValue);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (hasSuggestions) {
            if (e.key === "ArrowDown") {
                e.preventDefault();
                setHighlightIdx((prev) => Math.min(prev + 1, filtered.length - 1));
                return;
            }
            if (e.key === "ArrowUp") {
                e.preventDefault();
                setHighlightIdx((prev) => Math.max(prev - 1, -1));
                return;
            }
            if (e.key === "Enter" && highlightIdx >= 0 && highlightIdx < filtered.length) {
                e.preventDefault();
                handleSave(filtered[highlightIdx]);
                return;
            }
        }
        if (e.key === "Enter") { e.preventDefault(); handleSave(); }
        if (e.key === "Escape") { e.preventDefault(); onCancel(); }
        e.stopPropagation();
    };

    // Scroll highlighted item into view
    useEffect(() => {
        if (highlightIdx >= 0 && dropdownRef.current) {
            const items = dropdownRef.current.querySelectorAll('.inline-suggest-item');
            items[highlightIdx]?.scrollIntoView({ block: 'nearest' });
        }
    }, [highlightIdx]);

    return (
        <>
            {/* Hidden sizer span to measure text width */}
            <span
                ref={sizerRef}
                aria-hidden
                style={{
                    position: "absolute",
                    visibility: "hidden",
                    whiteSpace: "pre",
                    fontSize: "12px",
                    fontFamily: "inherit",
                    padding: "0 6px",
                }}
            >
                {editValue || " "}
            </span>
            <input
                ref={inputRef}
                className="inline-edit-input"
                type={type === "number" ? "text" : type}
                value={editValue}
                style={{ width: inputWidth ? `${inputWidth}px` : undefined }}
                onChange={(e) => {
                    setEditValue(e.target.value);
                    setHighlightIdx(-1);
                    setShowDropdown(true);
                }}
                onBlur={() => {
                    // Small delay to allow clicking suggestions
                    setTimeout(() => handleSave(), 150);
                }}
                onKeyDown={handleKeyDown}
                onClick={(e) => e.stopPropagation()}
            />
            {hasSuggestions && dropdownPos && (
                <div
                    ref={dropdownRef}
                    className="inline-suggest-dropdown"
                    style={{
                        position: "fixed",
                        top: dropdownPos.top,
                        left: dropdownPos.left,
                        width: dropdownPos.width,
                    }}
                >
                    {filtered.map((s, i) => (
                        <div
                            key={i}
                            className={`inline-suggest-item ${i === highlightIdx ? "highlighted" : ""}`}
                            onMouseDown={(e) => {
                                e.preventDefault();
                                handleSave(s);
                            }}
                            onMouseEnter={() => setHighlightIdx(i)}
                        >
                            {s}
                        </div>
                    ))}
                </div>
            )}
        </>
    );
}

// ── Sortable Row ────────────────────────────
function SortablePartRow({
    part,
    isSelected,
    onRowClick,
    onContextMenu,
    onDoubleClick,
    visibleColumns,
    gridTemplate,
    badgeColors,
    editingCell,
    onInlineEdit,
    onCancelEdit,
    fieldValues,
    onJumpToSource,
}: {
    part: PartData;
    isSelected: boolean;
    onRowClick: (e: React.MouseEvent, part: PartData) => void;
    onContextMenu: (e: React.MouseEvent, part: PartData) => void;
    onDoubleClick: (partId: string, field: string) => void;
    visibleColumns: string[];
    gridTemplate: string;
    badgeColors: AllBadgeColors;
    editingCell: { partId: string; field: string } | null;
    onInlineEdit: (partId: string, field: string, value: string | number | null) => void;
    onCancelEdit: () => void;
    fieldValues?: Record<string, string[]>;
    onJumpToSource?: (originWorkspaceId: string, partId: string, projectId?: string | null) => void;
}) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: part.id });
    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        gridTemplateColumns: gridTemplate,
    };

    const isEditing = (field: string) =>
        editingCell?.partId === part.id && editingCell?.field === field;

    const getFieldValue = (field: string): string => {
        const val = (part as unknown as Record<string, unknown>)[field];
        if (val == null) return "";
        if (field === "dueDate" && val) {
            // Format as YYYY-MM-DD for date input
            try { return new Date(val as string).toISOString().split("T")[0]; } catch { return ""; }
        }
        return String(val);
    };

    const renderEditableCell = (key: string) => {
        if (isEditing(key)) {
            return (
                <div key={key} className="inline-edit-wrapper">
                    <InlineEditCell
                        value={getFieldValue(key)}
                        field={key}
                        partId={part.id}
                        type={EDITABLE_FIELDS[key] || "text"}
                        onSave={onInlineEdit}
                        onCancel={onCancelEdit}
                        suggestions={fieldValues?.[key]}
                    />
                </div>
            );
        }
        return (
            <div
                key={key}
                onDoubleClick={(e) => {
                    if (EDITABLE_FIELDS[key]) {
                        e.stopPropagation();
                        onDoubleClick(part.id, key);
                    }
                }}
                className={EDITABLE_FIELDS[key] ? "cell-editable" : ""}
            >
                {renderColumn(key, part, badgeColors)}
            </div>
        );
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`part-row ${isSelected ? "selected" : ""}`}
            data-part-id={part.id}
            onClick={(e) => onRowClick(e, part)}
            onContextMenu={(e) => onContextMenu(e, part)}
        >
            <div className="drag-handle" {...attributes} {...listeners}>
                ⠿
            </div>
            <div className="unique-id-cell">
                <span className="unique-id">{part.uniqueId}</span>
            </div>
            {isEditing("partName") ? (
                <div className="inline-edit-wrapper">
                    <InlineEditCell
                        value={getFieldValue("partName")}
                        field="partName"
                        partId={part.id}
                        type="text"
                        onSave={onInlineEdit}
                        onCancel={onCancelEdit}
                    />
                </div>
            ) : (
                <div
                    className="part-name cell-editable"
                    title={part.partName}
                    onDoubleClick={(e) => { e.stopPropagation(); onDoubleClick(part.id, "partName"); }}
                >
                    {part.partName}
                    {part._isShared && part._originWorkspace && (
                        <span
                            className="shared-origin-tag"
                            title={`Owned by ${part._originWorkspace.name} — click to jump to source`}
                            onClick={(e) => {
                                e.stopPropagation();
                                if (onJumpToSource && part._originWorkspace) {
                                    onJumpToSource(part._originWorkspace.id, part.id, part.projectId);
                                }
                            }}
                            style={{ cursor: onJumpToSource ? "pointer" : undefined }}
                        >
                            <span className="workspace-dot" style={{ background: part._originWorkspace.color, width: 6, height: 6, borderRadius: "50%", display: "inline-block" }} />
                            ↗ {part._originWorkspace.name}
                        </span>
                    )}
                    {part._sharedTo && part._sharedTo.length > 0 && (
                        part._sharedTo.map((s) => (
                            <span
                                key={s.workspaceId}
                                className="shared-remote-tag"
                                title={`Shared to ${s.workspaceName} — click to jump`}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onJumpToSource?.(s.workspaceId, part.id, s.targetProjectId);
                                }}
                                style={{ cursor: "pointer" }}
                            >
                                <span className="workspace-dot" style={{ background: s.workspaceColor, width: 6, height: 6, borderRadius: "50%", display: "inline-block" }} />
                                ↘ {s.workspaceName}
                            </span>
                        ))
                    )}
                </div>
            )}
            {visibleColumns.map((key) => renderEditableCell(key))}
        </div>
    );
}

interface PartsTableProps {
    parts: PartData[];
    selectedPartIds: Set<string>;
    onRowClick: (e: React.MouseEvent, part: PartData) => void;
    onContextMenu: (e: React.MouseEvent, part: PartData) => void;
    visibleColumns: string[];
    badgeColors: AllBadgeColors;
    sortKey: string;
    sortDir: "asc" | "desc";
    onSort: (key: string) => void;
    isFiltered?: boolean;
    onInlineEdit?: (partId: string, field: string, value: string | number | null) => void;
    fieldValues?: Record<string, string[]>;
    autoEditPartId?: string | null;
    onJumpToSource?: (originWorkspaceId: string, partId: string, projectId?: string | null) => void;
    workspaceFields?: WorkspaceFieldDef[];
}

// Map column keys to the actual PartData field used for sorting
const SORT_KEY_MAP: Record<string, string> = {
    status: "status",
    material: "material",
    dueDate: "dueDate",
    client: "client",
    quantity: "quantity",
    who: "who",
    fabMechanism: "fabMechanism",
    type: "type",
    hospital: "hospital",
};

export default function PartsTable({
    parts,
    selectedPartIds,
    onRowClick,
    onContextMenu,
    visibleColumns,
    badgeColors,
    sortKey,
    sortDir,
    onSort,
    isFiltered = false,
    onInlineEdit,
    fieldValues,
    autoEditPartId,
    onJumpToSource,
    workspaceFields = [],
}: PartsTableProps) {
    const [colWidths, setColWidths] = useState<Record<string, number>>(DEFAULT_COLUMN_WIDTHS);
    const [editingCell, setEditingCell] = useState<{ partId: string; field: string } | null>(null);
    const resizingRef = useRef<{ key: string; startX: number; startWidth: number } | null>(null);

    // Load saved column widths on mount
    useEffect(() => {
        setColWidths(loadColumnWidths());
    }, []);

    // Auto-trigger editing for a newly created part
    useEffect(() => {
        if (autoEditPartId) {
            setEditingCell({ partId: autoEditPartId, field: "partName" });
        }
    }, [autoEditPartId]);

    const gridTemplate = buildGridTemplate(visibleColumns, colWidths);

    const colLabelMap = Object.fromEntries(ALL_TABLE_COLUMNS.map((c) => [c.key, c.label]));

    // Column resize handlers
    const handleResizeStart = useCallback((e: React.MouseEvent, key: string) => {
        e.preventDefault();
        e.stopPropagation();
        resizingRef.current = { key, startX: e.clientX, startWidth: colWidths[key] || 80 };

        const onMouseMove = (ev: MouseEvent) => {
            if (!resizingRef.current) return;
            const diff = ev.clientX - resizingRef.current.startX;
            const newWidth = Math.max(30, resizingRef.current.startWidth + diff);
            setColWidths((prev) => ({ ...prev, [resizingRef.current!.key]: newWidth }));
        };

        const onMouseUp = () => {
            window.removeEventListener("mousemove", onMouseMove);
            window.removeEventListener("mouseup", onMouseUp);
            setColWidths((prev) => {
                saveColumnWidths(prev);
                return prev;
            });
            resizingRef.current = null;
        };

        window.addEventListener("mousemove", onMouseMove);
        window.addEventListener("mouseup", onMouseUp);
    }, [colWidths]);

    // Inline edit handlers
    const handleDoubleClick = useCallback((partId: string, field: string) => {
        setEditingCell({ partId, field });
    }, []);

    const handleInlineSave = useCallback(async (partId: string, field: string, value: string | number | null) => {
        setEditingCell(null);
        if (!onInlineEdit) {
            // Fallback: direct API call
            try {
                await fetch(`/api/parts/${partId}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ [field]: value }),
                });
                showToast("Field updated", "success");
            } catch (err) {
                showToast("Update failed", "error");
            }
        } else {
            onInlineEdit(partId, field, value);
        }
    }, [onInlineEdit]);

    const renderHeader = (label: string, sortField: string | null, colKey?: string) => {
        if (!sortField) return <div>{label}</div>;
        const isActive = sortKey === sortField;
        return (
            <div
                className="col-header-sortable"
                onClick={() => onSort(sortField)}
                style={{ cursor: "pointer", userSelect: "none", display: "flex", alignItems: "center", gap: 2, position: "relative" }}
                title={`Sort by ${label}`}
            >
                {label}
                {isActive && (
                    <span style={{ fontSize: 9, opacity: 0.7 }}>
                        {sortDir === "asc" ? " ▲" : " ▼"}
                    </span>
                )}
                {colKey && (
                    <div
                        className="col-resize-handle"
                        onMouseDown={(e) => handleResizeStart(e, colKey)}
                        onClick={(e) => e.stopPropagation()}
                    />
                )}
            </div>
        );
    };

    return (
        <div className="parts-table">
            <div className="parts-table-header" style={{ gridTemplateColumns: gridTemplate }}>
                <div
                    onClick={() => onSort("priorityOrder")}
                    style={{ cursor: "pointer", fontSize: 10, textAlign: "center" }}
                    title="Sort by importance (drag order)"
                >
                    {sortKey === "priorityOrder" ? (sortDir === "asc" ? "▲" : "▼") : "⠿"}
                </div>
                {renderHeader("ID", "uniqueId", "uniqueId")}
                {renderHeader("Part Name", "partName", "partName")}
                {visibleColumns.map((key) => (
                    <div key={key} style={{ position: "relative" }}>
                        {renderHeader(colLabelMap[key] || key, SORT_KEY_MAP[key] || null, key)}
                    </div>
                ))}
            </div>

            {parts.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-icon">{isFiltered ? "🔍" : "📋"}</div>
                    <p>{isFiltered ? "No parts match your search or filters." : "No parts yet. Add a part manually."}</p>
                </div>
            ) : (
                parts.map((part) => (
                    <SortablePartRow
                        key={part.id}
                        part={part}
                        isSelected={selectedPartIds.has(part.id)}
                        onRowClick={onRowClick}
                        onContextMenu={onContextMenu}
                        onDoubleClick={handleDoubleClick}
                        visibleColumns={visibleColumns}
                        gridTemplate={gridTemplate}
                        badgeColors={badgeColors}
                        editingCell={editingCell}
                        onInlineEdit={handleInlineSave}
                        onCancelEdit={() => setEditingCell(null)}
                        fieldValues={fieldValues}
                        onJumpToSource={onJumpToSource}
                    />
                ))
            )}
        </div>
    );
}
