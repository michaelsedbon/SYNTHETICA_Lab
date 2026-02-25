import { prisma } from "./prisma";
import fs from "fs";
import path from "path";

export type LogLevel = "info" | "warn" | "error";
export type LogCategory = "app" | "user";

interface LogEntry {
    category: LogCategory;
    level: LogLevel;
    action: string;
    details?: string;
    partId?: string;
}

const LOG_DIR = path.join(process.cwd(), "logs");
const USER_LOG_FILE = path.join(LOG_DIR, "user_actions.log");
const APP_LOG_FILE = path.join(LOG_DIR, "app_events.log");

/** Append a log line to the appropriate file */
function writeToFile(entry: LogEntry): void {
    try {
        if (!fs.existsSync(LOG_DIR)) {
            fs.mkdirSync(LOG_DIR, { recursive: true });
        }
        const timestamp = new Date().toISOString();
        const line = `[${timestamp}] [${entry.level.toUpperCase()}] ${entry.action}${entry.details ? " | " + entry.details : ""}${entry.partId ? " | partId=" + entry.partId : ""}\n`;
        const file = entry.category === "user" ? USER_LOG_FILE : APP_LOG_FILE;
        fs.appendFileSync(file, line, "utf-8");
    } catch (err) {
        console.error("[Logger] Failed to write log file:", err);
    }
}

/**
 * Log an entry to the database + local file backup.
 * - category "app"  → system events (sync, errors, startup)
 * - category "user" → user actions (edit field, reorder, upload)
 */
export async function log(entry: LogEntry): Promise<void> {
    // Always write to file first (synchronous, reliable)
    writeToFile(entry);

    try {
        await prisma.logEntry.create({
            data: {
                category: entry.category,
                level: entry.level,
                action: entry.action,
                details: entry.details || null,
                partId: entry.partId || null,
            },
        });
    } catch (err) {
        // Fallback to console if DB logging fails
        console.error("[Logger] Failed to write log:", err);
        console.log(`[${entry.category}/${entry.level}] ${entry.action}`, entry.details || "");
    }
}

/** Shorthand for app-level logs */
export const appLog = {
    info: (action: string, details?: string) =>
        log({ category: "app", level: "info", action, details }),
    warn: (action: string, details?: string) =>
        log({ category: "app", level: "warn", action, details }),
    error: (action: string, details?: string) =>
        log({ category: "app", level: "error", action, details }),
};

/** Shorthand for user action logs */
export const userLog = {
    info: (action: string, details?: string, partId?: string) =>
        log({ category: "user", level: "info", action, details, partId }),
    warn: (action: string, details?: string, partId?: string) =>
        log({ category: "user", level: "warn", action, details, partId }),
};
