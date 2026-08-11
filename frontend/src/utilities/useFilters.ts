import * as React from 'react';

export type FilterValue = string | { label: string; value: string } | undefined;

/**
 * Shared filter-state hook used by table toolbars.
 * Manages `filterData` state plus stable `onFilterUpdate` / `onClearFilters` callbacks.
 */
const useFilters = <T extends Record<string, FilterValue>>(
  initialFilterData: T,
): {
  filterData: T;
  setFilterData: React.Dispatch<React.SetStateAction<T>>;
  onFilterUpdate: (key: keyof T, value: FilterValue) => void;
  onClearFilters: () => void;
} => {
  const [filterData, setFilterData] = React.useState<T>(initialFilterData);
  const initialRef = React.useRef(initialFilterData);

  const onFilterUpdate = React.useCallback(
    (key: keyof T, value: FilterValue) =>
      setFilterData((prevValues) => ({ ...prevValues, [key]: value })),
    [setFilterData],
  );

  const onClearFilters = React.useCallback(
    () => setFilterData(initialRef.current),
    [setFilterData],
  );

  return { filterData, setFilterData, onFilterUpdate, onClearFilters };
};

export default useFilters;
