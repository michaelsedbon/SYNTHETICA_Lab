import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { readFile } from "fs/promises";
import path from "path";

const UPLOAD_DIR = process.env.UPLOAD_DIR || "./uploads";

// GET /api/files/:partId/:filename — serve uploaded files
export async function GET(
    _request: Request,
    { params }: { params: Promise<{ partId: string; filename: string }> }
) {
    try {
        const { partId, filename } = await params;
        const filePath = path.join(UPLOAD_DIR, partId, filename);

        const buffer = await readFile(filePath);

        // Try to find the original filename from the revision record
        let downloadName = filename;
        const ext = path.extname(filename).toLowerCase();

        // filename is like "design_v2.stl" — extract stage and version number
        const versionMatch = filename.match(/^(.+?)_v(\d+)\./);
        if (versionMatch) {
            const uploadStage = versionMatch[1];
            const versionNumber = parseInt(versionMatch[2], 10);
            const revision = await prisma.revision.findFirst({
                where: { partId, uploadStage, versionNumber },
            });
            if (revision) {
                downloadName = revision.fileName;
            }
        }

        let contentType = "application/octet-stream";
        if (ext === ".stl") contentType = "model/stl";
        else if (ext === ".step" || ext === ".stp") contentType = "model/step";
        else if (ext === ".fbx") contentType = "application/octet-stream";
        else if (ext === ".gcode" || ext === ".nc") contentType = "text/plain";
        else if (ext === ".pdf") contentType = "application/pdf";
        else if (ext === ".png") contentType = "image/png";
        else if (ext === ".jpg" || ext === ".jpeg") contentType = "image/jpeg";
        else if (ext === ".svg") contentType = "image/svg+xml";
        else if (ext === ".dxf") contentType = "application/dxf";

        // For images/PDFs, use inline disposition for preview unless ?download=1 is set
        const inlineTypes = ["image/png", "image/jpeg", "image/svg+xml", "application/pdf"];
        const url = new URL(_request.url);
        const forceDownload = url.searchParams.get("download") === "1";
        const disposition = forceDownload ? "attachment" : (inlineTypes.includes(contentType) ? "inline" : "attachment");

        return new Response(buffer, {
            headers: {
                "Content-Type": contentType,
                "Content-Disposition": `${disposition}; filename="${encodeURIComponent(downloadName)}"`,
            },
        });
    } catch (error) {
        console.error("File not found:", error);
        return NextResponse.json({ error: "File not found" }, { status: 404 });
    }
}
