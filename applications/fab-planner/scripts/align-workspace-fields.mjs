import pkg from "@prisma/client";
const { PrismaClient } = pkg;

const prisma = new PrismaClient();

const BUILT_IN_FIELDS = [
    { key: "status", label: "Status", icon: "🔄", fieldType: "select", builtIn: true, sortOrder: 0 },
    { key: "material", label: "Material", icon: "🧱", fieldType: "select", builtIn: true, sortOrder: 1 },
    { key: "client", label: "Client", icon: "👤", fieldType: "select", builtIn: true, sortOrder: 2 },
    { key: "hospital", label: "Hospital", icon: "🏥", fieldType: "select", builtIn: true, sortOrder: 3 },
    { key: "who", label: "Who", icon: "🙋", fieldType: "select", builtIn: true, sortOrder: 4 },
    { key: "type", label: "Type", icon: "📋", fieldType: "select", builtIn: true, sortOrder: 5 },
    { key: "fabMechanism", label: "Fab Mechanism", icon: "⚙️", fieldType: "select", builtIn: true, sortOrder: 6 },
];

async function main() {
    const workspaces = await prisma.workspace.findMany();
    console.log(`Checking ${workspaces.length} workspaces...`);

    for (const ws of workspaces) {
        console.log(`Checking workspace: ${ws.name} (${ws.id})`);

        for (const field of BUILT_IN_FIELDS) {
            await prisma.workspaceField.upsert({
                where: {
                    workspaceId_key: {
                        workspaceId: ws.id,
                        key: field.key
                    }
                },
                update: {
                    label: field.label,
                    icon: field.icon,
                    fieldType: field.fieldType,
                    builtIn: field.builtIn,
                    sortOrder: field.sortOrder
                },
                create: {
                    ...field,
                    workspaceId: ws.id
                }
            });
        }
    }
    console.log("✓ All workspace fields aligned.");
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
