"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import Toaster, { showToast } from "@/app/components/Toaster";
import KeyboardShortcuts from "@/app/components/KeyboardShortcuts";
import { Button } from "@/app/components/ui/button";
import { ButtonGroup } from "@/app/components/ui/button-group";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/app/components/ui/tooltip";
import { Separator } from "@/app/components/ui/separator";
import BulkActionsBar from "@/app/components/BulkActionsBar";
import ThemeToggle from "@/app/components/ThemeToggle";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import PartsTable, { type PartData } from "./components/PartsTable";
import DetailPanel from "./components/DetailPanel";
import MultiEditPanel from "./components/MultiEditPanel";
import LogViewer from "./components/LogViewer";
import TimelineView from "./components/TimelineView";
import ProjectTree from "./components/ProjectTree";
import ContextMenu from "./components/ContextMenu";
import SettingsView, { DEFAULT_VISIBLE_COLUMNS } from "./components/SettingsView";
import WorkspaceSwitcher from "./components/WorkspaceSwitcher";
import { type AllBadgeColors, loadBadgeColorsFromDB, loadVisibleColumnsFromDB } from "@/app/lib/badgeColors";
import { type UIDesignParams, DEFAULT_UI_PARAMS, loadUIParams, applyUIParams } from "@/app/lib/uiDesign";
import { useUndoRedo } from "@/app/lib/useUndoRedo";
import { usePartsData } from "@/app/lib/usePartsData";
import { useWorkspace } from "@/app/lib/useWorkspace";
import { useKeyboardShortcuts } from "@/app/lib/useKeyboardShortcuts";

export interface WorkspaceFieldDef {
  id: string;
  workspaceId: string;
  key: string;
  label: string;
  icon: string;
  fieldType: string; // "select" | "multi-select" | "text"
  builtIn: boolean;
  sortOrder: number;
}

export default function Home() {
  // ── Workspace hook ────────────────────────
  const ws = useWorkspace();

  // ── Data hook (parts, projects, filtering, sorting) ──
  const data = usePartsData(ws.activeWorkspaceId);

  // ── Undo/redo ─────────────────────────────
  const { pushAction, undo, redo } = useUndoRedo();

  // ── UI state (not extracted — page-level concerns) ──
  const [selectedPartIds, setSelectedPartIds] = useState<Set<string>>(new Set());
  // Auto-increment whenever data.parts reference changes, so DetailPanel re-fetches
  const partsVersionRef = useRef(0);
  const [detailRefreshKey, setDetailRefreshKey] = useState(0);
  useEffect(() => {
    partsVersionRef.current += 1;
    setDetailRefreshKey(partsVersionRef.current);
  }, [data.parts]);
  const lastClickedPartId = useRef<string | null>(null);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [autoEditPartId, setAutoEditPartId] = useState<string | null>(null);
  const [showLogs, setShowLogs] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showTimeline, setShowTimeline] = useState(false);
  const [showProjectTree, setShowProjectTree] = useState(true);
  const [sidebarWidth, setSidebarWidth] = useState(220);

  // Hydrate sidebar width from localStorage after mount (avoids SSR mismatch)
  useEffect(() => {
    const saved = localStorage.getItem("fab-planner-sidebar-width");
    if (saved) setSidebarWidth(Number(saved));
  }, []);

  const downloadPartFiles = async (partIds: string[]) => {
    const isLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const nativeBridge = (window as any).webkit?.messageHandlers?.nativeDownload;
    try {
      showToast(`Preparing download for ${partIds.length} part${partIds.length !== 1 ? "s" : ""}…`, "info");

      if (isLocal) {
        // Local dev: save directly to ~/Downloads/ (works in WKWebView)
        const res = await fetch("/api/save-to-downloads", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ partIds }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: "Download failed" }));
          showToast(err.error || "Download failed", "error");
          return;
        }
        const result = await res.json();
        showToast(`Saved ${result.fileCount} file${result.fileCount !== 1 ? "s" : ""} to ~/Downloads/`, "success");
      } else if (nativeBridge) {
        // Desktop app on production: use Swift native bridge
        const zipName = partIds.length === 1 ? "part_files.zip" : `fab_planner_${partIds.length}_parts.zip`;
        nativeBridge.postMessage({ url: `/api/download?partIds=${partIds.join(",")}`, filename: zipName });
        showToast("Download started — file will open in Finder", "success");
      } else {
        // Regular browser on production: hidden iframe
        const iframe = document.createElement("iframe");
        iframe.style.display = "none";
        iframe.src = `/api/download?partIds=${partIds.join(",")}`;
        document.body.appendChild(iframe);
        setTimeout(() => iframe.remove(), 120000);
        showToast("Download started", "success");
      }
    } catch {
      showToast("Download failed", "error");
    }
  };
  const [leftPanelDragOver, setLeftPanelDragOver] = useState(false);
  const leftPanelDragCounter = useRef(0);
  const [visibleColumns, setVisibleColumns] = useState<string[]>(DEFAULT_VISIBLE_COLUMNS);
  const [badgeColors, setBadgeColors] = useState<AllBadgeColors>({ status: {}, fabMechanism: {} });
  const [uiParams, setUIParams] = useState<UIDesignParams>(DEFAULT_UI_PARAMS);
  const [workspaceFields, setWorkspaceFields] = useState<WorkspaceFieldDef[]>([]);

  // ── Persistence: Restore selected project/parts from localStorage ──
  const persistenceInitialized = useRef(false);
  useEffect(() => {
    if (persistenceInitialized.current || data.loading) return;

    // 1. Check URL first (Deep-link)
    const params = new URLSearchParams(window.location.search);
    const linkedPartId = params.get("partId");

    if (linkedPartId) {
      const match = data.parts.find((p) => p.uniqueId === linkedPartId);
      if (match) {
        data.setSelectedProjectId(match.projectId || null);
        data.setActiveStarredTab(null);
        setSelectedPartIds(new Set([match.id]));
        persistenceInitialized.current = true;
        // Scroll into view
        setTimeout(() => {
          const row = document.querySelector(`[data-part-id="${match.id}"]`);
          if (row) row.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 500);
        return;
      }
    }

    // 2. Fallback to localStorage
    const storedProj = localStorage.getItem("fab-planner-selected-project-id");
    const storedParts = localStorage.getItem("fab-planner-selected-part-ids");

    if (storedProj !== null) {
      data.setSelectedProjectId(storedProj === "null" ? null : storedProj);
    }
    if (storedParts) {
      try {
        const ids = JSON.parse(storedParts);
        if (Array.isArray(ids)) setSelectedPartIds(new Set(ids));
      } catch (e) {
        console.error("Failed to parse stored part IDs", e);
      }
    }
    persistenceInitialized.current = true;
  }, [data.parts, data.loading]);

  // ── Persistence: Save selected project/parts to localStorage ──
  useEffect(() => {
    if (!persistenceInitialized.current) return;
    localStorage.setItem("fab-planner-selected-project-id", String(data.selectedProjectId));
  }, [data.selectedProjectId]);

  useEffect(() => {
    if (!persistenceInitialized.current) return;
    localStorage.setItem("fab-planner-selected-part-ids", JSON.stringify([...selectedPartIds]));
  }, [selectedPartIds]);

  // ── Load shared settings from database on mount ──
  const [leftPanelWidth, setLeftPanelWidth] = useState(62);
  useEffect(() => {
    loadVisibleColumnsFromDB(ws.activeWorkspaceId).then((cols) => {
      // Filter out columns that don't exist anymore or are from other workspaces
      const hardcodedSystemCols = ["dueDate", "files", "quantity"];
      const fetchFields = async () => {
        try {
          const r = await fetch(`/api/workspace-fields?workspaceId=${ws.activeWorkspaceId}`);
          const fields: WorkspaceFieldDef[] = await r.json();
          setWorkspaceFields(fields);

          if (cols) {
            const fieldKeys = new Set(fields.map(f => f.key));
            const filtered = cols.filter(key => fieldKeys.has(key) || hardcodedSystemCols.includes(key));
            setVisibleColumns(filtered);
          } else {
            setVisibleColumns(DEFAULT_VISIBLE_COLUMNS);
          }
        } catch {
          setWorkspaceFields([]);
          setVisibleColumns(DEFAULT_VISIBLE_COLUMNS);
        }
      };
      fetchFields();
    });
  }, [ws.activeWorkspaceId]);
  useEffect(() => {
    loadBadgeColorsFromDB().then(setBadgeColors);
    loadUIParams().then((params) => {
      setUIParams(params);
      applyUIParams(params);
      setLeftPanelWidth(100 - params.detailPanelWidth);
    });
  }, []);
  // ── Keyboard navigation (Arrows) ──────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't navigate if user is typing
      if (document.activeElement?.tagName === "INPUT" || document.activeElement?.tagName === "TEXTAREA") return;
      if (data.filteredParts.length === 0) return;

      const currentIds = Array.from(selectedPartIds);
      const lastId = currentIds[currentIds.length - 1] || lastClickedPartId.current;
      const currentIndex = lastId ? data.filteredParts.findIndex(p => p.id === lastId) : -1;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        const nextIndex = Math.min(currentIndex + 1, data.filteredParts.length - 1);
        const nextPart = data.filteredParts[nextIndex];
        if (nextPart) {
          setSelectedPartIds(new Set([nextPart.id]));
          lastClickedPartId.current = nextPart.id;
          const row = document.querySelector(`[data-part-id="${nextPart.id}"]`);
          row?.scrollIntoView({ block: "nearest", behavior: "smooth" });
        }
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        const prevIndex = Math.max(currentIndex - 1, 0);
        const prevPart = data.filteredParts[prevIndex];
        if (prevPart) {
          setSelectedPartIds(new Set([prevPart.id]));
          lastClickedPartId.current = prevPart.id;
          const row = document.querySelector(`[data-part-id="${prevPart.id}"]`);
          row?.scrollIntoView({ block: "nearest", behavior: "smooth" });
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [data.filteredParts, selectedPartIds]);

  // ── Breadcrumbs ───────────────────────────
  const breadcrumbs = useMemo(() => {
    if (!data.selectedProjectId) return [];
    const path: any[] = [];
    const find = (nodes: any[], targetId: string): boolean => {
      for (const node of nodes) {
        if (node.id === targetId) {
          path.push(node);
          return true;
        }
        if (node.children && find(node.children, targetId)) {
          path.unshift(node);
          return true;
        }
      }
      return false;
    };
    find(data.projects, data.selectedProjectId);
    return path;
  }, [data.projects, data.selectedProjectId]);

  // ── Resizable panels ─────────────────────
  const isDraggingRef = useRef(false);
  const leftPanelRef = useRef<HTMLDivElement>(null);

  const handleDividerMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    isDraggingRef.current = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    const leftPanel = leftPanelRef.current;
    if (!leftPanel) return;
    const parent = leftPanel.parentElement;
    if (!parent) return;
    const sidebar = parent.querySelector(".sidebar-panel") as HTMLElement | null;
    const sidebarWidth = sidebar ? sidebar.getBoundingClientRect().width : 0;
    const toggleBtn = parent.querySelector(".btn-project-toggle") as HTMLElement | null;
    const toggleWidth = toggleBtn ? toggleBtn.getBoundingClientRect().width + 8 : 40;
    const contentOffset = sidebarWidth + toggleWidth;
    const parentRect = parent.getBoundingClientRect();
    const contentWidth = parentRect.width - contentOffset;
    const onMouseMove = (ev: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const mouseX = ev.clientX - parentRect.left - contentOffset;
      const pct = (mouseX / contentWidth) * 100;
      setLeftPanelWidth(Math.min(80, Math.max(25, pct)));
    };
    const onMouseUp = () => {
      isDraggingRef.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  }, []);

  // ── Sidebar drag-to-resize ──
  const isSidebarDragging = useRef(false);
  const handleSidebarResizeMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    isSidebarDragging.current = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    let lastWidth = 220;
    const onMouseMove = (ev: MouseEvent) => {
      if (!isSidebarDragging.current) return;
      const newWidth = Math.min(500, Math.max(140, ev.clientX));
      lastWidth = newWidth;
      setSidebarWidth(newWidth);
    };
    const onMouseUp = () => {
      isSidebarDragging.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      localStorage.setItem("fab-planner-sidebar-width", String(lastWidth));
    };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  }, []);

  // ── Context menu state ────────────────────
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    part?: PartData;
    parts?: PartData[];
  } | null>(null);

  // ── DnD sensors ───────────────────────────
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );


  // ── Add new part ──────────────────────────
  const handleAddDemo = useCallback(async () => {
    try {
      const res = await fetch("/api/parts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          partName: "NEW PART -- RENAME ME",
          status: "new",
          projectId: data.activeStarredTab || data.selectedProjectId || undefined,
          workspaceId: ws.activeWorkspaceId,
        }),
      });
      if (res.ok) {
        const created = await res.json();
        showToast("New part created", "success");
        data.setSearchQuery("");
        await data.fetchParts();
        data.refresh();
        pushAction({
          label: `Create ${created.uniqueId}`,
          timestamp: Date.now(),
          undo: async () => {
            await fetch(`/api/parts/${created.id}`, { method: "DELETE" });
            data.refresh();
          },
          redo: async () => {
            await fetch("/api/parts/restore", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(created),
            });
            data.refresh();
          },
        });
        setSelectedPartIds(new Set([created.id]));
        // Auto-trigger inline rename for the newly created part
        setTimeout(() => setAutoEditPartId(created.id), 150);
      }
    } catch (err) {
      console.error("Failed to create part:", err);
    }
  }, [data.parts.length, data.fetchParts, data.refresh, data.selectedProjectId, data.activeStarredTab, pushAction]);

  // ── Handle files dropped ──────────────────
  const handleFilesDropped = useCallback(async (files: FileList, projectId?: string | null) => {
    try {
      const formData = new FormData();
      for (let i = 0; i < files.length; i++) {
        formData.append("files", files[i]);
      }
      const targetProjectId = projectId !== undefined ? projectId : (data.activeStarredTab || data.selectedProjectId);
      if (targetProjectId) {
        formData.append("projectId", targetProjectId);
      }
      const res = await fetch("/api/parts/batch-upload", {
        method: "POST",
        body: (() => {
          if (ws.activeWorkspaceId) formData.append("workspaceId", ws.activeWorkspaceId);
          return formData;
        })(),
      });
      if (res.ok) {
        const result = await res.json();
        showToast(`Created ${result.count} part${result.count !== 1 ? "s" : ""} from dropped files`, "success");
        await data.fetchParts();
        data.refresh();
      } else {
        showToast("Failed to upload files", "error");
      }
    } catch (err) {
      console.error("Drop upload failed:", err);
      showToast("Failed to upload files", "error");
    }
  }, [data.fetchParts, data.refresh, data.selectedProjectId, data.activeStarredTab]);

  // ── Jump to source workspace for shared parts ──
  const handleJumpToSource = useCallback((originWorkspaceId: string, partId: string, projectId?: string | null) => {
    ws.setActiveWorkspaceId(originWorkspaceId);
    if (projectId) {
      data.setSelectedProjectId(projectId);
    } else {
      data.setSelectedProjectId(null);
    }
    // Wait for workspace data to reload then select the part
    setTimeout(() => {
      setSelectedPartIds(new Set([partId]));
      lastClickedPartId.current = partId;
    }, 300);
  }, [ws, data]);

  // ── Handle drag end — reorder priorities ──
  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      // Note: we can't use setParts directly from the hook, so we use a full refetch approach
      const oldIndex = data.parts.findIndex((p) => p.id === active.id);
      const newIndex = data.parts.findIndex((p) => p.id === over.id);
      const reordered = arrayMove(data.parts, oldIndex, newIndex);
      const updates = reordered.map((p, i) => ({
        id: p.id,
        priorityOrder: i + 1,
      }));
      try {
        await fetch("/api/parts", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ updates }),
        });
        data.fetchParts();
      } catch (err) {
        console.error("Failed to save order:", err);
        data.fetchParts();
      }
    },
    [data.parts, data.fetchParts]
  );

  // ── Delete selected parts (used by keyboard shortcut) ──
  const handleDeleteSelected = useCallback(() => {
    if (selectedPartIds.size === 0) return;
    if (selectedPartIds.size === 1) {
      const part = data.parts.find((p) => p.id === [...selectedPartIds][0]);
      if (part && confirm(`Delete "${part.partName}" (${part.uniqueId})?`)) {
        const snapshot = { ...part };
        fetch(`/api/parts/${part.id}`, { method: "DELETE" }).then(() => {
          setSelectedPartIds(new Set());
          data.fetchParts();
          showToast(`Deleted ${part.uniqueId}`, "success");
          pushAction({
            label: `Delete ${part.uniqueId}`,
            timestamp: Date.now(),
            undo: async () => {
              await fetch("/api/parts/restore", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(snapshot),
              });
              data.fetchParts();
            },
            redo: async () => {
              await fetch(`/api/parts/${snapshot.id}`, { method: "DELETE" });
              data.fetchParts();
            },
          });
        });
      }
    } else {
      const ids = [...selectedPartIds];
      if (confirm(`Delete ${ids.length} parts?`)) {
        const snapshots = data.parts.filter((p) => ids.includes(p.id)).map((p) => ({ ...p }));
        fetch("/api/parts/batch", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids }) }).then(() => {
          setSelectedPartIds(new Set());
          data.refresh();
          showToast(`Deleted ${ids.length} parts`, "success");
          pushAction({
            label: `Delete ${ids.length} parts`,
            timestamp: Date.now(),
            undo: async () => {
              for (const snap of snapshots) {
                await fetch("/api/parts/restore", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(snap) });
              }
              data.refresh();
            },
            redo: async () => {
              await fetch("/api/parts/batch", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids: snapshots.map((s) => s.id) }) });
              data.refresh();
            },
          });
        });
      }
    }
  }, [selectedPartIds, data.parts, data.fetchParts, data.refresh, pushAction]);

  // ── Bulk actions (extracted from JSX) ─────
  const handleBulkStatusChange = useCallback(async (status: string) => {
    const ids = [...selectedPartIds];
    const oldStatuses = data.parts.filter((p) => ids.includes(p.id)).map((p) => ({ id: p.id, status: p.status }));
    try {
      await fetch("/api/parts/batch", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids, updates: { status } }),
      });
      data.fetchParts();
      showToast(`Updated ${ids.length} parts to "${status}"`, "success");
      pushAction({
        label: `Bulk status → ${status}`,
        timestamp: Date.now(),
        undo: async () => {
          for (const old of oldStatuses) {
            await fetch(`/api/parts/${old.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: old.status }) });
          }
          data.fetchParts();
        },
        redo: async () => {
          await fetch("/api/parts/batch", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids, updates: { status } }) });
          data.fetchParts();
        },
      });
    } catch {
      showToast("Bulk status update failed", "error");
    }
  }, [selectedPartIds, data.parts, data.fetchParts, pushAction]);

  const handleBulkProjectChange = useCallback(async (projectId: string | null) => {
    const ids = [...selectedPartIds];
    const oldProjects = data.parts.filter((p) => ids.includes(p.id)).map((p) => ({ id: p.id, projectId: p.projectId }));
    try {
      await fetch("/api/parts/batch", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids, updates: { projectId } }),
      });
      data.refresh();
      showToast(projectId ? `Moved ${ids.length} parts` : `Removed project from ${ids.length} parts`, "success");
      pushAction({
        label: `Bulk move ${ids.length} parts`,
        timestamp: Date.now(),
        undo: async () => {
          for (const old of oldProjects) {
            await fetch(`/api/parts/${old.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ projectId: old.projectId }) });
          }
          data.refresh();
        },
        redo: async () => {
          await fetch("/api/parts/batch", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids, updates: { projectId } }) });
          data.refresh();
        },
      });
    } catch {
      showToast("Bulk move failed", "error");
    }
  }, [selectedPartIds, data.parts, data.refresh, pushAction]);

  const handleBulkDelete = useCallback(async () => {
    const ids = [...selectedPartIds];
    if (!confirm(`Delete ${ids.length} parts? This removes all files permanently.`)) return;
    const snapshots = data.parts.filter((p) => ids.includes(p.id)).map((p) => ({ ...p }));
    try {
      await fetch("/api/parts/batch", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      setSelectedPartIds(new Set());
      data.refresh();
      showToast(`Deleted ${ids.length} parts`, "success");
      pushAction({
        label: `Delete ${ids.length} parts`,
        timestamp: Date.now(),
        undo: async () => {
          for (const snap of snapshots) {
            await fetch("/api/parts/restore", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(snap) });
          }
          data.refresh();
        },
        redo: async () => {
          await fetch("/api/parts/batch", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids: snapshots.map((s) => s.id) }) });
          data.refresh();
        },
      });
    } catch {
      showToast("Bulk delete failed", "error");
    }
  }, [selectedPartIds, data.parts, data.refresh, pushAction]);

  const handleInlineEdit = useCallback(async (partId: string, field: string, value: string | number | null) => {
    const part = data.parts.find((p) => p.id === partId);
    const isCustom = !['partName', 'status', 'material', 'notes', 'archivePath', 'who', 'type', 'quantity', 'fabMechanism', 'orderId', 'project', 'client', 'hospital', 'projectId', 'dueDate'].includes(field);
    const oldValue = part ? (isCustom ? part.customFields?.[field] : (part as unknown as Record<string, unknown>)[field]) : null;
    const patchBody = isCustom ? { customFields: { [field]: value } } : { [field]: value };
    const undoBody = isCustom ? { customFields: { [field]: oldValue ?? null } } : { [field]: oldValue };
    try {
      await fetch(`/api/parts/${partId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patchBody),
      });
      data.fetchParts();
      showToast("Updated", "success");
      if (!isCustom) data.autoAddFieldValue(field, value);
      pushAction({
        label: `Edit ${field}`,
        timestamp: Date.now(),
        undo: async () => {
          await fetch(`/api/parts/${partId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(undoBody),
          });
          data.fetchParts();
        },
        redo: async () => {
          await fetch(`/api/parts/${partId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(patchBody),
          });
          data.fetchParts();
        },
      });
    } catch {
      showToast("Update failed", "error");
    }
  }, [data.parts, data.fetchParts, data.autoAddFieldValue, pushAction]);

  // ── Keyboard shortcuts ────────────────────
  useKeyboardShortcuts({
    undo,
    redo,
    fetchParts: data.fetchParts,
    fetchProjects: data.fetchProjects,
    setShowShortcuts,
    setShowSettings,
    setShowLogs,
    setShowFilters: data.setShowFilters,
    setShowTimeline,
    setShowProjectTree,
    parts: data.parts,
    filteredParts: data.filteredParts,
    selectedPartIds,
    setSelectedPartIds,
    showShortcuts,
    showSettings,
    showLogs,
    handleAddDemo,
    handleDeleteSelected,
  });

  // ── Handle row click with Shift/Cmd multi-select ──
  const handleRowClick = useCallback((e: React.MouseEvent, part: PartData) => {
    setShowLogs(false);
    if (e.shiftKey || e.metaKey || e.ctrlKey) {
      e.preventDefault();
      window.getSelection()?.removeAllRanges();
    }
    if (e.metaKey || e.ctrlKey) {
      setSelectedPartIds((prev) => {
        const next = new Set(prev);
        if (next.has(part.id)) {
          next.delete(part.id);
        } else {
          next.add(part.id);
        }
        return next;
      });
      lastClickedPartId.current = part.id;
    } else if (e.shiftKey && lastClickedPartId.current) {
      const lastIdx = data.filteredParts.findIndex((p) => p.id === lastClickedPartId.current);
      const curIdx = data.filteredParts.findIndex((p) => p.id === part.id);
      if (lastIdx !== -1 && curIdx !== -1) {
        const start = Math.min(lastIdx, curIdx);
        const end = Math.max(lastIdx, curIdx);
        const rangeIds = data.filteredParts.slice(start, end + 1).map((p) => p.id);
        setSelectedPartIds((prev) => {
          const next = new Set(prev);
          rangeIds.forEach((id) => next.add(id));
          return next;
        });
      }
    } else {
      setSelectedPartIds((prev) => {
        if (prev.size === 1 && prev.has(part.id)) {
          return new Set();
        }
        return new Set([part.id]);
      });
      lastClickedPartId.current = part.id;
    }
  }, [data.filteredParts]);

  // ═══════════════════════════════════════════
  // ── JSX RENDER ─────────────────────────────
  // ═══════════════════════════════════════════
  return (
    <div className="app-layout">

      {/* ── Project Tree Sidebar (toggleable) ──── */}
      {showProjectTree && (
        <>
          <div className="sidebar-panel" style={{ width: sidebarWidth, minWidth: 140, maxWidth: 500 }}>
            <ProjectTree
              projects={data.projects}
              selectedProjectId={data.selectedProjectId}
              onSelectProject={(id) => {
                data.setSelectedProjectId(id);
                data.setActiveTab("all");
              }}
              onRefresh={data.refresh}
              onFilesDropped={handleFilesDropped}
              activeWorkspaceId={ws.activeWorkspaceId || undefined}
            />
          </div>
          <div
            className="sidebar-resize-handle"
            onMouseDown={handleSidebarResizeMouseDown}
          />
        </>
      )}

      {/* ── Center Panel: Parts Table ────────────── */}
      <div
        className={`left-panel ${leftPanelDragOver ? "drag-over" : ""}`}
        ref={leftPanelRef}
        style={{ width: `${leftPanelWidth}%`, flex: 'none', position: 'relative' }}
        onDragEnter={(e) => {
          e.preventDefault();
          e.stopPropagation();
          leftPanelDragCounter.current++;
          if (e.dataTransfer.types.includes("Files")) setLeftPanelDragOver(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          e.stopPropagation();
          leftPanelDragCounter.current--;
          if (leftPanelDragCounter.current === 0) setLeftPanelDragOver(false);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setLeftPanelDragOver(false);
          leftPanelDragCounter.current = 0;
          if (e.dataTransfer.files.length > 0) handleFilesDropped(e.dataTransfer.files);
        }}
      >
        {/* Drop overlay for left panel */}
        {leftPanelDragOver && (
          <div className="drop-overlay" style={{ position: 'absolute', inset: 0, zIndex: 50 }}>
            <div className="drop-overlay-content">
              <span className="drop-overlay-icon">📥</span>
              <span className="drop-overlay-text">Drop files to create parts</span>
            </div>
          </div>
        )}
        <div className="panel-header">
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {breadcrumbs.length > 0 && (
              <div className="breadcrumbs">
                <span className="breadcrumb-item" onClick={() => data.setSelectedProjectId(null)}>Root</span>
                {breadcrumbs.map((b: any, i: number) => (
                  <span key={b.id} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <span className="breadcrumb-separator">/</span>
                    <span
                      className="breadcrumb-item"
                      onClick={() => data.setSelectedProjectId(b.id)}
                      style={i === breadcrumbs.length - 1 ? { fontWeight: 600, color: "var(--text-primary)" } : {}}
                    >
                      {b.name}
                    </span>
                  </span>
                ))}
              </div>
            )}
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button
                className={`btn-project-toggle ${showProjectTree ? "active" : ""}`}
                onClick={() => setShowProjectTree(!showProjectTree)}
                title="Toggle project tree"
                style={{ marginLeft: -10 }}
              >
                📁
              </button>
              <WorkspaceSwitcher
                workspaces={ws.workspaces}
                activeWorkspace={ws.activeWorkspace}
                onSwitch={ws.setActiveWorkspaceId}
                onCreate={ws.createWorkspace}
                onUpdate={ws.updateWorkspace}
                onDelete={ws.deleteWorkspace}
              />
              {ws.isOwner && (
                <span
                  title="Owner mode active"
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: "#4ec9b0",
                    background: "rgba(78, 201, 176, 0.12)",
                    padding: "2px 8px",
                    borderRadius: 12,
                    letterSpacing: "0.3px",
                    cursor: "default",
                  }}
                >
                  🔐 OWNER
                </span>
              )}
              <h2>⚙️ Production Queue</h2>
            </div>
          </div>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <TooltipProvider delayDuration={300}>
              <ButtonGroup>
                <ButtonGroup>
                  <Tooltip><TooltipTrigger asChild>
                    <Button variant="outline" size="sm" className="btn-grouped" onClick={() => { window.location.href = "/api/export"; }}>
                      📥 Export
                    </Button>
                  </TooltipTrigger><TooltipContent>Export all parts to Excel (CSV)</TooltipContent></Tooltip>

                  <Tooltip><TooltipTrigger asChild>
                    <Button variant="outline" size="sm" className={`btn-grouped ${showLogs ? "btn-active" : ""}`} onClick={() => { setShowLogs(!showLogs); if (!showLogs) { setSelectedPartIds(new Set()); data.setActiveStarredTab(null); } }}>
                      📋 Logs
                    </Button>
                  </TooltipTrigger><TooltipContent>View application logs</TooltipContent></Tooltip>

                  <Tooltip><TooltipTrigger asChild>
                    <Button variant="outline" size="sm" className="btn-grouped" onClick={handleAddDemo}>
                      + New Part
                    </Button>
                  </TooltipTrigger><TooltipContent>Add a demo part for testing</TooltipContent></Tooltip>
                </ButtonGroup>

                <ButtonGroup>
                  <Tooltip><TooltipTrigger asChild>
                    <Button variant="outline" size="sm" className="btn-grouped" onClick={() => setShowSettings(true)}>
                      ⚙️ Settings
                    </Button>
                  </TooltipTrigger><TooltipContent>Manage field values and settings</TooltipContent></Tooltip>

                  <Tooltip><TooltipTrigger asChild>
                    <Button variant="outline" size="sm" className="btn-grouped" asChild>
                      <a href="/docs" style={{ textDecoration: "none" }}>📘 Docs</a>
                    </Button>
                  </TooltipTrigger><TooltipContent>Open documentation</TooltipContent></Tooltip>

                  <Tooltip><TooltipTrigger asChild>
                    <Button variant="outline" size="sm" className="btn-grouped" asChild>
                      <a href="/complaints" style={{ textDecoration: "none" }}>📝 Complaints</a>
                    </Button>
                  </TooltipTrigger><TooltipContent>Report issues & track complaints</TooltipContent></Tooltip>
                </ButtonGroup>
              </ButtonGroup>
            </TooltipProvider>
            <ThemeToggle />
          </div>
        </div>

        {/* ── Tab Bar ───────────────────────────── */}
        <div className="tab-bar">
          <button
            className={`tab ${data.activeTab === "all" && !data.activeStarredTab ? "active" : ""}`}
            onClick={() => { data.setActiveTab("all"); data.setActiveStarredTab(null); }}
          >
            All Parts
            <span className="tab-count">{data.projectFilteredParts.length}</span>
          </button>
          <button
            className={`tab ${data.activeTab === "pending" && !data.activeStarredTab ? "active" : ""}`}
            onClick={() => { data.setActiveTab("pending"); data.setActiveStarredTab(null); }}
          >
            Pending
            <span className="tab-count">{data.pendingCount}</span>
          </button>

          {/* Starred project tabs */}
          {data.starredProjects.map((sp) => (
            <button
              key={sp.id}
              className={`tab ${data.activeStarredTab === sp.id ? "active" : ""}`}
              onClick={() => {
                if (data.activeStarredTab === sp.id) {
                  data.setActiveStarredTab(null);
                } else {
                  data.setActiveStarredTab(sp.id);
                  data.setActiveTab("all");
                }
              }}
            >
              <span style={{ color: "var(--accent-orange)" }}>★</span> {sp.name}
              <span className="tab-count">{data.parts.filter(p => p.projectId && data.getProjectAndChildIds(sp.id).includes(p.projectId)).length}</span>
            </button>
          ))}
        </div>

        <div className="toolbar">
          <input
            type="text"
            className="search-input"
            placeholder="Search parts, IDs, orders, materials..."
            value={data.searchQuery}
            onChange={(e) => data.setSearchQuery(e.target.value)}
          />
          <Button
            variant="ghost"
            size="sm"
            className={data.showFilters || data.hasActiveFilters ? "btn-active" : ""}
            onClick={() => data.setShowFilters(!data.showFilters)}
            title="Toggle column filters"
          >
            🔻 Filters{data.hasActiveFilters ? " ●" : ""}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={data.sortKey === "priorityOrder" ? "btn-active" : ""}
            onClick={() => {
              if (data.sortKey === "priorityOrder") {
                data.setSortDir((d) => d === "asc" ? "desc" : "asc");
              } else {
                data.setSortKey("priorityOrder");
                data.setSortDir("asc");
              }
            }}
            title="Sort by importance (drag order)"
          >
            ⭐ Importance{data.sortKey === "priorityOrder" ? (data.sortDir === "asc" ? " ▲" : " ▼") : ""}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={showTimeline ? "btn-active" : ""}
            onClick={() => setShowTimeline(!showTimeline)}
            title="Toggle timeline view"
          >
            📅 Timeline
          </Button>
          {data.filteredParts.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => downloadPartFiles(data.filteredParts.map((p) => p.id))}
              title="Download files for all displayed parts as ZIP"
            >
              ⬇ Download All
            </Button>
          )}
          {data.filteredParts.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                // Build CSV from filtered parts with visible columns
                const COLUMN_LABELS: Record<string, string> = {
                  status: "Status", material: "Material", dueDate: "Due Date",
                  client: "Client", quantity: "Quantity", who: "Assignee",
                  fabMechanism: "Fab Mechanism", hospital: "Hospital",
                  orderId: "Order ID", type: "Type", notes: "Notes",
                };
                const cols = ["partName", "uniqueId", ...visibleColumns.filter(c => c !== "files"), "notes"];
                const headers = cols.map(c =>
                  c === "partName" ? "Part Name" : c === "uniqueId" ? "Part ID" : (COLUMN_LABELS[c] || c)
                );
                const rows = data.filteredParts.map(p => {
                  return cols.map(col => {
                    let val: unknown;
                    if (col === "partName" || col === "uniqueId" || col === "status" || col === "material" ||
                      col === "client" || col === "hospital" || col === "orderId" || col === "type" ||
                      col === "notes" || col === "who" || col === "fabMechanism" || col === "dueDate" ||
                      col === "quantity") {
                      val = (p as unknown as Record<string, unknown>)[col];
                    } else {
                      val = p.customFields?.[col];
                    }
                    if (val === null || val === undefined) return "";
                    const s = String(val);
                    // Escape CSV: quote fields containing commas, quotes, or newlines
                    return s.includes(",") || s.includes('"') || s.includes("\n")
                      ? `"${s.replace(/"/g, '""')}"` : s;
                  }).join(",");
                });
                const csv = [headers.join(","), ...rows].join("\n");
                const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                const date = new Date().toISOString().split("T")[0];
                a.href = url;
                a.download = `order_export_${date}.csv`;
                a.click();
                URL.revokeObjectURL(url);
              }}
              title="Export displayed parts as CSV for ordering"
            >
              📋 Export for Order
            </Button>
          )}
          <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
            {data.filteredParts.length} part{data.filteredParts.length !== 1 ? "s" : ""}
          </span>
        </div>

        {data.showFilters && (
          <div className="filter-bar">
            {[
              { label: "Status", value: data.filterStatus, set: data.setFilterStatus, options: data.uniqueStatuses },
              { label: "Material", value: data.filterMaterial, set: data.setFilterMaterial, options: data.uniqueMaterials },
              { label: "Client", value: data.filterClient, set: data.setFilterClient, options: data.uniqueClients },
              { label: "Hospital", value: data.filterHospital, set: data.setFilterHospital, options: data.uniqueHospitals },
            ].map((f) => (
              <div key={f.label} className="filter-group">
                <label className="filter-label">{f.label}</label>
                <select className="filter-select" value={f.value} onChange={(e) => f.set(e.target.value)}>
                  <option value="">All</option>
                  {f.options.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
            ))}
            {data.hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={data.clearAllFilters}>
                ✕ Clear all
              </Button>
            )}
          </div>
        )}

        {/* ── Bulk Actions Bar ──────────────────── */}
        <BulkActionsBar
          selectedCount={selectedPartIds.size}
          statuses={["new", "design", "manufacturing", "review", "complete", "urgent"]}
          projects={data.projects.map((p) => ({ id: p.id, name: p.name }))}
          onStatusChange={handleBulkStatusChange}
          onProjectChange={handleBulkProjectChange}
          onDelete={handleBulkDelete}
          onDeselect={() => setSelectedPartIds(new Set())}
        />

        {data.loading ? (
          <div className="skeleton-table">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="skeleton-row">
                <div className="skeleton-cell skeleton-pulse" style={{ width: "80px" }} />
                <div className="skeleton-cell skeleton-pulse" style={{ flex: 1 }} />
                <div className="skeleton-cell skeleton-pulse" style={{ width: "100px" }} />
                <div className="skeleton-cell skeleton-pulse" style={{ width: "80px" }} />
                <div className="skeleton-cell skeleton-pulse" style={{ width: "55px" }} />
              </div>
            ))}
          </div>
        ) : showTimeline ? (
          <TimelineView
            parts={data.filteredParts}
            badgeColors={badgeColors}
            onSelectPart={(part) => {
              const id = part.id;
              setSelectedPartIds((prev) => {
                if (prev.size === 1 && prev.has(id)) return new Set();
                return new Set([id]);
              });
            }}
            selectedPartId={selectedPartIds.size === 1 ? [...selectedPartIds][0] : null}
          />
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={data.filteredParts.map((p) => p.id)}
              strategy={verticalListSortingStrategy}
            >
              <PartsTable
                parts={data.filteredParts}
                selectedPartIds={selectedPartIds}
                onRowClick={handleRowClick}
                onContextMenu={(e, part) => {
                  e.preventDefault();
                  if (selectedPartIds.has(part.id) && selectedPartIds.size > 1) {
                    const selectedParts = data.filteredParts.filter((p) => selectedPartIds.has(p.id));
                    setContextMenu({ x: e.clientX, y: e.clientY, parts: selectedParts });
                  } else {
                    setSelectedPartIds(new Set([part.id]));
                    lastClickedPartId.current = part.id;
                    setContextMenu({ x: e.clientX, y: e.clientY, part });
                  }
                }}
                visibleColumns={visibleColumns}
                badgeColors={badgeColors}
                workspaceFields={workspaceFields}
                sortKey={data.sortKey}
                sortDir={data.sortDir}
                onSort={(key: string) => {
                  if (key === data.sortKey) {
                    data.setSortDir((d) => d === "asc" ? "desc" : "asc");
                  } else {
                    data.setSortKey(key);
                    data.setSortDir("asc");
                  }
                }}
                isFiltered={!!(data.searchQuery || data.filterStatus || data.filterMaterial || data.filterClient || data.filterHospital)}
                onInlineEdit={handleInlineEdit}
                fieldValues={data.fieldValues}
                autoEditPartId={autoEditPartId}
                onJumpToSource={handleJumpToSource}
              />
            </SortableContext>
          </DndContext>
        )}

        {/* ── Empty state when filters return no results ── */}
        {data.filteredParts.length === 0 && (data.searchQuery || data.hasActiveFilters) && !showTimeline && (
          <div className="empty-state" style={{ padding: "48px 24px", textAlign: "center" }}>
            <div className="empty-icon">🔍</div>
            <p style={{ margin: "8px 0 16px", color: "var(--text-secondary)" }}>No parts match your current filters</p>
            <Button variant="ghost" size="sm" onClick={() => { data.setSearchQuery(""); data.clearAllFilters(); }}>Clear all filters</Button>
          </div>
        )}
      </div>

      {/* ── Draggable Resize Divider ──────────────── */}
      <div
        className="panel-divider"
        onMouseDown={handleDividerMouseDown}
        title="Drag to resize"
      />

      {/* ── Context Menu ──────────────────────────── */}
      {contextMenu && contextMenu.part && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          part={contextMenu.part}
          projects={data.projects}
          onClose={() => setContextMenu(null)}
          onDelete={async (part) => {
            if (!confirm(`Delete "${part.partName}" (${part.uniqueId})? This removes all files permanently.`)) return;
            const snapshot = { ...part };
            try {
              await fetch(`/api/parts/${part.id}`, { method: "DELETE" });
              setSelectedPartIds((prev) => { const n = new Set(prev); n.delete(part.id); return n; });
              data.fetchParts();
              showToast(`Deleted ${part.uniqueId}`, "success");
              pushAction({
                label: `Delete ${part.uniqueId}`,
                timestamp: Date.now(),
                undo: async () => {
                  await fetch("/api/parts/restore", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(snapshot) });
                  data.fetchParts();
                },
                redo: async () => {
                  await fetch(`/api/parts/${snapshot.id}`, { method: "DELETE" });
                  data.fetchParts();
                },
              });
            } catch (err) {
              console.error("Delete failed:", err);
            }
          }}
          onRename={(part) => {
            setAutoEditPartId(part.id);
          }}
          onMoveTo={async (part, projectId) => {
            const oldProjectId = part.projectId;
            try {
              await fetch(`/api/parts/${part.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ projectId }),
              });
              data.fetchParts();
              showToast(projectId ? `Moved to project` : `Removed from project`, "success");
              pushAction({
                label: `Move ${part.uniqueId}`,
                timestamp: Date.now(),
                undo: async () => {
                  await fetch(`/api/parts/${part.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ projectId: oldProjectId }) });
                  data.fetchParts();
                },
                redo: async () => {
                  await fetch(`/api/parts/${part.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ projectId }) });
                  data.fetchParts();
                },
              });
            } catch (err) {
              console.error("Move failed:", err);
            }
          }}
          onDownload={(part) => downloadPartFiles([part.id])}
          workspaces={ws.workspaces}
          activeWorkspaceId={ws.activeWorkspaceId || undefined}
          onShare={async (partId, targetWorkspaceId, targetProjectId) => {
            try {
              const res = await fetch(`/api/parts/${partId}/share`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ targetWorkspaceId, targetProjectId }),
              });
              if (res.ok) {
                showToast("Part shared successfully", "success");
                data.fetchParts();
              } else {
                const err = await res.json();
                showToast(err.error || "Share failed", "error");
              }
            } catch { showToast("Share failed", "error"); }
          }}
          onUnshare={async (partId) => {
            try {
              const res = await fetch(`/api/parts/${partId}/share?workspaceId=${ws.activeWorkspaceId}`, { method: "DELETE" });
              if (res.ok) {
                showToast("Part unshared", "success");
                data.fetchParts();
              }
            } catch { showToast("Unshare failed", "error"); }
          }}
        />
      )}

      {/* Bulk context menu */}
      {contextMenu && contextMenu.parts && contextMenu.parts.length > 1 && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          parts={contextMenu.parts}
          projects={data.projects}
          onClose={() => setContextMenu(null)}
          onBulkDelete={async (partIds) => {
            if (!confirm(`Delete ${partIds.length} parts? This removes all files permanently.`)) return;
            const snapshots = data.parts.filter((p) => partIds.includes(p.id)).map((p) => ({ ...p }));
            try {
              await fetch("/api/parts/batch", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ids: partIds }),
              });
              setSelectedPartIds(new Set());
              data.refresh();
              showToast(`Deleted ${partIds.length} parts`, "success");
              pushAction({
                label: `Delete ${partIds.length} parts`,
                timestamp: Date.now(),
                undo: async () => {
                  for (const snap of snapshots) {
                    await fetch("/api/parts/restore", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(snap) });
                  }
                  data.refresh();
                },
                redo: async () => {
                  await fetch("/api/parts/batch", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids: snapshots.map((s) => s.id) }) });
                  data.refresh();
                },
              });
            } catch (err) {
              console.error("Bulk delete failed:", err);
            }
          }}
          onBulkMoveTo={async (partIds, projectId) => {
            const oldProjects = data.parts.filter((p) => partIds.includes(p.id)).map((p) => ({ id: p.id, projectId: p.projectId }));
            try {
              await fetch("/api/parts/batch", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ids: partIds, updates: { projectId } }),
              });
              data.refresh();
              showToast(projectId ? `Moved ${partIds.length} parts to project` : `Removed ${partIds.length} parts from project`, "success");
              pushAction({
                label: `Move ${partIds.length} parts`,
                timestamp: Date.now(),
                undo: async () => {
                  for (const old of oldProjects) {
                    await fetch(`/api/parts/${old.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ projectId: old.projectId }) });
                  }
                  data.refresh();
                },
                redo: async () => {
                  await fetch("/api/parts/batch", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids: partIds, updates: { projectId } }) });
                  data.refresh();
                },
              });
            } catch (err) {
              console.error("Bulk move failed:", err);
            }
          }}
          onBulkDownload={(partIds) => downloadPartFiles(partIds)}
        />
      )}

      {/* ── Right Panel ─────────────────────────── */}
      {showLogs ? (
        <LogViewer key="logs" onClose={() => setShowLogs(false)} />
      ) : selectedPartIds.size === 1 ? (
        <DetailPanel
          key={`detail-${[...selectedPartIds][0]}`}
          partId={[...selectedPartIds][0]}
          onClose={() => setSelectedPartIds(new Set())}
          onPartUpdated={data.refresh}
          pushAction={pushAction}
          activeWorkspaceId={ws.activeWorkspaceId || undefined}
          onJumpToSource={handleJumpToSource}
          workspaceFields={workspaceFields}
          refreshKey={detailRefreshKey}
        />
      ) : selectedPartIds.size > 1 ? (
        <MultiEditPanel
          key={`multi-${[...selectedPartIds].join("-")}`}
          partIds={[...selectedPartIds]}
          onClose={() => setSelectedPartIds(new Set())}
          onPartsUpdated={data.refresh}
          workspaceFields={workspaceFields}
        />
      ) : (
        <div key="empty" className="right-panel">
          <div className="empty-state">
            <div className="empty-icon" style={{ fontSize: 40 }}>📦</div>
            <h3 style={{ marginTop: 12, fontWeight: 600, color: "var(--text-primary)" }}>No part selected</h3>
            <p style={{ margin: "8px 0 16px", maxWidth: 280, lineHeight: 1.5 }}>
              Click a part from the production queue to view details, 3D preview, and manage revisions.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 11, color: "var(--text-muted)" }}>
              <span>⬆⬇ Navigate parts</span>
              <span><kbd style={{ padding: "1px 5px", border: "1px solid var(--border)", borderRadius: 3, fontSize: 10 }}>N</kbd> New part</span>
              <span><kbd style={{ padding: "1px 5px", border: "1px solid var(--border)", borderRadius: 3, fontSize: 10 }}>?</kbd> All shortcuts</span>
            </div>
          </div>
        </div>
      )}

      {/* ── Toaster Notifications ──────────────── */}
      <Toaster />

      {/* ── Keyboard Shortcuts Help ────────────── */}
      <KeyboardShortcuts open={showShortcuts} onOpenChange={setShowShortcuts} />

      {/* ── Settings Overlay ───────────────────── */}
      {showSettings && (
        <SettingsView
          onClose={() => { setShowSettings(false); data.fetchParts(); }}
          visibleColumns={visibleColumns}
          onColumnVisibilityChange={setVisibleColumns}
          badgeColors={badgeColors}
          onBadgeColorsChange={setBadgeColors}
          uiParams={uiParams}
          onUIParamsChange={(params) => {
            setUIParams(params);
            setLeftPanelWidth(100 - params.detailPanelWidth);
          }}
          activeWorkspaceId={ws.activeWorkspaceId}
          activeWorkspaceName={ws.activeWorkspace?.name}
          workspaceFields={workspaceFields}
          onWorkspaceFieldsChange={setWorkspaceFields}
          isOwner={ws.isOwner}
          onLoginAsOwner={ws.loginAsOwner}
          onLogoutOwner={ws.logoutOwner}
          allWorkspaces={ws.workspaces}
          onWorkspaceVisibilityChange={async (id, visibility) => {
            await ws.updateWorkspace(id, { visibility });
          }}
        />
      )}
    </div>
  );
}
