import * as React from 'react';
import { CatalogFilterPanel, useCatalogFilterConfigs } from '~/app/shared/components/catalog';
import type { ServingRuntimeFilterOptionsList } from '~/odh/types/servingRuntimeCatalogTypes';
import {
  RUNTIME_CATALOG_FILTER_CATEGORY_NAMES,
  RUNTIME_CATALOG_FILTER_KEYS,
  RUNTIME_CATALOG_FILTER_LABELS,
  type RuntimeCatalogFiltersState,
} from '~/odh/pages/runtimeCatalog/const';
import { getRuntimeCatalogFilterOptions } from '~/odh/pages/runtimeCatalog/utils/runtimeCatalogUtils';

type RuntimeCatalogFiltersProps = {
  filters: RuntimeCatalogFiltersState;
  onFilterChange: (key: string, values: string[]) => void;
  filterOptions: ServingRuntimeFilterOptionsList | null;
  filterOptionsLoaded: boolean;
  filterOptionsLoadError?: Error;
};

const RuntimeCatalogFilters: React.FC<RuntimeCatalogFiltersProps> = ({
  filters,
  onFilterChange,
  filterOptions,
  filterOptionsLoaded,
  filterOptionsLoadError,
}) => {
  const catalogFilterOptions = React.useMemo(
    () => getRuntimeCatalogFilterOptions(filterOptions),
    [filterOptions],
  );
  const filterPanelItems = useCatalogFilterConfigs({
    filterKeys: [...RUNTIME_CATALOG_FILTER_KEYS],
    filterNames: RUNTIME_CATALOG_FILTER_CATEGORY_NAMES,
    filterOptions: catalogFilterOptions,
    selectedFilters: filters,
    onFilterChange,
    labelMappings: RUNTIME_CATALOG_FILTER_LABELS,
  });

  return (
    <CatalogFilterPanel
      loaded={filterOptionsLoaded}
      loadError={filterOptionsLoadError}
      filters={filterPanelItems}
      testIdPrefix="runtime-catalog-filter"
    />
  );
};

export default RuntimeCatalogFilters;
