import * as React from 'react';
import { CatalogContextValue, CatalogProviderState, CatalogCommonData } from '~/app/context/catalogContext/createCatalogContext';
import { ModelCatalogAPIState } from '~/app/hooks/modelCatalog/useModelCatalogAPIState';
import { CatalogFilterOptionsList, CatalogSource, ModelCatalogFilterStates } from '~/app/modelCatalogTypes';
import { ModelCatalogSortOption } from '~/concepts/modelCatalog/const';
type ModelCatalogExtension = {
    selectedSource: CatalogSource | undefined;
    updateSelectedSource: (source: CatalogSource | undefined) => void;
    apiState: ModelCatalogAPIState;
    refreshAPIState: () => void;
    filters: ModelCatalogFilterStates;
    setFilters: (updater: ModelCatalogFilterStates | ((prev: ModelCatalogFilterStates) => ModelCatalogFilterStates)) => void;
    performanceViewEnabled: boolean;
    setPerformanceViewEnabled: (enabled: boolean) => void;
    performanceFiltersChangedOnDetailsPage: boolean;
    setPerformanceFiltersChangedOnDetailsPage: (changed: boolean) => void;
    lastViewedModelName: string | null;
    setLastViewedModelName: (modelName: string | null) => void;
    resetPerformanceFiltersToDefaults: () => void;
    resetSinglePerformanceFilterToDefault: (filterKey: keyof ModelCatalogFilterStates) => void;
    getPerformanceFilterDefaultValue: (filterKey: keyof ModelCatalogFilterStates) => string | number | string[] | undefined;
    sortBy: ModelCatalogSortOption | null;
    setSortBy: (sortBy: ModelCatalogSortOption | null) => void;
    emptyCategoryLabels: Set<string>;
    categoriesResolved: boolean;
    reportCategoryEmpty: (label: string, isEmpty: boolean) => void;
    setCategoryCount: (count: number) => void;
};
export type ModelCatalogContextType = CatalogContextValue<CatalogFilterOptionsList> & ModelCatalogExtension;
declare const ModelCatalogContext: React.Context<CatalogCommonData<CatalogFilterOptionsList> & CatalogProviderState & {
    clearAllFilters: () => void;
} & ModelCatalogExtension>, ModelCatalogContextProvider: React.FC<{
    children: React.ReactNode;
}>, useModelCatalogContext: () => CatalogCommonData<CatalogFilterOptionsList> & CatalogProviderState & {
    clearAllFilters: () => void;
} & ModelCatalogExtension;
export { ModelCatalogContext, ModelCatalogContextProvider, useModelCatalogContext };
