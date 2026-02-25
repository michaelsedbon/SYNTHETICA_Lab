/**
 * One-time seed script: creates initial StatusHistory entries
 * for all existing parts using their current status and createdAt.
 *
 * Usage: npx tsx scripts/seed-status-history.ts
 */

// Re-use the app's prisma singleton via dynamic import
async function main() {
    // Load .env so DATABASE_URL is available
    const dotenv = await import("dotenv");
    dotenv.config();

    const { prisma } = await import("../lib/prisma.js");

    const parts = await prisma.part.findMany({
        select: { id: true, status: true, createdAt: true },
    });

    // Skip parts that already have history
    const existing = await prisma.statusHistory.findMany({
        select: { partId: true },
        distinct: ["partId" as const],
    });
    const existingIds = new Set(existing.map((e: { partId: string }) => e.partId));
    const toSeed = parts.filter((p: { id: string }) => !existingIds.has(p.id));

    if (toSeed.length === 0) {
        console.log("All parts already have status history — nothing to seed.");
        return;
    }

    await prisma.statusHistory.createMany({
        data: toSeed.map((p: { id: string; status: string; createdAt: Date }) => ({
            partId: p.id,
            status: p.status,
            changedAt: p.createdAt,
        })),
    });

    console.log(`Seeded status history for ${toSeed.length} existing parts.`);
}

main().catch((err: unknown) => {
    console.error("Seed failed:", err);
    process.exit(1);
});
