export declare const wrapInQuotes: (v: string) => string;
export declare const eqFilter: (k: string, v: string) => string;
export declare const inFilter: (k: string, values: string[]) => string;
export declare const andFilter: (k: string, values: string[]) => string;
/**
 * Computes the next filter selection array after toggling a value.
 * Returns null if checked=true and the value is already present (no-op).
 */
export declare function toggleFilterValue(current: string[], value: string, checked: boolean): string[] | null;
/**
 * Converts a record of string-array filters into a filterQuery string.
 * Handles single-value equality and multi-value IN (OR) or AND clauses, joined with AND.
 *
 * @param filters - Map of filter keys to selected string values
 * @param keyMapping - Optional frontend-to-backend key remapping
 * @param matchAllKeys - Keys that use AND logic instead of OR (IN) when multiple values selected
 * @returns The filterQuery string for the API, or empty string if no filters active
 */
export declare function stringFiltersToFilterQuery(filters: Record<string, string[] | undefined>, keyMapping?: Record<string, string>, matchAllKeys?: string[]): string;
