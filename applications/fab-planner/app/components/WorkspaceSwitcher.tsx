"use client";

import { useState } from "react";
import type { WorkspaceData } from "@/app/lib/useWorkspace";
import { Button } from "@/app/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
} from "@/app/components/ui/dropdown-menu";

interface Props {
    workspaces: WorkspaceData[];
    activeWorkspace: WorkspaceData | null;
    onSwitch: (id: string) => void;
    onCreate: (name: string, color?: string) => Promise<WorkspaceData>;
    onUpdate: (id: string, data: { name?: string; color?: string }) => Promise<void>;
    onDelete: (id: string) => Promise<void>;
}

const COLORS = [
    "#569cd6", "#4ec9b0", "#ce9178", "#dcdcaa",
    "#c586c0", "#9cdcfe", "#d16969", "#6a9955",
    "#b5cea8", "#d4d4d4", "#f44747", "#e2c08d",
];

export default function WorkspaceSwitcher({
    workspaces, activeWorkspace, onSwitch, onCreate, onUpdate, onDelete,
}: Props) {
    const [showCreate, setShowCreate] = useState(false);
    const [newName, setNewName] = useState("");
    const [newColor, setNewColor] = useState(COLORS[0]);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editName, setEditName] = useState("");
    const [editColor, setEditColor] = useState("");

    const handleCreate = async () => {
        if (!newName.trim()) return;
        try {
            const ws = await onCreate(newName.trim(), newColor);
            onSwitch(ws.id);
            setNewName("");
            setNewColor(COLORS[0]);
            setShowCreate(false);
        } catch (err) {
            alert(err instanceof Error ? err.message : "Failed to create workspace");
        }
    };

    const handleUpdate = async (id: string) => {
        if (!editName.trim()) return;
        try {
            await onUpdate(id, { name: editName.trim(), color: editColor });
            setEditingId(null);
        } catch (err) {
            alert(err instanceof Error ? err.message : "Failed to update workspace");
        }
    };

    const handleDelete = async (id: string) => {
        const ws = workspaces.find((w) => w.id === id);
        if (!ws) return;
        if (!confirm(`Delete workspace "${ws.name}"? Parts will be moved to the default workspace.`)) return;
        await onDelete(id);
    };

    return (
        <div className="workspace-switcher">
            <DropdownMenu onOpenChange={(open) => { if (!open) { setShowCreate(false); setEditingId(null); } }}>
                <DropdownMenuTrigger asChild>
                    <button
                        className="workspace-switcher-btn"
                        title="Switch workspace"
                    >
                        <span
                            className="workspace-dot"
                            style={{ background: activeWorkspace?.color || "#569cd6" }}
                        />
                        <span className="workspace-name">{activeWorkspace?.name || "Workspace"}</span>
                        <span className="workspace-chevron">▼</span>
                    </button>
                </DropdownMenuTrigger>

                <DropdownMenuContent align="start" sideOffset={4} className="workspace-dropdown">
                    <DropdownMenuLabel>Workspaces</DropdownMenuLabel>
                    <DropdownMenuSeparator />

                    {workspaces.map((ws) => (
                        <div key={ws.id}>
                            {editingId === ws.id ? (
                                <div className="workspace-edit-row" style={{ padding: "6px 8px" }} onClick={(e) => e.stopPropagation()}>
                                    <input
                                        className="workspace-edit-input"
                                        value={editName}
                                        onChange={(e) => setEditName(e.target.value)}
                                        onKeyDown={(e) => e.key === "Enter" && handleUpdate(ws.id)}
                                        autoFocus
                                    />
                                    <div className="workspace-color-row">
                                        {COLORS.map((c) => (
                                            <button
                                                key={c}
                                                className={`workspace-color-swatch ${c === editColor ? "selected" : ""}`}
                                                style={{ background: c }}
                                                onClick={() => setEditColor(c)}
                                            />
                                        ))}
                                    </div>
                                    <div className="workspace-edit-actions">
                                        <Button variant="ghost" size="xs" onClick={() => handleUpdate(ws.id)}>Save</Button>
                                        <Button variant="ghost" size="xs" onClick={() => setEditingId(null)}>Cancel</Button>
                                    </div>
                                </div>
                            ) : (
                                <DropdownMenuItem
                                    className={`workspace-item ${ws.id === activeWorkspace?.id ? "active" : ""}`}
                                    onSelect={() => onSwitch(ws.id)}
                                >
                                    <span className="workspace-dot" style={{ background: ws.color }} />
                                    <span className="workspace-item-name">{ws.name}</span>
                                    {ws._count && (
                                        <span className="workspace-item-count">
                                            {ws._count.parts + ws._count.sharedParts}
                                        </span>
                                    )}
                                    <div className="workspace-item-actions" onClick={(e) => e.stopPropagation()}>
                                        <button
                                            className="workspace-action-btn"
                                            title="Edit"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                setEditingId(ws.id);
                                                setEditName(ws.name);
                                                setEditColor(ws.color);
                                            }}
                                        >
                                            ✏️
                                        </button>
                                        {ws.slug !== "default" && (
                                            <button
                                                className="workspace-action-btn"
                                                title="Delete"
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    handleDelete(ws.id);
                                                }}
                                            >
                                                🗑
                                            </button>
                                        )}
                                    </div>
                                </DropdownMenuItem>
                            )}
                        </div>
                    ))}

                    <DropdownMenuSeparator />

                    {showCreate ? (
                        <div className="workspace-create-form" onClick={(e) => e.stopPropagation()}>
                            <input
                                className="workspace-create-input"
                                placeholder="Workspace name…"
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                                autoFocus
                            />
                            <div className="workspace-color-row">
                                {COLORS.map((c) => (
                                    <button
                                        key={c}
                                        className={`workspace-color-swatch ${c === editColor ? "selected" : ""}`}
                                        style={{ background: c }}
                                        onClick={() => setNewColor(c)}
                                    />
                                ))}
                            </div>
                            <div className="workspace-create-actions">
                                <Button variant="default" size="xs" onClick={handleCreate}>Create</Button>
                                <Button variant="ghost" size="xs" onClick={() => setShowCreate(false)}>Cancel</Button>
                            </div>
                        </div>
                    ) : (
                        <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setShowCreate(true); }}>
                            + New Workspace
                        </DropdownMenuItem>
                    )}
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
}
