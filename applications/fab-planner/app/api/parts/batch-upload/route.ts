import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { userLog, appLog } from "@/lib/logger";
import path from "path";
import { writeFile, mkdir } from "fs/promises";

const UPLOAD_DIR = process.env.UPLOAD_DIR || "./uploads";

// Map file extensions to upload stages
const STAGE_MAP: Record<string, string> = {
    // 3D Design files → "design"
    stl: "design",
    step: "design",
    stp: "design",
    obj: "design",
    "3mf": "design",
    iges: "design",
    igs: "design",
    fbx: "design",
    glb: "design",
    gltf: "design",
    // 2D Drawing files → "2d_drawing"
    dxf: "2d_drawing",
    dwg: "2d_drawing",
    svg: "2d_drawing",
    ai: "2d_drawing",
    pdf: "2d_drawing",
    png: "2d_drawing",
    jpg: "2d_drawing",
    jpeg: "2d_drawing",
    tif: "2d_drawing",
    tiff: "2d_drawing",
    bmp: "2d_drawing",
    // CNC program files → "cnc_program"
    gcode: "cnc_program",
    nc: "cnc_program",
    ngc: "cnc_program",
    tap: "cnc_program",
    cnc: "cnc_program",
};

function detectStage(fileName: string): string {
    const ext = path.extname(fileName).toLowerCase().replace(".", "");
    return STAGE_MAP[ext] || "document";
}

// POST /api/parts/batch-upload — create parts from dropped files
export async function POST(request: Request) {
    try {
        const formData = await request.formData();
        const files = formData.getAll("files") as File[];
        const projectId = (formData.get("projectId") as string) || null;
        let workspaceId = (formData.get("workspaceId") as string) || null;

        if (!files.length) {
            return NextResponse.json({ error: "No files provided" }, { status: 400 });
        }

        // Resolve workspaceId — fallback to default
        if (!workspaceId) {
            const defaultWs = await prisma.workspace.findFirst({ orderBy: { createdAt: "asc" } });
            if (defaultWs) workspaceId = defaultWs.id;
            else return NextResponse.json({ error: "No workspace found" }, { status: 500 });
        }

        const created = [];

        for (const file of files) {
            // Derive part name from filename (without extension)
            const ext = path.extname(file.name).toLowerCase();
            const partName = path.basename(file.name, ext) || file.name;
            const uploadStage = detectStage(file.name);

            // Generate unique ID (FAB-XXXX)
            const counter = await prisma.counter.upsert({
                where: { id: "part_seq" },
                update: { value: { increment: 1 } },
                create: { id: "part_seq", value: 1 },
            });
            const uniqueId = `FAB-${String(counter.value).padStart(4, "0")}`;

            // Get next priority order
            const maxPriority = await prisma.part.aggregate({
                _max: { priorityOrder: true },
            });

            // Create the part
            const part = await prisma.part.create({
                data: {
                    uniqueId,
                    partName,
                    status: "new",
                    projectId,
                    workspaceId,
                    priorityOrder: (maxPriority._max.priorityOrder ?? 0) + 1,
                },
            });

            // Write file to disk
            const partDir = path.join(UPLOAD_DIR, part.id);
            await mkdir(partDir, { recursive: true });

            const diskName = `${uploadStage}_v1${ext}`;
            const filePath = path.join(partDir, diskName);
            const bytes = await file.arrayBuffer();
            await writeFile(filePath, Buffer.from(bytes));

            // Create revision record
            await prisma.revision.create({
                data: {
                    partId: part.id,
                    versionNumber: 1,
                    fileName: file.name,
                    filePath,
                    fileType: ext.replace(".", ""),
                    uploadedBy: "drag-drop",
                    uploadStage,
                },
            });

            created.push({ ...part, uploadStage });
        }

        userLog.info(
            "batch_upload",
            `Created ${created.length} part(s) from dropped files: ${created.map((p) => `${p.partName} (${p.uploadStage})`).join(", ")}`
        );

        return NextResponse.json({ created, count: created.length }, { status: 201 });
    } catch (error) {
        console.error("Batch upload failed:", error);
        appLog.error("batch_upload_failed", String(error));
        return NextResponse.json({ error: "Batch upload failed" }, { status: 500 });
    }
}

