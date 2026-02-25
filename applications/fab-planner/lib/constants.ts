/**
 * Shared constants used across the application.
 * Single source of truth for managed field names, default statuses, etc.
 */

/** Fields whose values are managed via the FieldValue table and shown in dropdowns */
export const MANAGED_FIELDS = [
    "material",
    "client",
    "hospital",
    "status",
    "who",
    "type",
    "fabMechanism",
] as const;

export type ManagedField = (typeof MANAGED_FIELDS)[number];

/** Check if a field name is one of the managed fields */
export function isManagedField(field: string): field is ManagedField {
    return MANAGED_FIELDS.includes(field as ManagedField);
}

/** System fields — always present, cannot be deleted from any workspace */
export const SYSTEM_FIELDS = ["status", "dueDate", "files", "quantity", "notes"] as const;

/** Built-in field keys that map to Part schema columns (not custom fields) */
export const BUILT_IN_FIELD_KEYS = [
    "status", "material", "client", "hospital", "who", "type", "fabMechanism",
] as const;

/** Check if a field key maps to a built-in Part schema column */
export function isBuiltInFieldKey(key: string): boolean {
    return (BUILT_IN_FIELD_KEYS as readonly string[]).includes(key);
}

/** Default status options when no FieldValue data is available */
export const DEFAULT_STATUS_OPTIONS = [
    "new",
    "design",
    "manufacturing",
    "review",
    "complete",
    "urgent",
];
