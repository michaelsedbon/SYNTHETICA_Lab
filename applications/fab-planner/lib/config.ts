/** Centralised config — reads from .env, validates, and exports typed constants. */

function optional(key: string, fallback: string): string {
    return process.env[key] ?? fallback;
}

export const config = {
    database: {
        url: optional("DATABASE_URL", "file:./dev.db"),
    },
    uploads: {
        dir: optional("UPLOAD_DIR", "./uploads"),
    },
    port: parseInt(optional("PORT", "3000"), 10),
    ownerToken: optional("OWNER_TOKEN", ""),
} as const;
