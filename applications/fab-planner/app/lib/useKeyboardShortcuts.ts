"use client";

import { useEffect } from "react";
import { showToast } from "@/app/components/Toaster";
import type { PartData } from "@/app/components/PartsTable";

// ── Types ───────────────────────────────────
interface KeyboardShortcutsConfig {
    // Undo/redo
    undo: () => Promise<{ label: string } | null>;
    redo: () => Promise<{ label: string } | null>;
    // Data refresh
    fetchParts: () => void;
    fetchProjects: () => void;
    // UI toggles
    setShowShortcuts: React.Dispatch<React.SetStateAction<boolean>>;
    setShowSettings: React.Dispatch<React.SetStateAction<boolean>>;
    setShowLogs: React.Dispatch<React.SetStateAction<boolean>>;
    setShowFilters: React.Dispatch<React.SetStateAction<boolean>>;
    setShowTimeline: React.Dispatch<React.SetStateAction<boolean>>;
    setShowProjectTree: React.Dispatch<React.SetStateAction<boolean>>;
    // Selection state
    parts: PartData[];
    filteredParts: PartData[];
    selectedPartIds: Set<string>;
    setSelectedPartIds: React.Dispatch<React.SetStateAction<Set<string>>>;
    // UI state for Escape logic
    showShortcuts: boolean;
    showSettings: boolean;
    showLogs: boolean;
    // Actions
    handleAddDemo: () => void;
    handleDeleteSelected: () => void;
}

// ── Hook ────────────────────────────────────
export function useKeyboardShortcuts(config: KeyboardShortcutsConfig) {
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
            const isInput = tag === "input" || tag === "textarea" || tag === "select";

            // ⌘K — Focus search (always works)
            if ((e.metaKey || e.ctrlKey) && e.key === "k") {
                e.preventDefault();
                const searchInput = document.querySelector<HTMLInputElement>(".search-input");
                searchInput?.focus();
                return;
            }

            // ⌘P — Print current view
            if ((e.metaKey || e.ctrlKey) && e.key === "p") {
                e.preventDefault();
                window.print();
                return;
            }

            // ⌘Z — Undo
            if ((e.metaKey || e.ctrlKey) && e.key === "z" && !e.shiftKey) {
                e.preventDefault();
                config.undo().then((action) => {
                    if (action) {
                        showToast(`Undid: ${action.label}`, "undo");
                        config.fetchParts();
                        config.fetchProjects();
                    } else {
                        showToast("Nothing to undo", "info");
                    }
                });
                return;
            }

            // ⌘⇧Z — Redo
            if ((e.metaKey || e.ctrlKey) && e.key === "z" && e.shiftKey) {
                e.preventDefault();
                config.redo().then((action) => {
                    if (action) {
                        showToast(`Redid: ${action.label}`, "success");
                        config.fetchParts();
                        config.fetchProjects();
                    } else {
                        showToast("Nothing to redo", "info");
                    }
                });
                return;
            }

            // Don't handle other shortcuts when typing
            if (isInput) return;

            // ? — Toggle shortcuts help
            if (e.key === "?" || (e.shiftKey && e.key === "/")) {
                e.preventDefault();
                config.setShowShortcuts((v) => !v);
                return;
            }

            // Escape — deselect / close panels
            if (e.key === "Escape") {
                e.preventDefault();
                if (config.showShortcuts) { config.setShowShortcuts(false); return; }
                if (config.showSettings) { config.setShowSettings(false); return; }
                if (config.showLogs) { config.setShowLogs(false); return; }
                if (config.selectedPartIds.size > 0) { config.setSelectedPartIds(new Set()); return; }
                return;
            }

            // N — New part
            if (e.key === "n" && !e.metaKey && !e.ctrlKey) {
                e.preventDefault();
                config.handleAddDemo();
                return;
            }

            // F — Toggle filters
            if (e.key === "f" && !e.metaKey && !e.ctrlKey) {
                e.preventDefault();
                config.setShowFilters((v) => !v);
                return;
            }

            // T — Toggle timeline
            if (e.key === "t" && !e.metaKey && !e.ctrlKey) {
                e.preventDefault();
                config.setShowTimeline((v) => !v);
                return;
            }

            // P — Toggle project tree
            if (e.key === "p" && !e.metaKey && !e.ctrlKey) {
                e.preventDefault();
                config.setShowProjectTree((v) => !v);
                return;
            }

            // Delete/Backspace — delete selected part(s)
            if (e.key === "Delete" || e.key === "Backspace") {
                if (config.selectedPartIds.size === 0) return;
                e.preventDefault();
                config.handleDeleteSelected();
                return;
            }

            // Enter — ensure detail panel open for single selection
            if (e.key === "Enter" && config.selectedPartIds.size === 1) {
                e.preventDefault();
                config.setShowLogs(false);
                return;
            }

            // Arrow up/down — navigate parts
            if (e.key === "ArrowUp" || e.key === "ArrowDown") {
                e.preventDefault();
                const currentId = config.selectedPartIds.size === 1 ? [...config.selectedPartIds][0] : null;
                const currentIndex = currentId ? config.filteredParts.findIndex((p) => p.id === currentId) : -1;
                let nextIndex: number;
                if (e.key === "ArrowDown") {
                    nextIndex = currentIndex < config.filteredParts.length - 1 ? currentIndex + 1 : 0;
                } else {
                    nextIndex = currentIndex > 0 ? currentIndex - 1 : config.filteredParts.length - 1;
                }
                const nextPart = config.filteredParts[nextIndex];
                if (nextPart) {
                    config.setSelectedPartIds(new Set([nextPart.id]));
                    config.setShowLogs(false);
                    const row = document.querySelector(`[data-part-id="${nextPart.id}"]`);
                    row?.scrollIntoView({ block: "nearest", behavior: "smooth" });
                }
                return;
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    });
}
