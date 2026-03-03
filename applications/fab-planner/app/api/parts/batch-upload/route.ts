import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { userLog, appLog } from "@/lib/logger";
import path from "path";
import { writeFile, mkdir } from "fs/promises";
import AdmZip from "adm-zip";

const UPLOAD_DIR = process.env.UPLOAD_DIR || "./uploads";

// Map file extensions to upload stages
const STAGE_MAP: Record<string, string> = {
    // 3D Design files → "design"
    stl: "design",
    obj: "design",
    "3mf": "design",
    fbx: "design",
    glb: "design",
    gltf: "design",
    // CAD files → "cad"
    f3d: "cad",
    sldprt: "cad",
    sldasm: "cad",
    slddrw: "cad",
    iges: "cad",
    igs: "cad",
    x_t: "cad",
    x_b: "cad",
    // STEP files → "step"
    step: "step",
    stp: "step",
    // 2D Drawing files → "2d_drawing"
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

    // DXF files: check if name contains "Laser Cut" → laser_cutting, else 2d_drawing
    if (ext === "dxf") {
        if (fileName.toLowerCase().includes("laser cut")) {
            return "laser_cutting";
        }
        return "2d_drawing";
    }

    return STAGE_MAP[ext] || "document";
}

// Helper: check if a ZIP entry should be skipped (macOS metadata, etc.)
function shouldSkipEntry(entryName: string): boolean {
    if (entryName.startsWith("__MACOSX/")) return true;
    if (entryName.startsWith("._")) return true;
    const baseName = path.basename(entryName);
    if (baseName === ".DS_Store") return true;
    if (baseName.startsWith("._")) return true;
    return false;
}

// Handle a single non-ZIP file → creates a new part
async function createPartFromFile(
    file: File,
    workspaceId: string,
    projectId: string | null
) {
    const ext = path.extname(file.name).toLowerCase();
    const partName = path.basename(file.name, ext) || file.name;
    const uploadStage = detectStage(file.name);

    const counter = await prisma.counter.upsert({
        where: { id: "part_seq" },
        update: { value: { increment: 1 } },
        create: { id: "part_seq", value: 1 },
    });
    const uniqueId = `FAB-${String(counter.value).padStart(4, "0")}`;

    const maxPriority = await prisma.part.aggregate({
        _max: { priorityOrder: true },
    });

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

    const partDir = path.join(UPLOAD_DIR, part.id);
    await mkdir(partDir, { recursive: true });

    const diskName = `${uploadStage}_v1${ext}`;
    const filePath = path.join(partDir, diskName);
    const bytes = await file.arrayBuffer();
    await writeFile(filePath, Buffer.from(bytes));

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

    // Seed initial status history
    await prisma.statusHistory.create({
        data: { partId: part.id, status: part.status, changedAt: part.createdAt },
    });

    return { ...part, uploadStage };
}

// Handle a ZIP file → creates ONE part with multiple file revisions
async function createPartFromZip(
    zipBuffer: Buffer,
    zipFileName: string,
    workspaceId: string,
    projectId: string | null
) {
    const zipExt = path.extname(zipFileName).toLowerCase();
    const partName = path.basename(zipFileName, zipExt) || zipFileName;

    const counter = await prisma.counter.upsert({
        where: { id: "part_seq" },
        update: { value: { increment: 1 } },
        create: { id: "part_seq", value: 1 },
    });
    const uniqueId = `FAB-${String(counter.value).padStart(4, "0")}`;

    const maxPriority = await prisma.part.aggregate({
        _max: { priorityOrder: true },
    });

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

    // Seed initial status history
    await prisma.statusHistory.create({
        data: { partId: part.id, status: part.status, changedAt: part.createdAt },
    });

    const partDir = path.join(UPLOAD_DIR, part.id);
    await mkdir(partDir, { recursive: true });

    // Extract ZIP entries
    const zip = new AdmZip(zipBuffer);
    const entries = zip.getEntries();

    // Track version numbers per stage
    const stageVersions: Record<string, number> = {};
    const uploadedFiles: string[] = [];

    for (const entry of entries) {
        // Skip directories and macOS metadata
        if (entry.isDirectory) continue;
        if (shouldSkipEntry(entry.entryName)) continue;

        const fileName = path.basename(entry.entryName);
        const ext = path.extname(fileName).toLowerCase();
        const uploadStage = detectStage(fileName);

        // Increment version for this stage
        stageVersions[uploadStage] = (stageVersions[uploadStage] || 0) + 1;
        const version = stageVersions[uploadStage];

        const diskName = `${uploadStage}_v${version}${ext}`;
        const filePath = path.join(partDir, diskName);

        // Write the file
        const data = entry.getData();
        await writeFile(filePath, data);

        // Create revision
        await prisma.revision.create({
            data: {
                partId: part.id,
                versionNumber: version,
                fileName,
                filePath,
                fileType: ext.replace(".", ""),
                uploadedBy: "zip-import",
                uploadStage,
            },
        });

        uploadedFiles.push(`${fileName} → ${uploadStage}`);
    }

    return { part: { ...part, uploadStage: "zip" }, fileCount: uploadedFiles.length, files: uploadedFiles };
}

// POST /api/parts/batch-upload — create parts from dropped files (incl. ZIP)
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
            const ext = path.extname(file.name).toLowerCase();

            if (ext === ".zip") {
                // ZIP file → create one part with all files categorised
                const buffer = Buffer.from(await file.arrayBuffer());
                const result = await createPartFromZip(buffer, file.name, workspaceId, projectId);
                created.push(result.part);

                userLog.info(
                    "zip_import",
                    `Created part "${result.part.partName}" from ZIP with ${result.fileCount} files: ${result.files.join(", ")}`
                );
            } else {
                // Regular file → create one part per file (existing behaviour)
                const part = await createPartFromFile(file, workspaceId, projectId);
                created.push(part);
            }
        }

        userLog.info(
            "batch_upload",
            `Created ${created.length} part(s) from dropped files: ${created.map((p) => `${p.partName}`).join(", ")}`
        );

        return NextResponse.json({ created, count: created.length }, { status: 201 });
    } catch (error) {
        console.error("Batch upload failed:", error);
        appLog.error("batch_upload_failed", String(error));
        return NextResponse.json({ error: "Batch upload failed" }, { status: 500 });
    }
}
