import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { userLog } from "@/lib/logger";
import path from "path";
import { rm } from "fs/promises";

const UPLOAD_DIR = process.env.UPLOAD_DIR || "./uploads";

// PATCH /api/parts/batch — bulk update fields for multiple parts
export async function PATCH(request: Request) {
    try {
        const { ids, updates } = await request.json();

        if (!Array.isArray(ids) || ids.length === 0) {
            return NextResponse.json({ error: "ids array is required" }, { status: 400 });
        }

        if (!updates || typeof updates !== "object" || Object.keys(updates).length === 0) {
            return NextResponse.json({ error: "updates object is required" }, { status: 400 });
        }

        // Whitelist of allowed fields to update
        const ALLOWED_FIELDS = [
            "partName", "status", "material", "orderId", "client",
            "hospital", "notes", "who", "type", "quantity",
            "fabMechanism", "dueDate", "archivePath", "projectId",
        ];

        const safeUpdates: Record<string, unknown> = {};
        for (const key of Object.keys(updates)) {
            if (ALLOWED_FIELDS.includes(key)) {
                safeUpdates[key] = updates[key];
            }
        }

        if (Object.keys(safeUpdates).length === 0) {
            return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
        }

        // Record status history for each part whose status is changing
        if (safeUpdates.status) {
            const currentParts = await prisma.part.findMany({
                where: { id: { in: ids } },
                select: { id: true, status: true },
            });
            const historyEntries = currentParts
                .filter((p) => p.status !== safeUpdates.status)
                .map((p) => ({ partId: p.id, status: safeUpdates.status as string }));
            if (historyEntries.length > 0) {
                await prisma.statusHistory.createMany({ data: historyEntries });
            }
        }

        // Batch update in a single query
        const result = await prisma.part.updateMany({
            where: { id: { in: ids } },
            data: safeUpdates,
        });

        userLog.info(
            "batch_update",
            `Updated ${result.count} part(s): ${Object.entries(safeUpdates).map(([k, v]) => `${k}=${v}`).join(", ")}`
        );

        return NextResponse.json({ updated: result.count });
    } catch (error) {
        console.error("Batch update failed:", error);
        return NextResponse.json({ error: "Batch update failed" }, { status: 500 });
    }
}

// DELETE /api/parts/batch — bulk delete multiple parts
export async function DELETE(request: Request) {
    try {
        const { ids } = await request.json();

        if (!Array.isArray(ids) || ids.length === 0) {
            return NextResponse.json({ error: "ids array is required" }, { status: 400 });
        }

        // Delete revisions first, then parts
        await prisma.revision.deleteMany({
            where: { partId: { in: ids } },
        });

        const result = await prisma.part.deleteMany({
            where: { id: { in: ids } },
        });

        // Clean up uploaded files from disk
        await Promise.all(
            ids.map((id: string) =>
                rm(path.join(UPLOAD_DIR, id), { recursive: true, force: true }).catch(() => { })
            )
        );

        userLog.info(
            "batch_delete",
            `Deleted ${result.count} part(s)`
        );

        return NextResponse.json({ deleted: result.count });
    } catch (error) {
        console.error("Batch delete failed:", error);
        return NextResponse.json({ error: "Batch delete failed" }, { status: 500 });
    }
}
