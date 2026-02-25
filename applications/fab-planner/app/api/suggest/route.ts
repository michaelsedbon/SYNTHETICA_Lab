import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isManagedField, isBuiltInFieldKey } from "@/lib/constants";

// GET /api/suggest?field=material&q=Tit
// Returns distinct values from both the FieldValue table and existing parts data
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const field = searchParams.get("field");
        const q = (searchParams.get("q") || "").toLowerCase();

        if (!field) {
            return NextResponse.json({ error: "field parameter required" }, { status: 400 });
        }

        // Built-in fields that support autocomplete
        const builtInAllowed = ["material", "orderId", "project", "client", "hospital", "partName", "status", "who", "type", "fabMechanism"];
        const isBuiltIn = builtInAllowed.includes(field);
        const isCustom = !isBuiltInFieldKey(field);

        if (!isBuiltIn && !isCustom) {
            return NextResponse.json({ error: "Field not supported for autocomplete" }, { status: 400 });
        }

        const seen = new Set<string>();
        const suggestions: string[] = [];

        // 1. Values from the managed FieldValue table (these are the "approved" values)
        if (isManagedField(field) || isCustom) {
            const managed = await prisma.fieldValue.findMany({
                where: { field },
                select: { value: true },
            });
            for (const m of managed) {
                const lower = m.value.toLowerCase();
                if (!seen.has(lower) && (q === "" || lower.includes(q))) {
                    seen.add(lower);
                    suggestions.push(m.value);
                }
            }
        }

        if (isBuiltIn) {
            // 2a. Built-in field: values currently used on parts columns
            const parts = await prisma.part.findMany({
                select: { [field]: true },
            });

            for (const p of parts) {
                const val = (p as Record<string, unknown>)[field];
                if (typeof val === "string" && val.trim() !== "") {
                    const lower = val.toLowerCase();
                    if (!seen.has(lower) && (q === "" || lower.includes(q))) {
                        seen.add(lower);
                        suggestions.push(val);
                        if (suggestions.length >= 20) break;
                    }
                }
            }
        } else {
            // 2b. Custom field: values from PartCustomField table
            const customValues = await prisma.partCustomField.findMany({
                where: { fieldKey: field },
                select: { value: true },
            });

            for (const c of customValues) {
                if (c.value.trim() !== "") {
                    const lower = c.value.toLowerCase();
                    if (!seen.has(lower) && (q === "" || lower.includes(q))) {
                        seen.add(lower);
                        suggestions.push(c.value);
                        if (suggestions.length >= 20) break;
                    }
                }
            }
        }

        suggestions.sort((a, b) => a.localeCompare(b));

        return NextResponse.json(suggestions);
    } catch (error) {
        console.error("Failed to fetch suggestions:", error);
        return NextResponse.json({ error: "Failed to fetch suggestions" }, { status: 500 });
    }
}
