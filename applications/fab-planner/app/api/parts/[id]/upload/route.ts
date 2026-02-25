import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import path from "path";
import { writeFile, mkdir } from "fs/promises";

const UPLOAD_DIR = process.env.UPLOAD_DIR || "./uploads";

// POST /api/parts/:id/upload — upload a new file revision
export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: partId } = await params;

        // Verify part exists
        const part = await prisma.part.findUnique({ where: { id: partId } });
        if (!part) {
            return NextResponse.json({ error: "Part not found" }, { status: 404 });
        }

        const formData = await request.formData();
        const file = formData.get("file") as File | null;
        const uploadStage = (formData.get("uploadStage") as string) || "design";
        const uploadedBy = (formData.get("uploadedBy") as string) || "unknown";

        if (!file) {
            return NextResponse.json({ error: "No file provided" }, { status: 400 });
        }

        // Determine next version number — scoped per uploadStage
        const lastRevision = await prisma.revision.findFirst({
            where: { partId, uploadStage },
            orderBy: { versionNumber: "desc" },
        });
        const nextVersion = (lastRevision?.versionNumber ?? 0) + 1;

        // Create upload directory
        const partDir = path.join(UPLOAD_DIR, partId);
        await mkdir(partDir, { recursive: true });

        // Determine file type — prefix disk file with stage to avoid collisions
        const ext = path.extname(file.name).toLowerCase();
        const fileName = `${uploadStage}_v${nextVersion}${ext}`;
        const filePath = path.join(partDir, fileName);

        // Write file to disk
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        await writeFile(filePath, buffer);

        // Create revision record
        const revision = await prisma.revision.create({
            data: {
                partId,
                versionNumber: nextVersion,
                fileName: file.name,
                filePath: filePath,
                fileType: ext.replace(".", ""),
                uploadedBy,
                uploadStage,
            },
        });

        return NextResponse.json(revision, { status: 201 });
    } catch (error) {
        console.error("Failed to upload file:", error);
        return NextResponse.json({ error: "Failed to upload file" }, { status: 500 });
    }
}
