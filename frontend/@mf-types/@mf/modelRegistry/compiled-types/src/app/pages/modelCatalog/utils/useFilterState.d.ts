import { ModelCatalogStringFilterKey } from '~/concepts/modelCatalog/const';
/**
 * Type for string array filter keys (filters that store string[] values).
 * This hook factory is only intended for filters that use plain string arrays,
 * not filters with specific types like ModelCatalogTask[] or UseCaseOptionValue[].
 */
type StringArrayFilterKey = ModelCatalogStringFilterKey.HARDWARE_TYPE | ModelCatalogStringFilterKey.HARDWARE_CONFIGURATION;
/**
 * Creates a generic hook factory for string array filter state.
 * This eliminates duplication across filter state hooks that follow the same pattern.
 *
 * @param filterKey - The filter key to manage state for (must be a string array filter)
 * @returns A hook that provides appliedValues, setAppliedValues, and clearFilters
 */
export declare const createStringArrayFilterStateHook: <K extends StringArrayFilterKey>(filterKey: K) => () => {
    appliedValues: string[];
    setAppliedValues: (values: string[]) => void;
    clearFilters: () => void;
};
export {};
