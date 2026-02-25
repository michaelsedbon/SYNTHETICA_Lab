import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { userLog } from "@/lib/logger";

// POST /api/parts/restore — re-create a previously deleted part with its original ID
// Used by the undo system to restore deleted parts
export async function POST(request: Request) {
    try {
        const body = await request.json();

        if (!body.id || !body.uniqueId || !body.partName) {
            return NextResponse.json({ error: "id, uniqueId, and partName are required" }, { status: 400 });
        }

        // Resolve workspaceId — from body or default
        let workspaceId = body.workspaceId;
        if (!workspaceId) {
            const defaultWs = await prisma.workspace.findUnique({ where: { slug: "default" } });
            if (defaultWs) workspaceId = defaultWs.id;
        }

        const part = await prisma.part.create({
            data: {
                id: body.id,
                uniqueId: body.uniqueId,
                partName: body.partName,
                orderId: body.orderId || null,
                status: body.status || "new",
                material: body.material || null,
                notes: body.notes || null,
                archivePath: body.archivePath || null,
                project: body.project || null,
                client: body.client || null,
                hospital: body.hospital || null,
                who: body.who || null,
                type: body.type || null,
                quantity: body.quantity ?? 1,
                fabMechanism: body.fabMechanism || null,
                priorityOrder: body.priorityOrder ?? 0,
                dueDate: body.dueDate ? new Date(body.dueDate) : null,
                projectId: body.projectId || null,
                workspaceId,
                completedAt: body.completedAt ? new Date(body.completedAt) : null,
            },
        });

        userLog.info("part_restored", `Restored part ${part.partName} (${part.uniqueId})`, part.id);

        return NextResponse.json(part, { status: 201 });
    } catch (error) {
        console.error("Failed to restore part:", error);
        return NextResponse.json({ error: "Failed to restore part" }, { status: 500 });
    }
}
