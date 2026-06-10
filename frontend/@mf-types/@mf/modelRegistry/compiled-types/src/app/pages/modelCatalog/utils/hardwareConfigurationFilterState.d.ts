/**
 * Hook for managing hardware configuration filter state.
 * Uses the generic filter state hook factory to eliminate duplication.
 */
export declare const useHardwareConfigurationFilterState: () => {
    appliedValues: string[];
    setAppliedValues: (values: string[]) => void;
    clearFilters: () => void;
};
