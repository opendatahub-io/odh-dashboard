import * as React from 'react';
import type { MaaSModel } from '~/odh/extension-points/maas';
import { AssetsFilterOptions } from '~/app/AIAssets/data/filterOptions';

type FilterData = Record<string, string | undefined>;

const useMaaSModelsFilter = (
  models: MaaSModel[],
): {
  filterData: FilterData;
  onFilterUpdate: (filterType: string, value?: string) => void;
  onClearFilters: () => void;
  filteredModels: MaaSModel[];
} => {
  const [filterData, setFilterData] = React.useState<FilterData>({
    [AssetsFilterOptions.NAME]: undefined,
    [AssetsFilterOptions.KEYWORD]: undefined,
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
    });
  }, []);

  const filteredModels = React.useMemo(
    () =>
      models.filter((model) => {
        // Filter by name
        const nameValue = filterData[AssetsFilterOptions.NAME];
        if (nameValue) {
          if (!model.id.toLowerCase().includes(nameValue.toLowerCase())) {
            return false;
          }
        }

        // Filter by keyword (searches in id, url, and owned_by)
        const keywordValue = filterData[AssetsFilterOptions.KEYWORD];
        if (keywordValue) {
          const searchText = `${model.id} ${model.url} ${model.owned_by}`.toLowerCase();
          if (!searchText.includes(keywordValue.toLowerCase())) {
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

export default useMaaSModelsFilter;
