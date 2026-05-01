import { CatalogFilterOptionsList, ModelCatalogFilterStates, NamedQuery } from '~/app/modelCatalogTypes';
/**
 * Type for a function that sets filter data.
 */
export type SetFilterDataFn = <K extends keyof ModelCatalogFilterStates>(key: K, value: ModelCatalogFilterStates[K]) => void;
/**
 * Applies a filter value to the filter state with proper type handling.
 * Uses centralized filter type categorization from const.ts.
 * This centralizes the type coercion logic for filter values.
 * Accepts string for filterKey to work with Object.entries().
 *
 * To add a new performance filter:
 * 1. Add to PERFORMANCE_STRING_FILTER_KEYS or PERFORMANCE_NUMBER_FILTER_KEYS in const.ts
 * 2. For string filters with special validation (like USE_CASE), add an extraction function
 * 3. Add a case in the appropriate switch/if statement below
 */
export declare const applyFilterValue: (setFilterData: SetFilterDataFn, filterKey: string, value: ModelCatalogFilterStates[keyof ModelCatalogFilterStates] | undefined) => void;
/**
 * Resolves a filter value, handling special values like 'max' or 'min'
 * that should be looked up from the filter options range.
 */
export declare const resolveFilterValue: (filterOptions: CatalogFilterOptionsList | null, fieldName: string, value: string | number | boolean | (string | number)[]) => number | undefined;
/**
 * Parses filter values from a named query and returns them as a partial filter state.
 * Uses centralized filter type categorization from const.ts.
 * Filter keys in the frontend now match backend field names directly.
 *
 * To add a new performance filter:
 * 1. Add to PERFORMANCE_STRING_FILTER_KEYS or PERFORMANCE_NUMBER_FILTER_KEYS in const.ts
 * 2. For string filters with special validation (like USE_CASE), handle explicitly
 * 3. For standard string filters, add an else-if case using extractStringArrayFromFieldFilter
 */
export declare const getDefaultFiltersFromNamedQuery: (filterOptions: CatalogFilterOptionsList | null, namedQuery: NamedQuery) => Partial<ModelCatalogFilterStates>;
/**
 * Gets all default performance filter values from namedQueries.
 * Returns a partial filter state with all default values.
 */
export declare const getDefaultPerformanceFilters: (filterOptions: CatalogFilterOptionsList | null) => Partial<ModelCatalogFilterStates>;
/**
 * Gets the default value for a single performance filter from namedQueries.
 * Returns the value and whether a default was found.
 */
export declare const getSingleFilterDefault: (filterOptions: CatalogFilterOptionsList | null, filterKey: keyof ModelCatalogFilterStates) => {
    hasDefault: boolean;
    value: ModelCatalogFilterStates[keyof ModelCatalogFilterStates];
};
