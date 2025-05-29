import * as React from 'react';
import usePipelineFilter, {
  FilterOptions,
  getDataValue,
} from '#~/concepts/pipelines/content/tables/usePipelineFilter';
import { PipelinesFilter } from '#~/concepts/pipelines/types';

type SelectorSearchProps = {
  setFilter: (filter?: PipelinesFilter) => void;
  fetchedSize: number;
  loaded: boolean;
};
export type UseSelectorSearchValue = {
  onChange: (newValue: string) => void;
  onClear: () => void;
  value?: string;
  totalSize: number;
};

export const useSelectorSearch = ({
  setFilter,
  fetchedSize,
  loaded,
}: SelectorSearchProps): UseSelectorSearchValue => {
  const totalSizeRef = React.useRef(0);
  const { onFilterUpdate, filterData, onClearFilters } = usePipelineFilter(setFilter);

  const search = getDataValue(filterData[FilterOptions.NAME]);

  const totalSize = React.useMemo(() => {
    if (loaded && !search) {
      totalSizeRef.current = fetchedSize;
      return fetchedSize;
    }
    return totalSizeRef.current;
    // The kubeflow API will only return the total size after the search filter
    // We need to use the ref to record the real total size and only update it when `loaded` changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded]);

  const setSearch = React.useCallback(
    (value: string) => {
      onFilterUpdate(FilterOptions.NAME, value);
    },
    [onFilterUpdate],
  );

  return {
    value: search,
    onChange: (value) => setSearch(value),
    onClear: () => {
      onClearFilters();
    },
    totalSize,
  };
};
