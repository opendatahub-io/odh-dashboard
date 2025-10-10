import * as React from 'react';
import { AIModel } from '~/app/types';
import { AssetsFilterOptions } from '~/app/AIAssets/data/filterOptions';

type FilterData = Record<string, string | undefined>;

const useAIModelsFilter = (
  models: AIModel[],
): {
  filterData: FilterData;
  onFilterUpdate: (filterType: string, value?: string) => void;
  onClearFilters: () => void;
  filteredModels: AIModel[];
} => {
  const [filterData, setFilterData] = React.useState<FilterData>({
    [AssetsFilterOptions.NAME]: undefined,
    [AssetsFilterOptions.KEYWORD]: undefined,
    [AssetsFilterOptions.USE_CASE]: undefined,
  });

  const onFilterUpdate = React.useCallback((filterType: string, value?: string) => {
    setFilterData((prev) => ({
      ...prev,
      [filterType]: value,
    }));
  }, []);

  const onClearFilters = React.useCallback(() => {
    setFilterData({
      [AssetsFilterOptions.NAME]: undefined,
      [AssetsFilterOptions.KEYWORD]: undefined,
      [AssetsFilterOptions.USE_CASE]: undefined,
    });
  }, []);

  const filteredModels = React.useMemo(
    () =>
      models.filter((model) => {
        // Filter by name
        const nameValue = filterData[AssetsFilterOptions.NAME];
        if (nameValue) {
          if (!model.model_name.toLowerCase().includes(nameValue.toLowerCase())) {
            return false;
          }
        }

        // Filter by keyword (searches in name, description, and use case)
        const keywordValue = filterData[AssetsFilterOptions.KEYWORD];
        if (keywordValue) {
          const searchText =
            `${model.model_name} ${model.description} ${model.usecase}`.toLowerCase();
          if (!searchText.includes(keywordValue.toLowerCase())) {
            return false;
          }
        }

        // Filter by use case
        const useCaseValue = filterData[AssetsFilterOptions.USE_CASE];
        if (useCaseValue) {
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
