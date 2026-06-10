import * as React from 'react';
import { AIModel } from '~/app/types';
import { AssetsFilterOptions, assetsFilterSelectOptions } from '~/app/AIAssets/data/filterOptions';

export type FilterData = Record<string, string | string[] | undefined>;

const getStatusLabel = (status: string): string => {
  switch (status) {
    case 'Running':
      return 'Ready';
    case 'Stop':
      return 'Inactive';
    default:
      return 'Unknown';
  }
};

const isSelectFilter = (filterType: string): boolean => filterType in assetsFilterSelectOptions;

const INITIAL_FILTER_STATE: FilterData = {
  [AssetsFilterOptions.NAME]: undefined,
  [AssetsFilterOptions.USE_CASE]: undefined,
  [AssetsFilterOptions.STATUS]: undefined,
};

const useAIModelsFilter = (
  models: AIModel[],
): {
  filterData: FilterData;
  onFilterUpdate: (filterType: string, value?: string | string[]) => void;
  onClearFilters: () => void;
  filteredModels: AIModel[];
} => {
  const [filterData, setFilterData] = React.useState<FilterData>(INITIAL_FILTER_STATE);

  const onFilterUpdate = React.useCallback((filterType: string, value?: string | string[]) => {
    setFilterData((prev) => {
      if (isSelectFilter(filterType) && typeof value === 'string') {
        const current = Array.isArray(prev[filterType]) ? prev[filterType] : [];
        const updated = current.includes(value)
          ? current.filter((v) => v !== value)
          : [...current, value];
        return { ...prev, [filterType]: updated.length > 0 ? updated : undefined };
      }
      return { ...prev, [filterType]: value };
    });
  }, []);

  const onClearFilters = React.useCallback(() => {
    setFilterData(INITIAL_FILTER_STATE);
  }, []);

  const filteredModels = React.useMemo(
    () =>
      models.filter((model) => {
        const nameValue = filterData[AssetsFilterOptions.NAME];
        const normalizedName = typeof nameValue === 'string' ? nameValue.trim().toLowerCase() : '';
        if (normalizedName && !model.model_name.toLowerCase().includes(normalizedName)) {
          return false;
        }

        const useCaseValue = filterData[AssetsFilterOptions.USE_CASE];
        const normalizedUseCase =
          typeof useCaseValue === 'string' ? useCaseValue.trim().toLowerCase() : '';
        if (normalizedUseCase && !model.usecase.toLowerCase().includes(normalizedUseCase)) {
          return false;
        }

        const statusValues = filterData[AssetsFilterOptions.STATUS];
        if (Array.isArray(statusValues) && statusValues.length > 0) {
          if (!statusValues.includes(getStatusLabel(model.status))) {
            return false;
          }
        }

        return true;
      }),
    [models, filterData],
  );

  return {
    filterData,
    onFilterUpdate,
    onClearFilters,
    filteredModels,
  };
};

export default useAIModelsFilter;
