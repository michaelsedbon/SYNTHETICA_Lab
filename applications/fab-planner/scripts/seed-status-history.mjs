/**
 * One-time seed script: creates initial StatusHistory entries
 * for all existing parts using their current status and createdAt.
 *
 * Usage: node scripts/seed-status-history.mjs
 */
import { PrismaClient } from "../app/generated/prisma/client.js";

const prisma = new PrismaClient();

try {
    const parts = await prisma.part.findMany({
        select: { id: true, status: true, createdAt: true },
    });

    // Skip parts that already have history
    const existing = await prisma.statusHistory.findMany({
        select: { partId: true },
        distinct: ["partId"],
    });
    const existingIds = new Set(existing.map((e) => e.partId));
    const toSeed = parts.filter((p) => !existingIds.has(p.id));

    if (toSeed.length === 0) {
        console.log("All parts already have status history — nothing to seed.");
    } else {
        await prisma.statusHistory.createMany({
            data: toSeed.map((p) => ({
                partId: p.id,
                status: p.status,
                changedAt: p.createdAt,
            })),
        });
        console.log(`Seeded status history for ${toSeed.length} existing parts.`);
    }
} finally {
    await prisma.$disconnect();
}
