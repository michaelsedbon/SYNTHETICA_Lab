"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import type { PartData } from "@/app/components/PartsTable";
import type { ProjectNode } from "@/app/components/ProjectTree";
import { isManagedField } from "@/lib/constants";

// ── Types ───────────────────────────────────
type Tab = "all" | "pending";
const DONE_STATUSES = ["complete", "done"];

// ── Hook ────────────────────────────────────
export function usePartsData(workspaceId: string | null) {
    // ── Core state ──────────────────────────
    const [parts, setParts] = useState<PartData[]>([]);
    const [loading, setLoading] = useState(true);
    const [projects, setProjects] = useState<ProjectNode[]>([]);
    const [fieldValues, setFieldValues] = useState<Record<string, string[]>>({});

    // ── Tab / project / search state ────────
    const [activeTab, setActiveTab] = useState<Tab>("all");
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
    const [activeStarredTab, setActiveStarredTab] = useState<string | null>(null);

    // ── Sort state ──────────────────────────
    const [sortKey, setSortKey] = useState<string>(() => {
        if (typeof window !== "undefined") return localStorage.getItem("fab-planner-sort-key") || "priorityOrder";
        return "priorityOrder";
    });
    const [sortDir, setSortDir] = useState<"asc" | "desc">(() => {
        if (typeof window !== "undefined") return (localStorage.getItem("fab-planner-sort-dir") as "asc" | "desc") || "asc";
        return "asc";
    });

    useEffect(() => {
        localStorage.setItem("fab-planner-sort-key", sortKey);
    }, [sortKey]);

    useEffect(() => {
        localStorage.setItem("fab-planner-sort-dir", sortDir);
    }, [sortDir]);

    // ── Column filter state ─────────────────
    const [showFilters, setShowFilters] = useState(false);
    const [filterStatus, setFilterStatus] = useState<string>("");
    const [filterMaterial, setFilterMaterial] = useState<string>("");
    const [filterClient, setFilterClient] = useState<string>("");
    const [filterHospital, setFilterHospital] = useState<string>("");

    const hasActiveFilters = !!(filterStatus || filterMaterial || filterClient || filterHospital);

    const clearAllFilters = useCallback(() => {
        setFilterStatus("");
        setFilterMaterial("");
        setFilterClient("");
        setFilterHospital("");
    }, []);

    // ── Fetch functions ─────────────────────
    const fetchFieldValues = useCallback(async () => {
        try {
            const res = await fetch("/api/field-values");
            if (res.ok) setFieldValues(await res.json());
        } catch { /* ignore */ }
    }, []);

    const fetchParts = useCallback(async () => {
        if (!workspaceId) return;
        try {
            const res = await fetch(`/api/parts?workspaceId=${workspaceId}`);
            if (!res.ok) throw new Error("Failed to fetch");
            const data = await res.json();
            setParts(data);
        } catch (err) {
            console.error("Failed to fetch parts:", err);
        } finally {
            setLoading(false);
        }
    }, [workspaceId]);

    const fetchProjects = useCallback(async () => {
        if (!workspaceId) return;
        try {
            const res = await fetch(`/api/projects?workspaceId=${workspaceId}`);
            if (!res.ok) throw new Error("Failed to fetch projects");
            const data = await res.json();
            setProjects(data);
        } catch (err) {
            console.error("Failed to fetch projects:", err);
        }
    }, [workspaceId]);

    // Refetch when workspace changes
    useEffect(() => {
        if (!workspaceId) return;
        setLoading(true);
        setParts([]);
        setProjects([]);
        fetchParts();
        fetchProjects();
        fetchFieldValues();
    }, [workspaceId, fetchParts, fetchProjects, fetchFieldValues]);

    // ── Auto-add field values ───────────────
    const autoAddFieldValue = useCallback(async (field: string, value: string | number | null) => {
        if (value == null || value === "") return;
        const strVal = String(value).trim();
        if (!strVal) return;
        if (!isManagedField(field)) return;
        const existing = fieldValues[field] || [];
        if (existing.some((v) => v.toLowerCase() === strVal.toLowerCase())) return;
        try {
            await fetch("/api/field-values", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ field, value: strVal }),
            });
            setFieldValues((prev) => ({
                ...prev,
                [field]: [...(prev[field] || []), strVal].sort((a, b) => a.localeCompare(b)),
            }));
        } catch { /* ignore */ }
    }, [fieldValues]);

    // ── Starred projects ────────────────────
    const starredProjects = useMemo(() => {
        const starred: ProjectNode[] = [];
        const collect = (nodes: ProjectNode[]) => {
            for (const n of nodes) {
                if (n.starred) starred.push(n);
                if (n.children) collect(n.children);
            }
        };
        collect(projects);
        return starred;
    }, [projects]);

    // ── Project → descendant IDs ────────────
    const getProjectAndChildIds = useCallback((projectId: string): string[] => {
        const ids: string[] = [projectId];
        const collectChildren = (nodes: ProjectNode[]) => {
            for (const n of nodes) {
                if (n.id === projectId || ids.includes(n.id)) {
                    if (n.children) {
                        for (const child of n.children) {
                            ids.push(child.id);
                            collectChildren([child]);
                        }
                    }
                } else if (n.children) {
                    collectChildren(n.children);
                }
            }
        };
        collectChildren(projects);
        return ids;
    }, [projects]);

    // ── Filtering pipeline (combined) ───────
    const filteredParts = useMemo(() => {
        let result = parts;

        // Project filter (also match shared parts by _targetProjectId)
        if (selectedProjectId) {
            const validIds = getProjectAndChildIds(selectedProjectId);
            result = result.filter((p) => {
                const partProject = p.projectId;
                const sharedProject = (p as PartData & { _targetProjectId?: string | null })._targetProjectId;
                return (partProject && validIds.includes(partProject)) || (sharedProject && validIds.includes(sharedProject));
            });
        }

        // Starred tab filter (also match shared parts by _targetProjectId)
        if (activeStarredTab) {
            const validIds = getProjectAndChildIds(activeStarredTab);
            result = result.filter((p) => {
                const partProject = p.projectId;
                const sharedProject = (p as PartData & { _targetProjectId?: string | null })._targetProjectId;
                return (partProject && validIds.includes(partProject)) || (sharedProject && validIds.includes(sharedProject));
            });
        }

        // Tab filter
        if (activeTab === "pending") {
            result = result.filter((p) => !DONE_STATUSES.includes(p.status.toLowerCase()));
        }

        // Text search
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            result = result.filter(
                (p) =>
                    p.partName.toLowerCase().includes(q) ||
                    p.uniqueId?.toLowerCase().includes(q) ||
                    p.orderId?.toLowerCase().includes(q) ||
                    p.material?.toLowerCase().includes(q) ||
                    p.status.toLowerCase().includes(q)
            );
        }

        // Column filters
        if (filterStatus) result = result.filter((p) => p.status.toLowerCase() === filterStatus.toLowerCase());
        if (filterMaterial) result = result.filter((p) => p.material?.toLowerCase() === filterMaterial.toLowerCase());
        if (filterClient) result = result.filter((p) => p.client?.toLowerCase() === filterClient.toLowerCase());
        if (filterHospital) result = result.filter((p) => p.hospital?.toLowerCase() === filterHospital.toLowerCase());

        // Sort
        const sorted = [...result].sort((a, b) => {
            const key = sortKey as keyof PartData;
            const aVal = a[key];
            const bVal = b[key];
            if (aVal == null && bVal == null) return 0;
            if (aVal == null) return 1;
            if (bVal == null) return -1;
            if (typeof aVal === "number" && typeof bVal === "number") {
                return sortDir === "asc" ? aVal - bVal : bVal - aVal;
            }
            const cmp = String(aVal).toLowerCase().localeCompare(String(bVal).toLowerCase());
            return sortDir === "asc" ? cmp : -cmp;
        });

        return sorted;
    }, [parts, selectedProjectId, activeStarredTab, activeTab, searchQuery, filterStatus, filterMaterial, filterClient, filterHospital, sortKey, sortDir, getProjectAndChildIds]);

    // ── Project-filtered (for item count on "All" tab) ──
    const projectFilteredParts = useMemo(() => {
        if (!selectedProjectId) return parts;
        const validIds = getProjectAndChildIds(selectedProjectId);
        return parts.filter((p) => p.projectId && validIds.includes(p.projectId));
    }, [parts, selectedProjectId, getProjectAndChildIds]);

    // ── Unique values for filter dropdowns ───
    const uniqueStatuses = useMemo(() => [...new Set(parts.map((p) => p.status))].sort(), [parts]);
    const uniqueMaterials = useMemo(() => [...new Set(parts.map((p) => p.material).filter(Boolean))].sort() as string[], [parts]);
    const uniqueClients = useMemo(() => [...new Set(parts.map((p) => p.client).filter(Boolean))].sort() as string[], [parts]);
    const uniqueHospitals = useMemo(() => [...new Set(parts.map((p) => p.hospital).filter(Boolean))].sort() as string[], [parts]);

    // ── Pending count ───────────────────────
    const pendingCount = useMemo(() =>
        projectFilteredParts.filter((p) => !DONE_STATUSES.includes(p.status.toLowerCase())).length
        , [projectFilteredParts]);

    // ── Convenience: refresh both parts + projects ──
    const refresh = useCallback(() => {
        fetchParts();
        fetchProjects();
    }, [fetchParts, fetchProjects]);

    return {
        // State
        parts, loading, projects, fieldValues,
        activeTab, setActiveTab,
        searchQuery, setSearchQuery,
        selectedProjectId, setSelectedProjectId,
        activeStarredTab, setActiveStarredTab,
        sortKey, setSortKey, sortDir, setSortDir,
        showFilters, setShowFilters,
        filterStatus, setFilterStatus,
        filterMaterial, setFilterMaterial,
        filterClient, setFilterClient,
        filterHospital, setFilterHospital,
        hasActiveFilters, clearAllFilters,
        // Derived
        filteredParts, projectFilteredParts,
        starredProjects, pendingCount,
        uniqueStatuses, uniqueMaterials, uniqueClients, uniqueHospitals,
        getProjectAndChildIds,
        // Actions
        fetchParts, fetchProjects, fetchFieldValues, autoAddFieldValue, refresh,
    };
}
