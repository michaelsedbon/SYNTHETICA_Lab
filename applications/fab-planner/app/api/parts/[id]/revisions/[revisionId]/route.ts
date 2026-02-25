import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import path from "path";
import { unlink } from "fs/promises";

const UPLOAD_DIR = process.env.UPLOAD_DIR || "./uploads";

// DELETE /api/parts/:partId/revisions/:revisionId — delete a single revision and its file
export async function DELETE(
    _request: Request,
    { params }: { params: Promise<{ id: string; revisionId: string }> }
) {
    try {
        const { id: partId, revisionId } = await params;

        // Find the revision
        const revision = await prisma.revision.findFirst({
            where: { id: revisionId, partId },
        });

        if (!revision) {
            return NextResponse.json({ error: "Revision not found" }, { status: 404 });
        }

        // Delete from database
        await prisma.revision.delete({ where: { id: revisionId } });

        // Delete file from disk
        const ext = path.extname(revision.fileName) || `.${revision.fileType}`;
        const diskFile = `${revision.uploadStage}_v${revision.versionNumber}${ext}`;
        const filePath = path.join(UPLOAD_DIR, partId, diskFile);
        await unlink(filePath).catch(() => { });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Failed to delete revision:", error);
        return NextResponse.json({ error: "Failed to delete revision" }, { status: 500 });
    }
}
