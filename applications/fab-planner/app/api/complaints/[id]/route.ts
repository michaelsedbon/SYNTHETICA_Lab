import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rm } from "fs/promises";
import path from "path";

// PATCH /api/complaints/[id] — update text and/or status
export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();
        const data: Record<string, string> = {};

        if (body.text !== undefined) data.text = body.text;
        if (body.status !== undefined) {
            const allowed = ["open", "in-progress", "resolved", "abandoned"];
            if (!allowed.includes(body.status)) {
                return NextResponse.json({ error: `Invalid status. Allowed: ${allowed.join(", ")}` }, { status: 400 });
            }
            data.status = body.status;
        }

        if (Object.keys(data).length === 0) {
            return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
        }

        const complaint = await prisma.complaint.update({
            where: { id },
            data,
            include: { attachments: true },
        });

        return NextResponse.json(complaint);
    } catch (error) {
        console.error("Failed to update complaint:", error);
        return NextResponse.json({ error: "Failed to update complaint" }, { status: 500 });
    }
}

// DELETE /api/complaints/[id] — delete complaint and its files
export async function DELETE(
    _request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        // Delete uploaded files
        const uploadDir = path.join(process.cwd(), "uploads", "complaints", id);
        try {
            await rm(uploadDir, { recursive: true, force: true });
        } catch {
            // Directory might not exist
        }

        await prisma.complaint.delete({ where: { id } });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Failed to delete complaint:", error);
        return NextResponse.json({ error: "Failed to delete complaint" }, { status: 500 });
    }
}
