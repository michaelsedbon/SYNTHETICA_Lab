/**
 * Process Manager — tracks child processes spawned by the launcher.
 *
 * This is a server-only module. It keeps a Map of slug → child PIDs
 * so that the start/stop API routes can manage app lifecycles.
 */

import { spawn, ChildProcess } from "child_process";
import path from "path";

interface ManagedProcess {
    label: string;
    port: number;
    child: ChildProcess;
    pid: number;
}

// Global process store (persists across API calls within the same Next.js server)
const runningProcesses = new Map<string, ManagedProcess[]>();

/**
 * Find the workspace root from the launcher directory.
 * The launcher lives at <workspace>/applications/launcher,
 * so the root is three levels up from this file's directory.
 */
function getWorkspaceRoot(): string {
    // __dirname points to .next/server/... at runtime, so use env or resolve from cwd
    // The launcher is started from its own directory, so workspace root = ../../ from CWD
    const cwd = process.cwd();
    if (cwd.includes("applications/launcher")) {
        return path.resolve(cwd, "../..");
    }
    // Fallback: assume cwd IS the workspace root (e.g. if started from root)
    return cwd;
}

export function getProcesses(slug: string): ManagedProcess[] {
    return runningProcesses.get(slug) || [];
}

export function isRunningByPid(slug: string): boolean {
    const procs = runningProcesses.get(slug);
    if (!procs || procs.length === 0) return false;
    // Check if child processes are still alive
    return procs.some((p) => {
        try {
            process.kill(p.pid, 0); // test if process exists
            return true;
        } catch {
            return false;
        }
    });
}

export interface StartResult {
    slug: string;
    started: { label: string; pid: number; port: number }[];
    errors: string[];
}

export function startApp(
    slug: string,
    commands: { cwd: string; cmd: string; port: number; label: string }[]
): StartResult {
    const existing = runningProcesses.get(slug);
    if (existing && existing.length > 0) {
        // Check if still alive
        const alive = existing.filter((p) => {
            try {
                process.kill(p.pid, 0);
                return true;
            } catch {
                return false;
            }
        });
        if (alive.length > 0) {
            return {
                slug,
                started: alive.map((p) => ({ label: p.label, pid: p.pid, port: p.port })),
                errors: ["Already running"],
            };
        }
    }

    const workspaceRoot = getWorkspaceRoot();
    const procs: ManagedProcess[] = [];
    const errors: string[] = [];

    for (const sc of commands) {
        const fullCwd = path.resolve(workspaceRoot, sc.cwd);

        try {
            const child = spawn("sh", ["-c", sc.cmd], {
                cwd: fullCwd,
                stdio: "ignore",
                detached: true,
                env: { ...process.env },
            });

            child.unref();

            if (child.pid) {
                procs.push({
                    label: sc.label,
                    port: sc.port,
                    child,
                    pid: child.pid,
                });
            } else {
                errors.push(`Failed to start ${sc.label}: no PID`);
            }
        } catch (err) {
            errors.push(`Failed to start ${sc.label}: ${err}`);
        }
    }

    if (procs.length > 0) {
        runningProcesses.set(slug, procs);
    }

    return {
        slug,
        started: procs.map((p) => ({ label: p.label, pid: p.pid, port: p.port })),
        errors,
    };
}

export interface StopResult {
    slug: string;
    killed: { label: string; pid: number }[];
    errors: string[];
}

export function stopApp(slug: string): StopResult {
    const procs = runningProcesses.get(slug);
    if (!procs || procs.length === 0) {
        return { slug, killed: [], errors: ["Not running (no tracked processes)"] };
    }

    const killed: { label: string; pid: number }[] = [];
    const errors: string[] = [];

    for (const p of procs) {
        try {
            // Kill the process group (negative PID kills the group)
            process.kill(-p.pid, "SIGTERM");
            killed.push({ label: p.label, pid: p.pid });
        } catch (err) {
            // Try killing just the process
            try {
                process.kill(p.pid, "SIGTERM");
                killed.push({ label: p.label, pid: p.pid });
            } catch {
                errors.push(`Failed to kill ${p.label} (PID ${p.pid}): ${err}`);
            }
        }
    }

    runningProcesses.delete(slug);

    return { slug, killed, errors };
}
