import * as React from 'react';
import type { ServingRuntimeFilterOptionsList } from '~/odh/types/servingRuntimeCatalogTypes';
import { type RuntimeCatalogFiltersState } from '~/odh/pages/runtimeCatalog/const';
type RuntimeCatalogFiltersProps = {
    filters: RuntimeCatalogFiltersState;
    onFilterChange: (key: string, values: string[]) => void;
    filterOptions: ServingRuntimeFilterOptionsList | null;
    filterOptionsLoaded: boolean;
    filterOptionsLoadError?: Error;
};
declare const RuntimeCatalogFilters: React.FC<RuntimeCatalogFiltersProps>;
export default RuntimeCatalogFilters;
