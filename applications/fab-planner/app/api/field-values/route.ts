import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { userLog } from "@/lib/logger";
import { MANAGED_FIELDS, isManagedField } from "@/lib/constants";
import { isBuiltInFieldKey } from "@/lib/constants";

// Gather all unique values for a BUILT-IN field: from FieldValue table + from part columns
async function getValuesForBuiltInField(field: string): Promise<string[]> {
    const managed = await prisma.fieldValue.findMany({
        where: { field },
        select: { value: true },
    });

    const partsRaw = await prisma.part.findMany({
        select: { [field]: true },
    });

    const seen = new Set<string>();
    const values: string[] = [];

    for (const m of managed) {
        if (m.value.trim() && !seen.has(m.value)) {
            seen.add(m.value);
            values.push(m.value);
        }
    }

    for (const p of partsRaw) {
        const val = (p as Record<string, unknown>)[field];
        if (typeof val === "string" && val.trim() !== "" && !seen.has(val)) {
            seen.add(val);
            values.push(val);
        }
    }

    values.sort((a, b) => a.localeCompare(b));
    return values;
}

// Gather all unique values for a CUSTOM field: from FieldValue table + from PartCustomField table
async function getValuesForCustomField(field: string): Promise<string[]> {
    const managed = await prisma.fieldValue.findMany({
        where: { field },
        select: { value: true },
    });

    const customRaw = await prisma.partCustomField.findMany({
        where: { fieldKey: field },
        select: { value: true },
    });

    const seen = new Set<string>();
    const values: string[] = [];

    for (const m of managed) {
        if (m.value.trim() && !seen.has(m.value)) {
            seen.add(m.value);
            values.push(m.value);
        }
    }

    for (const c of customRaw) {
        if (c.value.trim() !== "" && !seen.has(c.value)) {
            seen.add(c.value);
            values.push(c.value);
        }
    }

    values.sort((a, b) => a.localeCompare(b));
    return values;
}

// Check if a field is allowed (built-in managed OR custom workspace field)
function isAllowedField(field: string): boolean {
    return isManagedField(field) || !isBuiltInFieldKey(field);
}

// GET /api/field-values?field=material  (or no field param → all built-in fields + any custom with values)
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const field = searchParams.get("field");

        if (field) {
            if (!isAllowedField(field)) {
                return NextResponse.json({ error: "Field not manageable" }, { status: 400 });
            }
            const values = isManagedField(field)
                ? await getValuesForBuiltInField(field)
                : await getValuesForCustomField(field);
            return NextResponse.json(values);
        }

        // Return all built-in managed fields
        const result: Record<string, string[]> = {};
        for (const f of MANAGED_FIELDS) {
            result[f] = await getValuesForBuiltInField(f);
        }

        // Also include any custom fields that have FieldValue entries
        const customFieldValues = await prisma.fieldValue.findMany({
            where: {
                field: { notIn: [...MANAGED_FIELDS] },
            },
            select: { field: true, value: true },
        });
        for (const cfv of customFieldValues) {
            if (!result[cfv.field]) result[cfv.field] = [];
            if (!result[cfv.field].includes(cfv.value)) {
                result[cfv.field].push(cfv.value);
            }
        }

        // Also include custom fields that have values on parts but no FieldValue entry
        const customPartValues = await prisma.partCustomField.findMany({
            select: { fieldKey: true, value: true },
        });
        for (const cpv of customPartValues) {
            if (!result[cpv.fieldKey]) result[cpv.fieldKey] = [];
            if (cpv.value.trim() && !result[cpv.fieldKey].includes(cpv.value)) {
                result[cpv.fieldKey].push(cpv.value);
            }
        }

        // Sort each field's values
        for (const k of Object.keys(result)) {
            result[k].sort((a, b) => a.localeCompare(b));
        }

        return NextResponse.json(result);
    } catch (error) {
        console.error("Failed to fetch field values:", error);
        return NextResponse.json({ error: "Failed to fetch field values" }, { status: 500 });
    }
}

// POST /api/field-values — add a new managed value
// Body: { field, value }
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { field, value } = body;

        if (!field || !value?.trim()) {
            return NextResponse.json({ error: "field and value required" }, { status: 400 });
        }
        if (!isAllowedField(field)) {
            return NextResponse.json({ error: "Field not manageable" }, { status: 400 });
        }

        // Upsert to FieldValue table (works for both built-in and custom fields)
        await prisma.fieldValue.upsert({
            where: { field_value: { field, value: value.trim() } },
            update: {},
            create: { field, value: value.trim() },
        });

        userLog.info("field_value_added", `Added "${value.trim()}" to ${field}`);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Failed to add field value:", error);
        return NextResponse.json({ error: "Failed to add field value" }, { status: 500 });
    }
}

// DELETE /api/field-values?field=material&value=Titanium
// Removes the value from the FieldValue table AND clears it from all parts
export async function DELETE(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const field = searchParams.get("field");
        const value = searchParams.get("value");

        if (!field || !value) {
            return NextResponse.json({ error: "field and value parameters required" }, { status: 400 });
        }
        if (!isAllowedField(field)) {
            return NextResponse.json({ error: "Field not manageable" }, { status: 400 });
        }

        // Remove from managed values table
        await prisma.fieldValue.deleteMany({
            where: { field, value },
        });

        let cleared = 0;

        if (isManagedField(field)) {
            // Built-in field: clear from Part column
            const result = await prisma.part.updateMany({
                where: { [field]: value },
                data: { [field]: null },
            });
            cleared = result.count;
        } else {
            // Custom field: delete from PartCustomField table
            const result = await prisma.partCustomField.deleteMany({
                where: { fieldKey: field, value },
            });
            cleared = result.count;
        }

        userLog.info("field_value_deleted", `Cleared "${value}" from ${field} on ${cleared} part(s)`);

        return NextResponse.json({ cleared });
    } catch (error) {
        console.error("Failed to delete field value:", error);
        return NextResponse.json({ error: "Failed to delete field value" }, { status: 500 });
    }
}

// PATCH /api/field-values — rename a value across all parts + the FieldValue table
// Body: { field, oldValue, newValue }
export async function PATCH(request: Request) {
    try {
        const body = await request.json();
        const { field, oldValue, newValue } = body;

        if (!field || !oldValue || !newValue) {
            return NextResponse.json({ error: "field, oldValue, and newValue required" }, { status: 400 });
        }
        if (!isAllowedField(field)) {
            return NextResponse.json({ error: "Field not manageable" }, { status: 400 });
        }

        // Update in managed values table
        await prisma.fieldValue.updateMany({
            where: { field, value: oldValue },
            data: { value: newValue.trim() },
        });

        let updated = 0;

        if (isManagedField(field)) {
            // Built-in field: update Part column
            const result = await prisma.part.updateMany({
                where: { [field]: oldValue },
                data: { [field]: newValue.trim() },
            });
            updated = result.count;
        } else {
            // Custom field: update in PartCustomField table
            const result = await prisma.partCustomField.updateMany({
                where: { fieldKey: field, value: oldValue },
                data: { value: newValue.trim() },
            });
            updated = result.count;
        }

        userLog.info("field_value_renamed", `Renamed "${oldValue}" → "${newValue}" in ${field} on ${updated} part(s)`);

        return NextResponse.json({ updated });
    } catch (error) {
        console.error("Failed to rename field value:", error);
        return NextResponse.json({ error: "Failed to rename field value" }, { status: 500 });
    }
}
