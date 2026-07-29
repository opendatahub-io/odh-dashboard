/**
 * Shared hook for managing a string-array filter selection.
 * Context-agnostic: each catalog provides its current values and a change callback.
 *
 * @param currentValues - The currently selected filter values (from context)
 * @param onChange - Callback to set the next selection array (writes back to context)
 * @returns Standardized filter state: { selectedValues, isSelected, setSelected }
 */
export declare function useStringFilterState(currentValues: string[], onChange: (nextValues: string[]) => void): {
    selectedValues: string[];
    isSelected: (value: string) => boolean;
    setSelected: (value: string, checked: boolean) => void;
};
