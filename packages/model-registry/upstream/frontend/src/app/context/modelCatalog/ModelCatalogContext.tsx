import { useQueryParamNamespaces } from 'mod-arch-core';
import useGenericObjectState from 'mod-arch-core/dist/utilities/useGenericObjectState';
import * as React from 'react';
import { useLocation } from 'react-router-dom';
import {
  createCatalogContext,
  CatalogContextValue,
  CatalogProviderState,
  CatalogCommonData,
} from '~/app/context/catalogContext/createCatalogContext';
import { useCatalogFilterOptionList } from '~/app/hooks/modelCatalog/useCatalogFilterOptionList';
import { useCatalogLabels } from '~/app/hooks/modelCatalog/useCatalogLabels';
import { useCatalogSources } from '~/app/hooks/modelCatalog/useCatalogSources';
import useModelCatalogAPIState, {
  ModelCatalogAPIState,
} from '~/app/hooks/modelCatalog/useModelCatalogAPIState';
import {
  CatalogFilterOptionsList,
  CatalogSource,
  CategoryName,
  ModelCatalogFilterStates,
  NamedQuery,
} from '~/app/modelCatalogTypes';
import {
  ModelDetailsTab,
  ModelCatalogStringFilterKey,
  ModelCatalogNumberFilterKey,
  DEFAULT_PERFORMANCE_FILTERS_QUERY_NAME,
  ALL_LATENCY_FILTER_KEYS,
  isLatencyFilterKey,
  ModelCatalogSortOption,
} from '~/concepts/modelCatalog/const';
import {
  getSingleFilterDefault,
  applyFilterValue,
  getDefaultFiltersFromNamedQuery,
} from '~/app/pages/modelCatalog/utils/performanceFilterUtils';
import { getEffectiveSortBy } from '~/app/pages/modelCatalog/utils/modelCatalogUtils';
import useEmptyCategoryTracking from '~/app/hooks/useEmptyCategoryTracking';
import { BFF_API_VERSION, URL_PREFIX } from '~/app/utilities/const';

const MODEL_CATALOG_HOST_PATH = `${URL_PREFIX}/api/${BFF_API_VERSION}/model_catalog`;

const INITIAL_FILTERS: ModelCatalogFilterStates = {
  [ModelCatalogStringFilterKey.TASK]: [],
  [ModelCatalogStringFilterKey.PROVIDER]: [],
  [ModelCatalogStringFilterKey.LICENSE]: [],
  [ModelCatalogStringFilterKey.LANGUAGE]: [],
  [ModelCatalogStringFilterKey.HARDWARE_TYPE]: [],
  [ModelCatalogStringFilterKey.HARDWARE_CONFIGURATION]: [],
  [ModelCatalogStringFilterKey.USE_CASE]: [],
  [ModelCatalogNumberFilterKey.MAX_RPS]: undefined,
  [ModelCatalogNumberFilterKey.COLD_START_LOAD_TIME]: undefined,
  [ModelCatalogNumberFilterKey.MIN_VRAM]: undefined,
  [ModelCatalogNumberFilterKey.IMAGE_SIZE]: undefined,
  [ModelCatalogStringFilterKey.TENSOR_TYPE]: [],
  [ModelCatalogStringFilterKey.VALIDATED_CONFIGURATION]: [],
};

type ModelCatalogExtension = {
  selectedSource: CatalogSource | undefined;
  updateSelectedSource: (source: CatalogSource | undefined) => void;
  apiState: ModelCatalogAPIState;
  refreshAPIState: () => void;
  filters: ModelCatalogFilterStates;
  setFilters: (
    updater:
      | ModelCatalogFilterStates
      | ((prev: ModelCatalogFilterStates) => ModelCatalogFilterStates),
  ) => void;
  performanceViewEnabled: boolean;
  setPerformanceViewEnabled: (enabled: boolean) => void;
  performanceFiltersChangedOnDetailsPage: boolean;
  setPerformanceFiltersChangedOnDetailsPage: (changed: boolean) => void;
  lastViewedModelName: string | null;
  setLastViewedModelName: (modelName: string | null) => void;
  resetPerformanceFiltersToDefaults: () => void;
  resetSinglePerformanceFilterToDefault: (filterKey: keyof ModelCatalogFilterStates) => void;
  getPerformanceFilterDefaultValue: (
    filterKey: keyof ModelCatalogFilterStates,
  ) => string | number | string[] | undefined;
  sortBy: ModelCatalogSortOption | null;
  setSortBy: (sortBy: ModelCatalogSortOption | null) => void;
  emptyCategoryLabels: Set<string>;
  categoriesResolved: boolean;
  reportCategoryEmpty: (label: string, isEmpty: boolean) => void;
  setCategoryCount: (count: number) => void;
};

export type ModelCatalogContextType = CatalogContextValue<CatalogFilterOptionsList> &
  ModelCatalogExtension;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function useModelCatalogSetup(providerState: CatalogProviderState) {
  const queryParams = useQueryParamNamespaces();
  const [apiState, refreshAPIState] = useModelCatalogAPIState(MODEL_CATALOG_HOST_PATH, queryParams);

  const [catalogSources, catalogSourcesLoaded, catalogSourcesLoadError] =
    useCatalogSources(apiState);
  const [catalogLabels, catalogLabelsLoaded, catalogLabelsLoadError] = useCatalogLabels(apiState);
  const [filterOptions, filterOptionsLoaded, filterOptionsLoadError] =
    useCatalogFilterOptionList(apiState);

  const [selectedSource, setSelectedSource] = React.useState<CatalogSource | undefined>(undefined);
  const [filterState, baseSetFilterData, , replaceFilterState] =
    useGenericObjectState<ModelCatalogFilterStates>(INITIAL_FILTERS);
  const [basePerformanceViewEnabled, setBasePerformanceViewEnabled] = React.useState(false);
  const [performanceFiltersChangedOnDetailsPage, setPerformanceFiltersChangedOnDetailsPage] =
    React.useState(false);
  const [lastViewedModelName, setLastViewedModelName] = React.useState<string | null>(null);
  const [sortBy, setSortBy] = React.useState<ModelCatalogSortOption | null>(null);
  const { emptyCategoryLabels, categoriesResolved, reportCategoryEmpty, setCategoryCount } =
    useEmptyCategoryTracking();

  const location = useLocation();
  const isOnDetailsPage = location.pathname.includes(ModelDetailsTab.PERFORMANCE_INSIGHTS);

  const applyNamedQueryDefaults = React.useCallback(
    (namedQuery: NamedQuery) => {
      const defaults = getDefaultFiltersFromNamedQuery(filterOptions, namedQuery);
      Object.entries(defaults).forEach(([filterKey, value]) => {
        applyFilterValue(baseSetFilterData, filterKey, value);
      });
    },
    [baseSetFilterData, filterOptions],
  );

  const resetPerformanceFiltersToDefaults = React.useCallback(() => {
    ALL_LATENCY_FILTER_KEYS.forEach((latencyKey) => {
      baseSetFilterData(latencyKey, undefined);
    });
    baseSetFilterData(ModelCatalogStringFilterKey.HARDWARE_CONFIGURATION, []);
    baseSetFilterData(ModelCatalogNumberFilterKey.MAX_RPS, undefined);
    baseSetFilterData(ModelCatalogNumberFilterKey.COLD_START_LOAD_TIME, undefined);

    const defaultQuery = filterOptions?.namedQueries?.[DEFAULT_PERFORMANCE_FILTERS_QUERY_NAME];
    if (defaultQuery) {
      applyNamedQueryDefaults(defaultQuery);
    }

    if (!isOnDetailsPage) {
      setPerformanceFiltersChangedOnDetailsPage(false);
    }
  }, [filterOptions?.namedQueries, applyNamedQueryDefaults, baseSetFilterData, isOnDetailsPage]);

  /**
   * Clears basic filters (Task, Provider, License, Language, Tensor Type) to empty.
   * Note: BASIC_FILTER_KEYS in const.ts should be updated if basic filters change.
   */
  const clearBasicFilters = React.useCallback(() => {
    baseSetFilterData(ModelCatalogStringFilterKey.TASK, []);
    baseSetFilterData(ModelCatalogStringFilterKey.PROVIDER, []);
    baseSetFilterData(ModelCatalogStringFilterKey.LICENSE, []);
    baseSetFilterData(ModelCatalogStringFilterKey.LANGUAGE, []);
    baseSetFilterData(ModelCatalogStringFilterKey.TENSOR_TYPE, []);
    baseSetFilterData(ModelCatalogStringFilterKey.VALIDATED_CONFIGURATION, []);
    baseSetFilterData(ModelCatalogNumberFilterKey.MIN_VRAM, undefined);
    baseSetFilterData(ModelCatalogNumberFilterKey.IMAGE_SIZE, undefined);
  }, [baseSetFilterData]);

  const clearAllFilters = React.useCallback(() => {
    clearBasicFilters();
    resetPerformanceFiltersToDefaults();
  }, [clearBasicFilters, resetPerformanceFiltersToDefaults]);

  const setPerformanceViewEnabled = React.useCallback(
    (enabled: boolean) => {
      setBasePerformanceViewEnabled(enabled);
      resetPerformanceFiltersToDefaults();

      const defaultSort = getEffectiveSortBy(null, enabled);
      const oppositeDefault = getEffectiveSortBy(null, !enabled);
      setSortBy((currentSortBy) => {
        if (currentSortBy === null || currentSortBy === oppositeDefault) {
          return defaultSort;
        }
        return currentSortBy;
      });
      setPerformanceFiltersChangedOnDetailsPage(false);
    },
    [resetPerformanceFiltersToDefaults],
  );

  const resetSinglePerformanceFilterToDefault = React.useCallback(
    (filterKey: keyof ModelCatalogFilterStates) => {
      if (isLatencyFilterKey(filterKey)) {
        ALL_LATENCY_FILTER_KEYS.forEach((latencyKey) => {
          baseSetFilterData(latencyKey, undefined);
        });

        const defaultQuery = filterOptions?.namedQueries?.[DEFAULT_PERFORMANCE_FILTERS_QUERY_NAME];
        if (defaultQuery) {
          for (const latencyKey of ALL_LATENCY_FILTER_KEYS) {
            const { hasDefault, value } = getSingleFilterDefault(filterOptions, latencyKey);
            if (hasDefault && value !== undefined) {
              applyFilterValue(baseSetFilterData, latencyKey, value);
              break;
            }
          }
        }
      } else {
        const { value } = getSingleFilterDefault(filterOptions, filterKey);
        applyFilterValue(baseSetFilterData, filterKey, value);
      }

      if (!isOnDetailsPage) {
        setPerformanceFiltersChangedOnDetailsPage(false);
      }
    },
    [filterOptions, baseSetFilterData, isOnDetailsPage],
  );

  const getDefaultValueForPerformanceFilter = React.useCallback(
    (filterKey: keyof ModelCatalogFilterStates): string | number | string[] | undefined => {
      const { value } = getSingleFilterDefault(filterOptions, filterKey);
      if (Array.isArray(value) || typeof value === 'string' || typeof value === 'number') {
        return value;
      }
      return undefined;
    },
    [filterOptions],
  );

  const setFilters = React.useCallback(
    (
      updater:
        | ModelCatalogFilterStates
        | ((prev: ModelCatalogFilterStates) => ModelCatalogFilterStates),
    ) => {
      const newValue = typeof updater === 'function' ? updater(filterState) : updater;
      replaceFilterState(newValue);

      if (isOnDetailsPage) {
        setPerformanceFiltersChangedOnDetailsPage(true);
      } else {
        setPerformanceFiltersChangedOnDetailsPage(false);
      }
    },
    [replaceFilterState, filterState, isOnDetailsPage],
  );

  React.useEffect(() => {
    if (
      filterOptionsLoaded &&
      filterOptions?.namedQueries?.[DEFAULT_PERFORMANCE_FILTERS_QUERY_NAME] &&
      filterState[ModelCatalogStringFilterKey.USE_CASE].length === 0
    ) {
      resetPerformanceFiltersToDefaults();
    }
  }, [
    filterOptionsLoaded,
    filterOptions?.namedQueries,
    filterState,
    resetPerformanceFiltersToDefaults,
  ]);

  const catalogData = React.useMemo<CatalogCommonData<CatalogFilterOptionsList>>(
    () => ({
      catalogSources,
      catalogSourcesLoaded,
      catalogSourcesLoadError,
      catalogLabels,
      catalogLabelsLoaded,
      catalogLabelsLoadError,
      filterOptions,
      filterOptionsLoaded,
      filterOptionsLoadError,
    }),
    [
      catalogSources,
      catalogSourcesLoaded,
      catalogSourcesLoadError,
      catalogLabels,
      catalogLabelsLoaded,
      catalogLabelsLoadError,
      filterOptions,
      filterOptionsLoaded,
      filterOptionsLoadError,
    ],
  );

  const extension = React.useMemo(
    () => ({
      selectedSource: selectedSource ?? undefined,
      updateSelectedSource: setSelectedSource,
      apiState,
      refreshAPIState,
      filters: filterState,
      setFilters,
      clearAllFilters,
      performanceViewEnabled: basePerformanceViewEnabled,
      setPerformanceViewEnabled,
      performanceFiltersChangedOnDetailsPage,
      setPerformanceFiltersChangedOnDetailsPage,
      lastViewedModelName,
      setLastViewedModelName,
      resetPerformanceFiltersToDefaults,
      resetSinglePerformanceFilterToDefault,
      getPerformanceFilterDefaultValue: getDefaultValueForPerformanceFilter,
      sortBy,
      setSortBy,
      emptyCategoryLabels,
      categoriesResolved,
      reportCategoryEmpty,
      setCategoryCount,
    }),
    [
      selectedSource,
      apiState,
      refreshAPIState,
      filterState,
      setFilters,
      clearAllFilters,
      basePerformanceViewEnabled,
      setPerformanceViewEnabled,
      performanceFiltersChangedOnDetailsPage,
      lastViewedModelName,
      resetPerformanceFiltersToDefaults,
      resetSinglePerformanceFilterToDefault,
      getDefaultValueForPerformanceFilter,
      sortBy,
      setSortBy,
      emptyCategoryLabels,
      categoriesResolved,
      reportCategoryEmpty,
      setCategoryCount,
    ],
  );

  return { catalogData, extension };
}

const {
  Context: ModelCatalogContext,
  Provider: ModelCatalogContextProvider,
  useContext: useModelCatalogContext,
} = createCatalogContext<CatalogFilterOptionsList, ModelCatalogExtension>({
  displayName: 'ModelCatalogContextProvider',
  initialSelectedSourceLabel: CategoryName.allModels,
  useSetup: useModelCatalogSetup,
});

export { ModelCatalogContext, ModelCatalogContextProvider, useModelCatalogContext };
