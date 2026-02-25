"use client";

import { useEffect, useRef, useState, useCallback, type MutableRefObject } from "react";
import type { PartData } from "@/app/components/PartsTable";
import { Separator } from "@/app/components/ui/separator";
import { flattenProjects } from "@/app/lib/projectUtils";

export interface MenuAction {
    label: string;
    icon?: string;
    danger?: boolean;
    onClick: () => void;
}

// Project tree node type
export interface ProjectNode {
    id: string;
    name: string;
    parentId: string | null;
    starred: boolean;
    sortOrder: number;
    children: ProjectNode[];
    _count: { parts: number };
}

// Workspace type
interface WorkspaceData {
    id: string;
    name: string;
    slug: string;
    color: string;
}

type ContextMenuProps =
    { x: number; y: number; onClose: () => void } & (
        | {
            // Generic actions mode (for ProjectTree context menus)
            actions: MenuAction[];
            part?: undefined;
            parts?: undefined;
            projects?: undefined;
            onDelete?: undefined;
            onRename?: undefined;
            onMoveTo?: undefined;
            onDownload?: undefined;
            onShare?: undefined;
            onUnshare?: undefined;
            workspaces?: undefined;
            activeWorkspaceId?: undefined;
            onBulkDelete?: undefined;
            onBulkMoveTo?: undefined;
            onBulkDownload?: undefined;
        }
        | {
            // Single part mode (for PartsTable)
            actions?: undefined;
            part: PartData;
            parts?: undefined;
            projects: ProjectNode[];
            onDelete: (part: PartData) => void;
            onRename: (part: PartData) => void;
            onMoveTo: (part: PartData, projectId: string | null) => void;
            onDownload?: (part: PartData) => void;
            onShare?: (partId: string, targetWorkspaceId: string, targetProjectId?: string | null) => void;
            onUnshare?: (partId: string) => void;
            workspaces?: WorkspaceData[];
            activeWorkspaceId?: string;
            onBulkDelete?: undefined;
            onBulkMoveTo?: undefined;
            onBulkDownload?: undefined;
        }
        | {
            // Bulk mode (multiple parts selected)
            actions?: undefined;
            part?: undefined;
            parts: PartData[];
            projects: ProjectNode[];
            onDelete?: undefined;
            onRename?: undefined;
            onMoveTo?: undefined;
            onDownload?: undefined;
            onBulkDelete: (partIds: string[]) => void;
            onBulkMoveTo: (partIds: string[], projectId: string | null) => void;
            onBulkDownload?: (partIds: string[]) => void;
        }
    );

export default function ContextMenu(props: ContextMenuProps) {
    const { x, y, onClose } = props;
    const menuRef = useRef<HTMLDivElement>(null);
    const [showMoveSubmenu, setShowMoveSubmenu] = useState(false);
    const [showShareSubmenu, setShowShareSubmenu] = useState(false);
    const [submenuDirection, setSubmenuDirection] = useState<"right" | "left">("right");
    const [hoveredWorkspaceId, setHoveredWorkspaceId] = useState<string | null>(null);
    const [workspaceProjects, setWorkspaceProjects] = useState<Record<string, ProjectNode[]>>({});

    // Timeout refs for delayed hover — prevents submenu flickering when crossing gaps
    const moveLeaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const shareLeaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const wsLeaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Clear all timers on unmount
    useEffect(() => {
        return () => {
            if (moveLeaveTimer.current) clearTimeout(moveLeaveTimer.current);
            if (shareLeaveTimer.current) clearTimeout(shareLeaveTimer.current);
            if (wsLeaveTimer.current) clearTimeout(wsLeaveTimer.current);
        };
    }, []);

    const delayedHide = (timerRef: MutableRefObject<ReturnType<typeof setTimeout> | null>, fn: () => void) => {
        timerRef.current = setTimeout(fn, 150);
    };
    const cancelHide = (timerRef: MutableRefObject<ReturnType<typeof setTimeout> | null>) => {
        if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    };

    // Close on click outside or Escape
    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                onClose();
            }
        };
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        document.addEventListener("mousedown", handleClick);
        document.addEventListener("keydown", handleKey);
        return () => {
            document.removeEventListener("mousedown", handleClick);
            document.removeEventListener("keydown", handleKey);
        };
    }, [onClose]);

    // Adjust position to stay in viewport — open upward if more space above
    useEffect(() => {
        if (!menuRef.current) return;
        const rect = menuRef.current.getBoundingClientRect();
        const el = menuRef.current;
        // Horizontal: flip left if overflowing right
        if (rect.right > window.innerWidth) {
            el.style.left = `${Math.max(4, x - rect.width)}px`;
            setSubmenuDirection("left");
        }
        // Vertical: if menu overflows bottom, check if more space above
        if (rect.bottom > window.innerHeight) {
            const spaceAbove = y;
            const spaceBelow = window.innerHeight - y;
            if (spaceAbove > spaceBelow && rect.height <= spaceAbove) {
                // Open upward from click point
                el.style.top = `${y - rect.height}px`;
            } else {
                // Clamp to bottom of viewport
                el.style.top = `${Math.max(4, window.innerHeight - rect.height - 8)}px`;
            }
        }
    }, [x, y]);

    // Position submenu: unfolds downward if click near top, upward if click near bottom
    const positionSubmenu = useCallback((el: HTMLDivElement | null) => {
        if (!el) return;
        requestAnimationFrame(() => {
            const rect = el.getBoundingClientRect();
            const parent = el.parentElement;
            if (!parent) return;
            const parentRect = parent.getBoundingClientRect();

            // Horizontal: try right of parent, flip left if doesn't fit
            if (rect.right > window.innerWidth - 8) {
                el.style.left = 'auto';
                el.style.right = '100%';
            }

            // Vertical: direction depends on where user clicked
            const clickInLowerHalf = y > window.innerHeight / 2;
            if (clickInLowerHalf) {
                // Anchor bottom of submenu to bottom of parent item → unfolds upward
                el.style.top = 'auto';
                el.style.bottom = '-4px';
                // If it still overflows top, clamp
                const newRect = el.getBoundingClientRect();
                if (newRect.top < 8) {
                    el.style.bottom = 'auto';
                    el.style.top = `${8 - parentRect.top}px`;
                }
            } else {
                // Anchor top of submenu to top of parent item → unfolds downward (default)
                // If it overflows bottom, pull up
                if (rect.bottom > window.innerHeight - 8) {
                    const overflow = rect.bottom - window.innerHeight + 8;
                    el.style.top = `${-4 - overflow}px`;
                }
            }
        });
    }, [y]);



    // Fetch projects for a workspace on hover
    const fetchWorkspaceProjects = useCallback(async (wsId: string) => {
        if (workspaceProjects[wsId]) return; // Already cached
        try {
            const res = await fetch(`/api/projects?workspaceId=${wsId}`);
            if (res.ok) {
                const data = await res.json();
                setWorkspaceProjects((prev) => ({ ...prev, [wsId]: data }));
            }
        } catch (err) {
            console.error("Failed to fetch workspace projects:", err);
        }
    }, [workspaceProjects]);

    // ─── Generic actions mode (ProjectTree) ───
    if (props.actions) {
        return (
            <div ref={menuRef} className="context-menu" style={{ top: y, left: x }}>
                {props.actions.map((action, i) => (
                    <button
                        key={i}
                        className={`context-menu-item ${action.danger ? "danger" : ""}`}
                        onClick={() => { action.onClick(); onClose(); }}
                    >
                        {action.icon && <span className="context-menu-icon">{action.icon}</span>}
                        {action.label}
                    </button>
                ))}
            </div>
        );
    }

    // ─── Bulk mode (multiple parts) ───
    if (props.parts && props.parts.length > 1) {
        const { parts, projects, onBulkDelete, onBulkMoveTo } = props;
        const partIds = parts.map((p) => p.id);
        const flatProjects = flattenProjects(projects);

        return (
            <div ref={menuRef} className="context-menu" style={{ top: y, left: x }}>
                <div className="context-menu-header">
                    <span className="context-menu-id" style={{ background: "var(--accent-blue)", color: "#fff" }}>
                        {parts.length}
                    </span>
                    <span className="context-menu-name">parts selected</span>
                </div>
                <Separator className="context-menu-divider" />

                <div
                    className="context-menu-item has-submenu"
                    onMouseEnter={() => { cancelHide(moveLeaveTimer); setShowMoveSubmenu(true); }}
                    onMouseLeave={() => delayedHide(moveLeaveTimer, () => setShowMoveSubmenu(false))}
                >
                    <span className="context-menu-icon">📁</span>
                    Move All to Project
                    <span className="context-menu-arrow">▸</span>

                    {showMoveSubmenu && (
                        <div ref={positionSubmenu} className="context-submenu">
                            <button
                                className="context-menu-item"
                                onClick={() => { onClose(); onBulkMoveTo(partIds, null); }}
                            >
                                — No Project —
                            </button>
                            <Separator className="context-menu-divider" />
                            {flatProjects.map((p) => (
                                <button
                                    key={p.id}
                                    className="context-menu-item"
                                    onClick={() => { onClose(); onBulkMoveTo(partIds, p.id); }}
                                    style={{ paddingLeft: `${12 + p.depth * 14}px` }}
                                >
                                    {p.depth > 0 ? "└ " : ""}{p.name}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <button
                    className="context-menu-item"
                    onClick={() => { onClose(); props.onBulkDownload?.(partIds); }}
                >
                    <span className="context-menu-icon">⬇</span>
                    Download All Files
                </button>

                <Separator className="context-menu-divider" />

                <button
                    className="context-menu-item danger"
                    onClick={() => { onClose(); onBulkDelete(partIds); }}
                >
                    <span className="context-menu-icon">🗑</span>
                    Delete {parts.length} Parts
                </button>
            </div>
        );
    }

    // ─── Single part mode (PartsTable) ───
    const part = props.part;
    if (!part) return null;
    const { projects, onDelete, onRename, onMoveTo } = props;
    const flatProjects = flattenProjects(projects);

    const isShared = (part as PartData & { _isShared?: boolean })._isShared;
    const workspaces = (props as { workspaces?: WorkspaceData[] }).workspaces;
    const activeWorkspaceId = (props as { activeWorkspaceId?: string }).activeWorkspaceId;
    const onShareFn = (props as { onShare?: (partId: string, targetWorkspaceId: string, targetProjectId?: string | null) => void }).onShare;
    const onUnshareFn = (props as { onUnshare?: (partId: string) => void }).onUnshare;
    const onDownloadFn = (props as { onDownload?: (part: PartData) => void }).onDownload;

    return (
        <div ref={menuRef} className="context-menu" style={{ top: y, left: x }}>
            <div className="context-menu-header">
                <span className="context-menu-id">{part.uniqueId}</span>
                <span className="context-menu-name">{part.partName}</span>
            </div>
            <Separator className="context-menu-divider" />

            <button
                className="context-menu-item"
                onClick={() => { onClose(); onRename(part); }}
            >
                <span className="context-menu-icon">✏️</span>
                Rename
            </button>

            <div
                className="context-menu-item has-submenu"
                onMouseEnter={() => { cancelHide(moveLeaveTimer); setShowMoveSubmenu(true); }}
                onMouseLeave={() => delayedHide(moveLeaveTimer, () => setShowMoveSubmenu(false))}
            >
                <span className="context-menu-icon">📁</span>
                Move to Project
                <span className="context-menu-arrow">▸</span>

                {showMoveSubmenu && (
                    <div ref={positionSubmenu} className="context-submenu">
                        <button
                            className={`context-menu-item ${!part.projectId ? "active" : ""}`}
                            onClick={() => { onClose(); onMoveTo(part, null); }}
                        >
                            — No Project —
                        </button>
                        <Separator className="context-menu-divider" />
                        {flatProjects.map((p) => (
                            <button
                                key={p.id}
                                className={`context-menu-item ${part.projectId === p.id ? "active" : ""}`}
                                onClick={() => { onClose(); onMoveTo(part, p.id); }}
                                style={{ paddingLeft: `${12 + p.depth * 14}px` }}
                            >
                                {p.depth > 0 ? "└ " : ""}{p.name}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            <button
                className="context-menu-item"
                onClick={() => { onClose(); onDownloadFn?.(part); }}
            >
                <span className="context-menu-icon">⬇</span>
                Download Files
            </button>

            <button
                className="context-menu-item"
                onClick={() => {
                    // Build project path by walking up the tree
                    let pathSegments: string[] = [];
                    if (part.projectId && projects) {
                        // Flatten tree to find project and ancestors
                        const findPath = (nodes: ProjectNode[] | undefined, targetId: string): string[] | null => {
                            if (!Array.isArray(nodes)) return null;
                            for (const node of nodes) {
                                if (node.id === targetId) return [node.name];
                                const childPath = findPath(node.children, targetId);
                                if (childPath) return [node.name, ...childPath];
                            }
                            return null;
                        };
                        pathSegments = findPath(projects, part.projectId) || [];
                    }
                    const params = new URLSearchParams({ partId: part.uniqueId });
                    if (pathSegments.length > 0) {
                        params.set("path", pathSegments.join("/"));
                    }
                    const url = `${window.location.origin}/?${params.toString()}`;
                    navigator.clipboard.writeText(url);
                    onClose();
                }}
            >
                <span className="context-menu-icon">🔗</span>
                Copy Link
            </button>

            {/* Share submenu */}
            {workspaces && workspaces.length > 1 && (
                <>
                    {isShared ? (
                        <button
                            className="context-menu-item"
                            onClick={() => {
                                onClose();
                                onUnshareFn?.(part.id);
                            }}
                        >
                            <span className="context-menu-icon">❌</span>
                            Unshare from this workspace
                        </button>
                    ) : (
                        <div
                            className="context-menu-item has-submenu"
                            onMouseEnter={() => {
                                cancelHide(shareLeaveTimer);
                                setShowShareSubmenu(true);
                                // Auto-fetch all workspace projects on open
                                workspaces.filter(w => w.id !== activeWorkspaceId).forEach(w => {
                                    fetchWorkspaceProjects(w.id);
                                });
                            }}
                            onMouseLeave={() => delayedHide(shareLeaveTimer, () => { setShowShareSubmenu(false); })}
                        >
                            <span className="context-menu-icon">↗️</span>
                            Share to…
                            <span className="context-menu-arrow">▸</span>

                            {showShareSubmenu && (
                                <div
                                    ref={positionSubmenu}
                                    className="context-submenu"
                                    style={{ minWidth: 240 }}
                                    onMouseEnter={() => cancelHide(shareLeaveTimer)}
                                    onMouseLeave={() => delayedHide(shareLeaveTimer, () => { setShowShareSubmenu(false); })}
                                >
                                    {workspaces
                                        .filter((w) => w.id !== activeWorkspaceId)
                                        .map((w, idx) => {
                                            const projects = workspaceProjects[w.id];
                                            const flatProj = flattenProjects(projects);
                                            return (
                                                <div key={w.id}>
                                                    {idx > 0 && <Separator className="context-menu-divider" />}
                                                    {/* Workspace header */}
                                                    <div className="context-menu-item" style={{ fontWeight: 600, pointerEvents: 'none', color: 'var(--text-muted)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                                        <span className="workspace-dot" style={{ background: w.color, width: 8, height: 8, borderRadius: "50%", display: "inline-block", marginRight: 6 }} />
                                                        {w.name}
                                                    </div>
                                                    {/* Root option */}
                                                    <button
                                                        className="context-menu-item"
                                                        style={{ paddingLeft: 28, fontSize: 12 }}
                                                        onClick={() => {
                                                            onClose();
                                                            onShareFn?.(part.id, w.id, null);
                                                        }}
                                                    >
                                                        📋 Root (no project)
                                                    </button>
                                                    {/* All projects flat */}
                                                    {projects && flatProj.map((p) => (
                                                        <button
                                                            key={p.id}
                                                            className="context-menu-item"
                                                            style={{ paddingLeft: `${28 + p.depth * 14}px`, fontSize: 12 }}
                                                            onClick={() => {
                                                                onClose();
                                                                onShareFn?.(part.id, w.id, p.id);
                                                            }}
                                                        >
                                                            {p.depth > 0 ? "└ " : "📁 "}{p.name}
                                                        </button>
                                                    ))}
                                                    {!projects && (
                                                        <div className="context-menu-item" style={{ color: "var(--text-muted)", fontSize: 11, pointerEvents: "none", paddingLeft: 28 }}>
                                                            Loading…
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                </div>
                            )}
                        </div>
                    )}
                </>
            )}

            <Separator className="context-menu-divider" />

            <button
                className="context-menu-item danger"
                onClick={() => { onClose(); onDelete(part); }}
            >
                <span className="context-menu-icon">🗑</span>
                Delete Part
            </button>
        </div>
    );
}
