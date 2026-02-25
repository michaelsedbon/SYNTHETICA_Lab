import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/settings — return settings (workspace-scoped if workspaceId provided, else global)
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const workspaceId = searchParams.get("workspaceId");

        if (workspaceId) {
            // Workspace-scoped settings
            const rows = await prisma.workspaceSettings.findMany({
                where: { workspaceId },
            });
            const result: Record<string, unknown> = {};
            for (const row of rows) {
                try {
                    result[row.key] = JSON.parse(row.value);
                } catch {
                    result[row.key] = row.value;
                }
            }
            return NextResponse.json(result);
        }

        // Fallback: global app settings
        const rows = await prisma.appSettings.findMany();
        const result: Record<string, unknown> = {};
        for (const row of rows) {
            try {
                result[row.key] = JSON.parse(row.value);
            } catch {
                result[row.key] = row.value;
            }
        }
        return NextResponse.json(result);
    } catch (error) {
        console.error("Failed to load settings:", error);
        return NextResponse.json({}, { status: 500 });
    }
}

// PUT /api/settings — upsert a setting (workspace-scoped if workspaceId provided)
export async function PUT(req: Request) {
    try {
        const body = await req.json();
        const { key, value, workspaceId } = body;
        if (!key) {
            return NextResponse.json({ error: "key is required" }, { status: 400 });
        }

        const serialized = typeof value === "string" ? value : JSON.stringify(value);

        if (workspaceId) {
            await prisma.workspaceSettings.upsert({
                where: { workspaceId_key: { workspaceId, key } },
                create: { workspaceId, key, value: serialized },
                update: { value: serialized },
            });
        } else {
            await prisma.appSettings.upsert({
                where: { key },
                create: { key, value: serialized },
                update: { value: serialized },
            });
        }

        return NextResponse.json({ ok: true });
    } catch (error) {
        console.error("Failed to save setting:", error);
        return NextResponse.json({ error: "Failed to save" }, { status: 500 });
    }
}
