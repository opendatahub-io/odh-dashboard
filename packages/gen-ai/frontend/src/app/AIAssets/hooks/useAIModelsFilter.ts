import * as React from 'react';
import { AIModel } from '~/app/types';
import { AIAssetsFilterOptions } from '~/app/AIAssets/data/filterOptions';

type FilterData = Record<
  AIAssetsFilterOptions,
  string | { label: string; value: string } | undefined
>;

const useAIModelsFilter = (
  models: AIModel[],
): {
  filterData: FilterData;
  onFilterUpdate: (
    filterType: AIAssetsFilterOptions,
    value?: string | { label: string; value: string },
  ) => void;
  onClearFilters: () => void;
  filteredModels: AIModel[];
} => {
  const [filterData, setFilterData] = React.useState<FilterData>({
    [AIAssetsFilterOptions.NAME]: undefined,
    [AIAssetsFilterOptions.KEYWORD]: undefined,
    [AIAssetsFilterOptions.USE_CASE]: undefined,
  });

  const onFilterUpdate = React.useCallback(
    (filterType: AIAssetsFilterOptions, value?: string | { label: string; value: string }) => {
      setFilterData((prev) => ({
        ...prev,
        [filterType]: value,
      }));
    },
    [],
  );

  const onClearFilters = React.useCallback(() => {
    setFilterData({
      [AIAssetsFilterOptions.NAME]: undefined,
      [AIAssetsFilterOptions.KEYWORD]: undefined,
      [AIAssetsFilterOptions.USE_CASE]: undefined,
    });
  }, []);

  const filteredModels = React.useMemo(
    () =>
      models.filter((model) => {
        // Filter by name
        if (filterData[AIAssetsFilterOptions.NAME]) {
          const nameFilter = filterData[AIAssetsFilterOptions.NAME];
          const nameValue = typeof nameFilter === 'string' ? nameFilter : nameFilter.value;
          if (!model.model_name.toLowerCase().includes(nameValue.toLowerCase())) {
            return false;
          }
        }

        // Filter by keyword (searches in name, description, and use case)
        if (filterData[AIAssetsFilterOptions.KEYWORD]) {
          const keywordFilter = filterData[AIAssetsFilterOptions.KEYWORD];
          const keywordValue =
            typeof keywordFilter === 'string' ? keywordFilter : keywordFilter.value;
          const searchText =
            `${model.model_name} ${model.description} ${model.usecase}`.toLowerCase();
          if (!searchText.includes(keywordValue.toLowerCase())) {
            return false;
          }
        }

        // Filter by use case
        if (filterData[AIAssetsFilterOptions.USE_CASE]) {
          const useCaseFilter = filterData[AIAssetsFilterOptions.USE_CASE];
          const useCaseValue =
            typeof useCaseFilter === 'string' ? useCaseFilter : useCaseFilter.value;
          if (!model.usecase.toLowerCase().includes(useCaseValue.toLowerCase())) {
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
