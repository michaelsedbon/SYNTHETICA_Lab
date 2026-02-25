"use client";

import { useState, useEffect, useCallback, useRef } from "react";

export interface WorkspaceData {
    id: string;
    name: string;
    slug: string;
    color: string;
    visibility?: string; // "open" | "protected"
    createdAt: string;
    _count?: { parts: number; projects: number; sharedParts: number };
}

const LS_KEY = "fab-planner-active-workspace";

export function useWorkspace() {
    const [workspaces, setWorkspaces] = useState<WorkspaceData[]>([]);
    const [activeWorkspaceId, setActiveWorkspaceIdState] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [isOwner, setIsOwner] = useState(false);
    const initializedRef = useRef(false);

    // ── Check owner status on mount ──
    const checkOwnerStatus = useCallback(async () => {
        try {
            const res = await fetch("/api/auth/owner");
            if (res.ok) {
                const data = await res.json();
                setIsOwner(data.isOwner);
            }
        } catch {
            setIsOwner(false);
        }
    }, []);

    const fetchWorkspaces = useCallback(async () => {
        try {
            const res = await fetch("/api/workspaces");
            if (!res.ok) throw new Error("Failed to fetch workspaces");
            const data: WorkspaceData[] = await res.json();
            setWorkspaces(data);

            // On first load, restore from localStorage or pick default
            if (!initializedRef.current && data.length > 0) {
                const stored = localStorage.getItem(LS_KEY);
                const valid = data.find((w) => w.id === stored);
                const defaultWs = data.find((w) => w.slug === "default") || data[0];
                setActiveWorkspaceIdState(valid ? valid.id : defaultWs.id);
                initializedRef.current = true;
            }
            // If active workspace was removed (e.g. became protected), switch to first available
            if (initializedRef.current && data.length > 0) {
                const stillValid = data.find((w) => w.id === activeWorkspaceId);
                if (!stillValid) {
                    const fallback = data.find((w) => w.slug === "default") || data[0];
                    setActiveWorkspaceIdState(fallback.id);
                    localStorage.setItem(LS_KEY, fallback.id);
                }
            }
        } catch (err) {
            console.error("Failed to fetch workspaces:", err);
        } finally {
            setLoading(false);
        }
    }, [activeWorkspaceId]);

    useEffect(() => {
        checkOwnerStatus();
        fetchWorkspaces();
    }, [checkOwnerStatus, fetchWorkspaces]);

    const setActiveWorkspaceId = useCallback((id: string) => {
        setActiveWorkspaceIdState(id);
        localStorage.setItem(LS_KEY, id);
    }, []);

    const createWorkspace = useCallback(async (name: string, color?: string) => {
        const res = await fetch("/api/workspaces", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, color }),
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || "Failed to create workspace");
        }
        const ws = await res.json();
        await fetchWorkspaces();
        return ws as WorkspaceData;
    }, [fetchWorkspaces]);

    const updateWorkspace = useCallback(async (id: string, data: { name?: string; color?: string; visibility?: string }) => {
        const res = await fetch(`/api/workspaces/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error("Failed to update workspace");
        await fetchWorkspaces();
    }, [fetchWorkspaces]);

    const deleteWorkspace = useCallback(async (id: string) => {
        const res = await fetch(`/api/workspaces/${id}`, { method: "DELETE" });
        if (!res.ok) throw new Error("Failed to delete workspace");
        // Switch to default if we deleted the active workspace
        if (activeWorkspaceId === id) {
            const defaultWs = workspaces.find((w) => w.slug === "default");
            if (defaultWs) setActiveWorkspaceId(defaultWs.id);
        }
        await fetchWorkspaces();
    }, [fetchWorkspaces, activeWorkspaceId, setActiveWorkspaceId, workspaces]);

    // ── Owner auth actions ──
    const loginAsOwner = useCallback(async (token: string): Promise<boolean> => {
        try {
            const res = await fetch("/api/auth/owner", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token }),
            });
            if (res.ok) {
                setIsOwner(true);
                await fetchWorkspaces(); // re-fetch to include protected workspaces
                return true;
            }
            return false;
        } catch {
            return false;
        }
    }, [fetchWorkspaces]);

    const logoutOwner = useCallback(async () => {
        try {
            await fetch("/api/auth/owner", { method: "DELETE" });
            setIsOwner(false);
            await fetchWorkspaces(); // re-fetch to hide protected workspaces
        } catch {
            console.error("Logout failed");
        }
    }, [fetchWorkspaces]);

    const activeWorkspace = workspaces.find((w) => w.id === activeWorkspaceId) || null;

    return {
        workspaces,
        activeWorkspaceId,
        activeWorkspace,
        loading,
        isOwner,
        setActiveWorkspaceId,
        createWorkspace,
        updateWorkspace,
        deleteWorkspace,
        fetchWorkspaces,
        loginAsOwner,
        logoutOwner,
        checkOwnerStatus,
    };
}
