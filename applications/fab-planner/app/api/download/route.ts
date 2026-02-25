import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { readFile } from "fs/promises";
import path from "path";
import archiver from "archiver";
import { PassThrough } from "stream";

const UPLOAD_DIR = process.env.UPLOAD_DIR || "./uploads";

// Shared zip logic
async function buildZipResponse(partIds: string[]) {
    const parts = await prisma.part.findMany({
        where: { id: { in: partIds } },
        include: {
            revisions: {
                orderBy: { versionNumber: "desc" },
            },
        },
    });

    if (parts.length === 0) {
        return NextResponse.json({ error: "No parts found" }, { status: 404 });
    }

    const totalRevisions = parts.reduce((sum, p) => sum + p.revisions.length, 0);
    if (totalRevisions === 0) {
        return NextResponse.json({ error: "No files to download" }, { status: 404 });
    }

    // Buffer the entire zip in memory to avoid stream race conditions
    const chunks: Buffer[] = [];
    const passthrough = new PassThrough();
    const archive = archiver("zip", { zlib: { level: 5 } });

    passthrough.on("data", (chunk) => chunks.push(chunk));

    const done = new Promise<void>((resolve, reject) => {
        passthrough.on("end", resolve);
        passthrough.on("error", reject);
        archive.on("error", reject);
    });

    archive.pipe(passthrough);

    for (const part of parts) {
        if (part.revisions.length === 0) continue;

        const latestByStage = new Map<string, typeof part.revisions[0]>();
        for (const rev of part.revisions) {
            if (!latestByStage.has(rev.uploadStage)) {
                latestByStage.set(rev.uploadStage, rev);
            }
        }

        const folderName = `${part.uniqueId}_${part.partName.replace(/[^a-zA-Z0-9_-]/g, "_")}`;

        for (const [stage, rev] of latestByStage) {
            const ext = path.extname(rev.fileName) || `.${rev.fileType}`;
            const diskFile = `${stage}_v${rev.versionNumber}${ext}`;
            const filePath = path.join(UPLOAD_DIR, part.id, diskFile);

            try {
                const buffer = await readFile(filePath);
                const stageName = stage.startsWith("custom_") ? stage.replace("custom_", "") : stage;
                archive.append(buffer, { name: `${folderName}/${stageName}/${rev.fileName}` });
            } catch {
                console.warn(`File not found for zip: ${filePath}`);
            }
        }
    }

    await archive.finalize();
    await done;

    const zipBuffer = Buffer.concat(chunks);

    const zipName = parts.length === 1
        ? `${parts[0].uniqueId}_files.zip`
        : `fab_planner_${parts.length}_parts.zip`;

    return new Response(zipBuffer, {
        headers: {
            "Content-Type": "application/zip",
            "Content-Disposition": `attachment; filename="${zipName}"`,
            "Content-Length": String(zipBuffer.length),
        },
    });
}

// GET /api/download?partIds=id1,id2,id3 — for WKWebView (direct navigation)
export async function GET(request: Request) {
    try {
        const url = new URL(request.url);
        const partIdsParam = url.searchParams.get("partIds");
        if (!partIdsParam) {
            return NextResponse.json({ error: "partIds query param required" }, { status: 400 });
        }
        const partIds = partIdsParam.split(",").filter(Boolean);
        if (partIds.length === 0) {
            return NextResponse.json({ error: "partIds array is required" }, { status: 400 });
        }
        return buildZipResponse(partIds);
    } catch (error) {
        console.error("Failed to create bulk zip:", error);
        return NextResponse.json({ error: "Failed to create zip" }, { status: 500 });
    }
}

// POST /api/download — zip files for multiple parts
// Body: { partIds: string[] }
export async function POST(request: Request) {
    try {
        const { partIds } = await request.json();

        if (!Array.isArray(partIds) || partIds.length === 0) {
            return NextResponse.json({ error: "partIds array is required" }, { status: 400 });
        }

        // Fetch parts with their revisions
        const parts = await prisma.part.findMany({
            where: { id: { in: partIds } },
            include: {
                revisions: {
                    orderBy: { versionNumber: "desc" },
                },
            },
        });

        if (parts.length === 0) {
            return NextResponse.json({ error: "No parts found" }, { status: 404 });
        }

        // Check if any part has files
        const totalRevisions = parts.reduce((sum, p) => sum + p.revisions.length, 0);
        if (totalRevisions === 0) {
            return NextResponse.json({ error: "No files to download" }, { status: 404 });
        }

        // Create ZIP archive
        const passthrough = new PassThrough();
        const archive = archiver("zip", { zlib: { level: 5 } });
        archive.pipe(passthrough);

        for (const part of parts) {
            if (part.revisions.length === 0) continue;

            // Pick latest revision per upload stage
            const latestByStage = new Map<string, typeof part.revisions[0]>();
            for (const rev of part.revisions) {
                if (!latestByStage.has(rev.uploadStage)) {
                    latestByStage.set(rev.uploadStage, rev);
                }
            }

            // Use part uniqueId as folder name inside ZIP
            const folderName = `${part.uniqueId}_${part.partName.replace(/[^a-zA-Z0-9_-]/g, "_")}`;

            for (const [stage, rev] of latestByStage) {
                const ext = path.extname(rev.fileName) || `.${rev.fileType}`;
                const diskFile = `${stage}_v${rev.versionNumber}${ext}`;
                const filePath = path.join(UPLOAD_DIR, part.id, diskFile);

                try {
                    const buffer = await readFile(filePath);
                    const stageName = stage.startsWith("custom_") ? stage.replace("custom_", "") : stage;
                    archive.append(buffer, { name: `${folderName}/${stageName}/${rev.fileName}` });
                } catch {
                    console.warn(`File not found for zip: ${filePath}`);
                }
            }
        }

        await archive.finalize();

        // Convert PassThrough stream to Web ReadableStream
        const webStream = new ReadableStream({
            start(controller) {
                passthrough.on("data", (chunk) => controller.enqueue(chunk));
                passthrough.on("end", () => controller.close());
                passthrough.on("error", (err) => controller.error(err));
            },
        });

        const zipName = parts.length === 1
            ? `${parts[0].uniqueId}_files.zip`
            : `fab_planner_${parts.length}_parts.zip`;

        return new Response(webStream, {
            headers: {
                "Content-Type": "application/zip",
                "Content-Disposition": `attachment; filename="${zipName}"`,
            },
        });
    } catch (error) {
        console.error("Failed to create bulk zip:", error);
        return NextResponse.json({ error: "Failed to create zip" }, { status: 500 });
    }
}
