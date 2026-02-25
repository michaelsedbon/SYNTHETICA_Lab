import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { readFile, mkdir, writeFile, access } from "fs/promises";
import path from "path";
import os from "os";
import archiver from "archiver";
import { PassThrough } from "stream";

const UPLOAD_DIR = process.env.UPLOAD_DIR || "./uploads";

/** Return a path that doesn't collide: foo.zip → foo (1).zip → foo (2).zip … */
async function uniquePath(filePath: string): Promise<string> {
    let candidate = filePath;
    const ext = path.extname(filePath);
    const base = filePath.slice(0, -ext.length || undefined);
    let i = 1;
    while (true) {
        try {
            await access(candidate);
            candidate = `${base} (${i})${ext}`;
            i++;
        } catch {
            return candidate; // doesn't exist → safe to use
        }
    }
}

// POST /api/save-to-downloads
// Body: { partIds: string[] } or { partId: string } (single part)
// Saves files directly to ~/Downloads/ since WKWebView doesn't support browser downloads
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const partIds: string[] = body.partIds || (body.partId ? [body.partId] : []);

        if (partIds.length === 0) {
            return NextResponse.json({ error: "partIds required" }, { status: 400 });
        }

        const downloadsDir = path.join(os.homedir(), "Downloads");
        await mkdir(downloadsDir, { recursive: true });

        // Fetch parts with revisions
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

        // Single part with single file — save the file directly
        if (parts.length === 1 && parts[0].revisions.length === 1) {
            const rev = parts[0].revisions[0];
            const ext = path.extname(rev.fileName) || `.${rev.fileType}`;
            const diskFile = `${rev.uploadStage}_v${rev.versionNumber}${ext}`;
            const filePath = path.join(UPLOAD_DIR, parts[0].id, diskFile);
            const buffer = await readFile(filePath);
            const savePath = await uniquePath(path.join(downloadsDir, rev.fileName));
            await writeFile(savePath, buffer);
            return NextResponse.json({ success: true, path: savePath, fileCount: 1 });
        }

        // Multiple files — create a ZIP in ~/Downloads/
        const zipName = parts.length === 1
            ? `${parts[0].uniqueId}_files.zip`
            : `fab_planner_${parts.length}_parts.zip`;
        const zipPath = path.join(downloadsDir, zipName);

        // Collect all file buffers
        const fileEntries: { name: string; buffer: Buffer }[] = [];

        for (const part of parts) {
            if (part.revisions.length === 0) continue;

            const latestByStage = new Map<string, typeof part.revisions[0]>();
            for (const rev of part.revisions) {
                if (!latestByStage.has(rev.uploadStage)) {
                    latestByStage.set(rev.uploadStage, rev);
                }
            }

            const folderName = parts.length > 1
                ? `${part.uniqueId}_${part.partName.replace(/[^a-zA-Z0-9_-]/g, "_")}`
                : "";

            for (const [stage, rev] of latestByStage) {
                const ext = path.extname(rev.fileName) || `.${rev.fileType}`;
                const diskFile = `${stage}_v${rev.versionNumber}${ext}`;
                const filePath = path.join(UPLOAD_DIR, part.id, diskFile);

                try {
                    const buffer = await readFile(filePath);
                    const stageName = stage.startsWith("custom_") ? stage.replace("custom_", "") : stage;
                    const entryName = folderName
                        ? `${folderName}/${stageName}/${rev.fileName}`
                        : `${stageName}/${rev.fileName}`;
                    fileEntries.push({ name: entryName, buffer });
                } catch {
                    console.warn(`File not found: ${filePath}`);
                }
            }
        }

        if (fileEntries.length === 0) {
            return NextResponse.json({ error: "No files found on disk" }, { status: 404 });
        }

        // Build ZIP in memory then write to disk
        const chunks: Buffer[] = [];
        const passthrough = new PassThrough();
        const archive = archiver("zip", { zlib: { level: 5 } });

        passthrough.on("data", (chunk) => chunks.push(chunk));

        const done = new Promise<void>((resolve, reject) => {
            passthrough.on("end", resolve);
            passthrough.on("error", reject);
        });

        archive.pipe(passthrough);
        for (const entry of fileEntries) {
            archive.append(entry.buffer, { name: entry.name });
        }
        await archive.finalize();
        await done;

        const zipBuffer = Buffer.concat(chunks);
        const finalZipPath = await uniquePath(zipPath);
        await writeFile(finalZipPath, zipBuffer);

        return NextResponse.json({
            success: true,
            path: zipPath,
            fileCount: fileEntries.length,
            zipName,
        });
    } catch (error) {
        console.error("Failed to save to downloads:", error);
        return NextResponse.json({ error: "Failed to save files" }, { status: 500 });
    }
}
