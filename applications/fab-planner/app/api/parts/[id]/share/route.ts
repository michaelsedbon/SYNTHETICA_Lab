import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// POST /api/parts/[id]/share — share a part to another workspace
export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: partId } = await params;
        const body = await request.json();
        const { targetWorkspaceId, targetProjectId } = body;

        if (!targetWorkspaceId) {
            return NextResponse.json({ error: "targetWorkspaceId is required" }, { status: 400 });
        }

        // Verify part exists
        const part = await prisma.part.findUnique({ where: { id: partId } });
        if (!part) {
            return NextResponse.json({ error: "Part not found" }, { status: 404 });
        }

        // Can't share to own workspace
        if (part.workspaceId === targetWorkspaceId) {
            return NextResponse.json({ error: "Part already belongs to this workspace" }, { status: 400 });
        }

        // Get max local priority in target workspace
        const maxPriority = await prisma.workspacePart.aggregate({
            where: { workspaceId: targetWorkspaceId },
            _max: { localPriority: true },
        });

        const link = await prisma.workspacePart.create({
            data: {
                workspaceId: targetWorkspaceId,
                partId,
                targetProjectId: targetProjectId || null,
                localPriority: (maxPriority._max.localPriority ?? 0) + 1,
            },
        });

        return NextResponse.json(link, { status: 201 });
    } catch (error: unknown) {
        // Handle unique constraint (already shared)
        if (error instanceof Error && error.message?.includes("Unique constraint")) {
            return NextResponse.json({ error: "Part is already shared to this workspace" }, { status: 409 });
        }
        console.error("Failed to share part:", error);
        return NextResponse.json({ error: "Failed to share part" }, { status: 500 });
    }
}

// DELETE /api/parts/[id]/share — unshare a part from a workspace
export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: partId } = await params;
        const { searchParams } = new URL(request.url);
        const workspaceId = searchParams.get("workspaceId");

        if (!workspaceId) {
            return NextResponse.json({ error: "workspaceId query param is required" }, { status: 400 });
        }

        await prisma.workspacePart.deleteMany({
            where: { partId, workspaceId },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Failed to unshare part:", error);
        return NextResponse.json({ error: "Failed to unshare part" }, { status: 500 });
    }
}
