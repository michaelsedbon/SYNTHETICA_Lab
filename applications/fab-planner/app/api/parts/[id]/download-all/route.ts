import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { readFile } from "fs/promises";
import path from "path";
import archiver from "archiver";
import { Readable, PassThrough } from "stream";

const UPLOAD_DIR = process.env.UPLOAD_DIR || "./uploads";

// GET /api/parts/:id/download-all — zip latest revision per upload stage
export async function GET(
    _request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: partId } = await params;

        const part = await prisma.part.findUnique({ where: { id: partId } });
        if (!part) {
            return NextResponse.json({ error: "Part not found" }, { status: 404 });
        }

        // Get all revisions for this part
        const revisions = await prisma.revision.findMany({
            where: { partId },
            orderBy: { versionNumber: "desc" },
        });

        if (revisions.length === 0) {
            return NextResponse.json({ error: "No files to download" }, { status: 404 });
        }

        // Pick latest revision per uploadStage
        const latestByStage = new Map<string, typeof revisions[0]>();
        for (const rev of revisions) {
            if (!latestByStage.has(rev.uploadStage)) {
                latestByStage.set(rev.uploadStage, rev);
            }
        }

        // Create ZIP archive
        const passthrough = new PassThrough();
        const archive = archiver("zip", { zlib: { level: 5 } });
        archive.pipe(passthrough);

        for (const [stage, rev] of latestByStage) {
            const ext = path.extname(rev.fileName) || `.${rev.fileType}`;
            const diskFile = `${stage}_v${rev.versionNumber}${ext}`;
            const filePath = path.join(UPLOAD_DIR, partId, diskFile);

            try {
                const buffer = await readFile(filePath);
                // Use a folder per stage inside the ZIP
                const stageName = stage.startsWith("custom_") ? stage.replace("custom_", "") : stage;
                archive.append(buffer, { name: `${stageName}/${rev.fileName}` });
            } catch {
                // Skip files that don't exist on disk
                console.warn(`File not found for zip: ${filePath}`);
            }
        }

        await archive.finalize();

        // Convert PassThrough stream to a Web ReadableStream
        const webStream = new ReadableStream({
            start(controller) {
                passthrough.on("data", (chunk) => controller.enqueue(chunk));
                passthrough.on("end", () => controller.close());
                passthrough.on("error", (err) => controller.error(err));
            },
        });

        const zipName = `${part.uniqueId}_files.zip`;

        return new Response(webStream, {
            headers: {
                "Content-Type": "application/zip",
                "Content-Disposition": `attachment; filename="${zipName}"`,
            },
        });
    } catch (error) {
        console.error("Failed to create zip:", error);
        return NextResponse.json({ error: "Failed to create zip" }, { status: 500 });
    }
}
