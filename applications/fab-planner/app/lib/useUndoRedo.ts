"use client";

import { useCallback, useRef, useState } from "react";

// ── Types ───────────────────────────────────
export interface UndoableAction {
    /** Human-readable label for toast messages */
    label: string;
    /** Function to undo this action (restore previous state) */
    undo: () => Promise<void>;
    /** Function to redo this action (re-apply the change) */
    redo: () => Promise<void>;
    /** Timestamp */
    timestamp: number;
}

const MAX_HISTORY = 30;

// ── Hook ────────────────────────────────────
export function useUndoRedo() {
    // Use refs for the stacks so reads are always synchronous and up-to-date
    const undoRef = useRef<UndoableAction[]>([]);
    const redoRef = useRef<UndoableAction[]>([]);
    const busyRef = useRef(false);
    // Counter forces re-render when stacks change (for canUndo/canRedo)
    const [, setTick] = useState(0);
    const tick = () => setTick((n) => n + 1);

    /** Register a new undoable action (call AFTER performing the action) */
    const pushAction = useCallback((action: UndoableAction) => {
        undoRef.current = [...undoRef.current.slice(-(MAX_HISTORY - 1)), action];
        redoRef.current = []; // clear redo on new action
        tick();
    }, []);

    /** Undo the most recent action */
    const undo = useCallback(async (): Promise<UndoableAction | null> => {
        if (busyRef.current) return null;
        const stack = undoRef.current;
        if (stack.length === 0) return null;

        const action = stack[stack.length - 1];
        undoRef.current = stack.slice(0, -1);

        busyRef.current = true;
        try {
            await action.undo();
            redoRef.current = [...redoRef.current, action];
        } finally {
            busyRef.current = false;
        }
        tick();
        return action;
    }, []);

    /** Redo the most recently undone action */
    const redo = useCallback(async (): Promise<UndoableAction | null> => {
        if (busyRef.current) return null;
        const stack = redoRef.current;
        if (stack.length === 0) return null;

        const action = stack[stack.length - 1];
        redoRef.current = stack.slice(0, -1);

        busyRef.current = true;
        try {
            await action.redo();
            undoRef.current = [...undoRef.current, action];
        } finally {
            busyRef.current = false;
        }
        tick();
        return action;
    }, []);

    return {
        pushAction,
        undo,
        redo,
        canUndo: undoRef.current.length > 0,
        canRedo: redoRef.current.length > 0,
        undoCount: undoRef.current.length,
        redoCount: redoRef.current.length,
    };
}
