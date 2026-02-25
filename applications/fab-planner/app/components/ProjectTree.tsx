"use client";

import { useState, useCallback, useRef } from "react";
import ContextMenu, { type MenuAction } from "./ContextMenu";
import { Button } from "@/app/components/ui/button";

export interface ProjectNode {
    id: string;
    name: string;
    parentId: string | null;
    starred: boolean;
    sortOrder: number;
    children: ProjectNode[];
    _count: { parts: number };
}

interface ProjectTreeProps {
    projects: ProjectNode[];
    selectedProjectId: string | null;
    onSelectProject: (id: string | null) => void;
    onRefresh: () => void;
    onFilesDropped?: (files: FileList, projectId: string | null) => void;
    activeWorkspaceId?: string;
}

export default function ProjectTree({
    projects,
    selectedProjectId,
    onSelectProject,
    onRefresh,
    onFilesDropped,
    activeWorkspaceId,
}: ProjectTreeProps) {
    const [expanded, setExpanded] = useState<Record<string, boolean>>({});
    const [contextMenu, setContextMenu] = useState<{ x: number; y: number; project: ProjectNode } | null>(null);
    const [renamingId, setRenamingId] = useState<string | null>(null);
    const [renameValue, setRenameValue] = useState("");
    const [dragOverNodeId, setDragOverNodeId] = useState<string | null>(null);
    const expandTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const nodeDragCounters = useRef<Record<string, number>>({});

    const toggleExpand = (id: string) => {
        setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
    };

    const handleContextMenu = useCallback((e: React.MouseEvent, project: ProjectNode) => {
        e.preventDefault();
        e.stopPropagation();
        setContextMenu({ x: e.clientX, y: e.clientY, project });
    }, []);

    const handleAddProject = useCallback(async (parentId?: string) => {
        const name = prompt(parentId ? "Subproject name:" : "New project name:");
        if (!name?.trim()) return;
        try {
            await fetch("/api/projects", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: name.trim(), parentId: parentId || null, workspaceId: activeWorkspaceId }),
            });
            if (parentId) {
                setExpanded((prev) => ({ ...prev, [parentId]: true }));
            }
            onRefresh();
        } catch (err) {
            console.error("Failed to add project:", err);
        }
    }, [onRefresh, activeWorkspaceId]);

    const handleRename = useCallback(async (id: string, newName: string) => {
        if (!newName.trim()) {
            setRenamingId(null);
            return;
        }
        try {
            await fetch("/api/projects", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id, name: newName.trim() }),
            });
            onRefresh();
        } catch (err) {
            console.error("Failed to rename:", err);
        }
        setRenamingId(null);
    }, [onRefresh]);

    const handleDelete = useCallback(async (id: string, name: string) => {
        if (!confirm(`Delete project "${name}" and all its subprojects?`)) return;
        try {
            await fetch(`/api/projects?id=${id}`, { method: "DELETE" });
            if (selectedProjectId === id) onSelectProject(null);
            onRefresh();
        } catch (err) {
            console.error("Failed to delete:", err);
        }
    }, [onRefresh, selectedProjectId, onSelectProject]);

    const handleToggleStar = useCallback(async (id: string, currentStarred: boolean) => {
        try {
            await fetch("/api/projects", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id, starred: !currentStarred }),
            });
            onRefresh();
        } catch (err) {
            console.error("Failed to toggle star:", err);
        }
    }, [onRefresh]);

    const getContextActions = (project: ProjectNode): MenuAction[] => [
        { label: "Rename", icon: "✏️", onClick: () => { setRenamingId(project.id); setRenameValue(project.name); } },
        { label: "Add Subproject", icon: "📁", onClick: () => handleAddProject(project.id) },
        { label: project.starred ? "Unstar" : "Star", icon: project.starred ? "★" : "☆", onClick: () => handleToggleStar(project.id, project.starred) },
        { label: "Delete", icon: "🗑️", danger: true, onClick: () => handleDelete(project.id, project.name) },
    ];

    // ── Per-node drag handlers ──────────────────────
    const handleNodeDragEnter = useCallback((e: React.DragEvent, nodeId: string, hasChildren: boolean) => {
        e.preventDefault();
        e.stopPropagation();
        if (!e.dataTransfer.types.includes("Files")) return;

        // Track enter/leave count per node to avoid flicker
        nodeDragCounters.current[nodeId] = (nodeDragCounters.current[nodeId] || 0) + 1;
        setDragOverNodeId(nodeId);

        // Auto-expand collapsed folders after 600ms hover
        if (expandTimerRef.current) clearTimeout(expandTimerRef.current);
        if (hasChildren) {
            expandTimerRef.current = setTimeout(() => {
                setExpanded((prev) => ({ ...prev, [nodeId]: true }));
            }, 600);
        }
    }, []);

    const handleNodeDragLeave = useCallback((e: React.DragEvent, nodeId: string) => {
        e.preventDefault();
        e.stopPropagation();
        nodeDragCounters.current[nodeId] = (nodeDragCounters.current[nodeId] || 1) - 1;
        if (nodeDragCounters.current[nodeId] <= 0) {
            nodeDragCounters.current[nodeId] = 0;
            if (dragOverNodeId === nodeId) {
                setDragOverNodeId(null);
            }
            if (expandTimerRef.current) {
                clearTimeout(expandTimerRef.current);
                expandTimerRef.current = null;
            }
        }
    }, [dragOverNodeId]);

    const handleNodeDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
    }, []);

    const handleNodeDrop = useCallback((e: React.DragEvent, projectId: string | null) => {
        e.preventDefault();
        e.stopPropagation();
        setDragOverNodeId(null);
        nodeDragCounters.current = {};
        if (expandTimerRef.current) {
            clearTimeout(expandTimerRef.current);
            expandTimerRef.current = null;
        }
        if (e.dataTransfer.files.length > 0 && onFilesDropped) {
            onFilesDropped(e.dataTransfer.files, projectId);
        }
    }, [onFilesDropped]);

    const renderNode = (node: ProjectNode, depth: number = 0) => {
        const isExpanded = expanded[node.id] ?? false;
        const hasChildren = node.children && node.children.length > 0;
        const isSelected = selectedProjectId === node.id;
        const isRenaming = renamingId === node.id;
        const partCount = node._count?.parts ?? 0;
        const isDropTarget = dragOverNodeId === node.id;

        return (
            <div key={node.id} className="tree-node-wrapper">
                <div
                    className={`tree-node ${isSelected ? "selected" : ""} ${isDropTarget ? "drop-target" : ""}`}
                    style={{ paddingLeft: 12 + depth * 16 }}
                    onClick={() => onSelectProject(isSelected ? null : node.id)}
                    onContextMenu={(e) => handleContextMenu(e, node)}
                    onDragEnter={(e) => handleNodeDragEnter(e, node.id, hasChildren)}
                    onDragLeave={(e) => handleNodeDragLeave(e, node.id)}
                    onDragOver={handleNodeDragOver}
                    onDrop={(e) => handleNodeDrop(e, node.id)}
                >
                    <span
                        className="tree-chevron"
                        onClick={(e) => {
                            e.stopPropagation();
                            if (hasChildren) toggleExpand(node.id);
                        }}
                        style={{ visibility: hasChildren ? "visible" : "hidden" }}
                    >
                        {isExpanded ? "▾" : "▸"}
                    </span>

                    <span className="tree-icon">{hasChildren ? "📁" : "📄"}</span>

                    {isRenaming ? (
                        <input
                            className="tree-rename-input"
                            value={renameValue}
                            onChange={(e) => setRenameValue(e.target.value)}
                            onBlur={() => handleRename(node.id, renameValue)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") handleRename(node.id, renameValue);
                                if (e.key === "Escape") setRenamingId(null);
                            }}
                            autoFocus
                            onClick={(e) => e.stopPropagation()}
                        />
                    ) : (
                        <span className="tree-label">{node.name}</span>
                    )}

                    {partCount > 0 && (
                        <span className="tree-count">{partCount}</span>
                    )}

                    <span
                        className={`tree-star ${node.starred ? "active" : ""}`}
                        onClick={(e) => {
                            e.stopPropagation();
                            handleToggleStar(node.id, node.starred);
                        }}
                        title={node.starred ? "Unstar" : "Star"}
                    >
                        {node.starred ? "★" : "☆"}
                    </span>
                </div>

                {isExpanded && hasChildren && (
                    <div className="tree-children">
                        {node.children.map((child) => renderNode(child, depth + 1))}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="project-tree">
            <div className="tree-header">
                <span className="tree-title">Projects</span>
                <button
                    className="btn-tree-add"
                    onClick={() => handleAddProject()}
                    title="Add new project"
                >
                    +
                </button>
            </div>

            <div className="tree-body">
                {projects.length === 0 ? (
                    <div className="tree-empty">
                        <p>No projects yet</p>
                        <Button variant="ghost" size="sm" onClick={() => handleAddProject()}>
                            + Create Project
                        </Button>
                    </div>
                ) : (
                    <>
                        <div
                            className={`tree-node ${selectedProjectId === null ? "selected" : ""} ${dragOverNodeId === "__all__" ? "drop-target" : ""}`}
                            style={{ paddingLeft: 12 }}
                            onClick={() => onSelectProject(null)}
                            onDragEnter={(e) => handleNodeDragEnter(e, "__all__", false)}
                            onDragLeave={(e) => handleNodeDragLeave(e, "__all__")}
                            onDragOver={handleNodeDragOver}
                            onDrop={(e) => handleNodeDrop(e, null)}
                        >
                            <span className="tree-chevron" style={{ visibility: "hidden" }}>▸</span>
                            <span className="tree-icon">📋</span>
                            <span className="tree-label">All Parts</span>
                        </div>
                        {projects.map((p) => renderNode(p))}
                    </>
                )}
            </div>

            {contextMenu && (
                <ContextMenu
                    x={contextMenu.x}
                    y={contextMenu.y}
                    actions={getContextActions(contextMenu.project)}
                    onClose={() => setContextMenu(null)}
                />
            )}
        </div>
    );
}
