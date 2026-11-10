import * as React from 'react';
export type CatalogActiveFiltersProps<TFilterKey extends string> = {
    filterKeys: readonly TFilterKey[];
    categoryNames: Record<TFilterKey, string>;
    filters: Partial<Record<TFilterKey, string[]>>;
    setFilters: (updater: Partial<Record<TFilterKey, string[]>> | ((prev: Partial<Record<TFilterKey, string[]>>) => Partial<Record<TFilterKey, string[]>>)) => void;
    /** Optional per-category value → display label map (e.g. Agents framework labels). */
    labelMappings?: Partial<Record<TFilterKey, Record<string, string>>>;
    /**
     * Prefix for data-testid attributes:
     * `${testIdPrefix}-chip-${filterKey}-${value}` and `${testIdPrefix}-container-${filterKey}`.
     */
    testIdPrefix: string;
};
declare function CatalogActiveFilters<TFilterKey extends string>({ filterKeys, categoryNames, filters, setFilters, labelMappings, testIdPrefix, }: CatalogActiveFiltersProps<TFilterKey>): React.ReactElement;
export default CatalogActiveFilters;
