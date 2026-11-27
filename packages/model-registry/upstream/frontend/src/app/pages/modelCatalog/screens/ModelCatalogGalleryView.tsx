import { Button, EmptyStateVariant } from '@patternfly/react-core';
import { ChartBarIcon, SearchIcon } from '@patternfly/react-icons';
import React from 'react';
import { ModelCatalogContext } from '~/app/context/modelCatalog/ModelCatalogContext';
import { useCatalogModelsBySources } from '~/app/hooks/modelCatalog/useCatalogModelsBySource';
import { CatalogModel, CategoryName, SourceLabel } from '~/app/modelCatalogTypes';
import ModelCatalogCard from '~/app/pages/modelCatalog/components/ModelCatalogCard';
import {
  getSourceFromSourceId,
  getBasicFiltersOnly,
  getActiveLatencyFieldName,
  getSortParams,
  generateCategoryName,
  getLabelDisplayName,
  getLabelDescription,
  hasFiltersApplied,
  isValueDifferentFromDefault,
} from '~/app/pages/modelCatalog/utils/modelCatalogUtils';
import ModelCatalogSortDropdown from '~/app/pages/modelCatalog/components/ModelCatalogSortDropdown';
import { CatalogGalleryLayout, EmptyCatalogState } from '~/app/shared/components/catalog';
import {
  ModelCatalogNumberFilterKey,
  ModelCatalogStringFilterKey,
  ModelCatalogSortOption,
  parseLatencyFilterKey,
  BASIC_FILTER_KEYS,
  PERFORMANCE_FILTER_KEYS,
  RESET_ALL_FILTERS_LABEL,
  SortField,
} from '~/concepts/modelCatalog/const';
import { useUserInteraction } from '~/concepts/userInteraction';
import {
  MODEL_CATALOG_EVENTS,
  countActiveFilters,
  ModelCatalogSearchSubmittedProperties,
  ModelCatalogFilterAppliedProperties,
  ModelCatalogVramFilterAppliedProperties,
  ModelCatalogLoadMoreClickedProperties,
  ModelCatalogPerformanceFilterAppliedProperties,
  ModelCatalogCategorySelectedProperties,
  toCategorySelectedValue,
} from '~/app/pages/modelCatalog/tracking';

type ModelCatalogPageProps = {
  searchTerm: string;
  handleFilterReset: () => void;
  isSingleCategory?: boolean;
  singleCategoryLabel?: string;
  pendingSearchTracking?: boolean;
  searchResubmitNonce?: number;
  onSearchTrackingFired?: () => void;
};

/** Wait for a real loading cycle, then run `onReady` after the catalog query settles. */
const useAfterCatalogQuery = (
  pending: unknown,
  loaded: boolean,
  loadError: Error | undefined,
  onReady: () => void,
  onSkip: () => void,
  deps: React.DependencyList,
  /** When bumped while pending+loaded, settle without waiting for a loading cycle. */
  settleWithoutLoadingKey = 0,
): void => {
  const hasSeenLoadingRef = React.useRef(false);
  const lastSettleKeyRef = React.useRef(0);

  React.useEffect(() => {
    if (!pending) {
      hasSeenLoadingRef.current = false;
      return;
    }
    if (!loaded) {
      hasSeenLoadingRef.current = true;
      return;
    }
    if (settleWithoutLoadingKey !== 0 && settleWithoutLoadingKey !== lastSettleKeyRef.current) {
      hasSeenLoadingRef.current = true;
      lastSettleKeyRef.current = settleWithoutLoadingKey;
    }
  }, [pending, loaded, settleWithoutLoadingKey]);

  React.useEffect(() => {
    if (!pending || !hasSeenLoadingRef.current || !loaded) {
      return;
    }
    if (loadError) {
      onSkip();
      return;
    }

    // Defer so useCatalogModelsBySources can sync size before we read it.
    const timeoutId = window.setTimeout(onReady, 0);
    return () => window.clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- onReady/onSkip close over caller deps
  }, [pending, loaded, loadError, settleWithoutLoadingKey, ...deps]);
};

const ModelCatalogGalleryView: React.FC<ModelCatalogPageProps> = ({
  searchTerm,
  handleFilterReset,
  isSingleCategory = false,
  singleCategoryLabel,
  pendingSearchTracking = false,
  searchResubmitNonce = 0,
  onSearchTrackingFired,
}) => {
  const {
    selectedSourceLabel,
    filters,
    filterOptions,
    filterOptionsLoaded,
    filterOptionsLoadError,
    catalogSources,
    catalogLabels,
    catalogLabelsLoaded,
    catalogLabelsLoadError,
    setPerformanceViewEnabled,
    setSelectedSourceLabel,
    performanceViewEnabled,
    sortBy,
    getPerformanceFilterDefaultValue,
    pendingFilterAppliedTracking,
    setPendingFilterAppliedTracking,
    pendingVramFilterAppliedTracking,
    setPendingVramFilterAppliedTracking,
    pendingPerformanceFilterAppliedTracking,
    setPendingPerformanceFilterAppliedTracking,
  } = React.useContext(ModelCatalogContext);
  const { trackSimpleEvent } = useUserInteraction();
  const catalogModelsRef = React.useRef({ size: 0 });
  const pendingFilterAppliedRef = React.useRef(pendingFilterAppliedTracking);
  pendingFilterAppliedRef.current = pendingFilterAppliedTracking;
  const pendingVramFilterAppliedRef = React.useRef(pendingVramFilterAppliedTracking);
  pendingVramFilterAppliedRef.current = pendingVramFilterAppliedTracking;
  const pendingPerformanceFilterAppliedRef = React.useRef(pendingPerformanceFilterAppliedTracking);
  pendingPerformanceFilterAppliedRef.current = pendingPerformanceFilterAppliedTracking;
  const pendingLoadMoreRef = React.useRef<{ visibleCountBefore: number } | null>(null);
  const wasLoadingMoreRef = React.useRef(false);

  // When performance view is disabled, exclude performance filters from API queries
  // Memoize to prevent infinite re-fetching
  const effectiveFilterData = React.useMemo(
    () => (performanceViewEnabled ? filters : getBasicFiltersOnly(filters)),
    [performanceViewEnabled, filters],
  );

  // Optimize: Only track the active latency field instead of entire filterData
  // This prevents unnecessary recalculations when non-latency filters change
  const activeLatencyField = React.useMemo(() => getActiveLatencyFieldName(filters), [filters]);

  const sortParams = React.useMemo(
    () => getSortParams(sortBy, performanceViewEnabled, activeLatencyField),
    [sortBy, performanceViewEnabled, activeLatencyField],
  );

  // Derive performance params to pass to the models API when performance view is enabled
  const performanceParams = React.useMemo(() => {
    if (!performanceViewEnabled) {
      return undefined;
    }

    const targetRPS = filters[ModelCatalogNumberFilterKey.MAX_RPS];
    const latencyProperty = activeLatencyField
      ? parseLatencyFilterKey(activeLatencyField).propertyKey
      : undefined;

    const orderBy =
      sortBy === ModelCatalogSortOption.LOWEST_COLD_START
        ? ModelCatalogNumberFilterKey.COLD_START_LOAD_TIME
        : SortField.RECOMMENDED;

    return {
      targetRPS,
      latencyProperty,
      orderBy,
    };
  }, [performanceViewEnabled, filters, activeLatencyField, sortBy]);

  const { catalogModels, catalogModelsLoaded, catalogModelsLoadError } = useCatalogModelsBySources(
    '',
    selectedSourceLabel === CategoryName.allModels ? undefined : selectedSourceLabel,
    10,
    searchTerm,
    effectiveFilterData,
    filterOptions,
    undefined, // filterQuery - will be computed from filterData and filterOptions
    sortParams.orderBy,
    sortParams.sortOrder,
    performanceParams,
  );

  catalogModelsRef.current = { size: catalogModels.size };

  useAfterCatalogQuery(
    pendingSearchTracking && onSearchTrackingFired,
    catalogModelsLoaded,
    catalogModelsLoadError,
    () => {
      if (!onSearchTrackingFired) {
        return;
      }
      const resultCount = catalogModelsRef.current.size;
      const activeFilterCount = countActiveFilters(filters, {
        performanceViewEnabled,
        getPerformanceFilterDefaultValue,
      });
      const properties: ModelCatalogSearchSubmittedProperties = {
        hasResults: resultCount > 0,
        resultCount,
        hasActiveFilters: activeFilterCount > 0,
        countActiveFilters: activeFilterCount,
      };
      trackSimpleEvent(MODEL_CATALOG_EVENTS.SEARCH_SUBMITTED, properties);
      onSearchTrackingFired();
    },
    () => onSearchTrackingFired?.(),
    [
      catalogModels.size,
      filters,
      performanceViewEnabled,
      getPerformanceFilterDefaultValue,
      trackSimpleEvent,
      onSearchTrackingFired,
    ],
    searchResubmitNonce,
  );

  useAfterCatalogQuery(
    pendingFilterAppliedTracking,
    catalogModelsLoaded,
    catalogModelsLoadError,
    () => {
      const pending = pendingFilterAppliedRef.current;
      if (!pending) {
        return;
      }
      const resultCount = catalogModelsRef.current.size;
      const activeFilterCount = countActiveFilters(filters, {
        performanceViewEnabled,
        getPerformanceFilterDefaultValue,
      });
      const properties: ModelCatalogFilterAppliedProperties = {
        filterType: pending.filterType,
        filterValue: pending.filterValue,
        isSelected: pending.isSelected,
        countActiveFilters: activeFilterCount,
        hasResults: resultCount > 0,
      };
      trackSimpleEvent(MODEL_CATALOG_EVENTS.FILTER_APPLIED, properties);
      setPendingFilterAppliedTracking(null);
    },
    () => setPendingFilterAppliedTracking(null),
    [
      catalogModels.size,
      filters,
      performanceViewEnabled,
      getPerformanceFilterDefaultValue,
      trackSimpleEvent,
      setPendingFilterAppliedTracking,
    ],
  );

  useAfterCatalogQuery(
    pendingVramFilterAppliedTracking,
    catalogModelsLoaded,
    catalogModelsLoadError,
    () => {
      const pending = pendingVramFilterAppliedRef.current;
      if (!pending) {
        return;
      }
      const resultCount = catalogModelsRef.current.size;
      const properties: ModelCatalogVramFilterAppliedProperties = {
        action: pending.action,
        hasResults: resultCount > 0,
      };
      trackSimpleEvent(MODEL_CATALOG_EVENTS.VRAM_FILTER_APPLIED, properties);
      setPendingVramFilterAppliedTracking(null);
    },
    () => setPendingVramFilterAppliedTracking(null),
    [catalogModels.size, trackSimpleEvent, setPendingVramFilterAppliedTracking],
  );

  useAfterCatalogQuery(
    pendingPerformanceFilterAppliedTracking,
    catalogModelsLoaded,
    catalogModelsLoadError,
    () => {
      const pending = pendingPerformanceFilterAppliedRef.current;
      if (!pending) {
        return;
      }
      const resultCount = catalogModelsRef.current.size;
      const properties: ModelCatalogPerformanceFilterAppliedProperties = {
        filterType: pending.filterType,
        action: pending.action,
        hasResults: resultCount > 0,
        ...(pending.latencyMetric !== undefined ? { latencyMetric: pending.latencyMetric } : {}),
      };
      trackSimpleEvent(MODEL_CATALOG_EVENTS.PERFORMANCE_FILTER_APPLIED, properties);
      setPendingPerformanceFilterAppliedTracking(null);
    },
    () => setPendingPerformanceFilterAppliedTracking(null),
    [catalogModels.size, trackSimpleEvent, setPendingPerformanceFilterAppliedTracking],
  );

  React.useEffect(() => {
    const wasLoadingMore = wasLoadingMoreRef.current;
    wasLoadingMoreRef.current = catalogModels.isLoadingMore;

    if (!wasLoadingMore || catalogModels.isLoadingMore) {
      return;
    }

    const pending = pendingLoadMoreRef.current;
    if (!pending) {
      return;
    }

    const visibleCountAfter = catalogModels.items.length;
    if (visibleCountAfter <= pending.visibleCountBefore) {
      pendingLoadMoreRef.current = null;
      return;
    }

    const properties: ModelCatalogLoadMoreClickedProperties = {
      visibleCountBefore: pending.visibleCountBefore,
      visibleCountAfter,
      totalAvailable: catalogModels.size,
    };
    trackSimpleEvent(MODEL_CATALOG_EVENTS.LOAD_MORE_CLICKED, properties);
    pendingLoadMoreRef.current = null;
  }, [
    catalogModels.isLoadingMore,
    catalogModels.items.length,
    catalogModels.size,
    trackSimpleEvent,
  ]);

  const handleLoadMore = React.useCallback(() => {
    pendingLoadMoreRef.current = { visibleCountBefore: catalogModels.items.length };
    catalogModels.loadMore();
  }, [catalogModels]);

  const loaded = catalogModelsLoaded && filterOptionsLoaded && catalogLabelsLoaded;
  const loadError = catalogModelsLoadError || filterOptionsLoadError || catalogLabelsLoadError;

  const isNoLabelsSection = selectedSourceLabel === SourceLabel.other;

  // Check if basic filters are applied
  const hasBasicFiltersApplied = React.useMemo(
    () => hasFiltersApplied(filters, BASIC_FILTER_KEYS),
    [filters],
  );

  // Check if Hardware Configuration filter is applied
  const hasHardwareConfigurationApplied = React.useMemo(() => {
    const hardwareConfig = filters[ModelCatalogStringFilterKey.HARDWARE_CONFIGURATION];
    return Array.isArray(hardwareConfig) && hardwareConfig.length > 0;
  }, [filters]);

  // When performance view is enabled, performance filters have default values.
  const hasPerformanceFiltersChanged = React.useMemo(() => {
    if (!performanceViewEnabled) {
      return false;
    }
    return PERFORMANCE_FILTER_KEYS.some((filterKey) => {
      const filterValue = filters[filterKey];
      const defaultValue = getPerformanceFilterDefaultValue(filterKey);

      if (filterValue === undefined) {
        return false;
      }

      if (Array.isArray(filterValue) && filterValue.length === 0) {
        return false;
      }

      return isValueDifferentFromDefault(filterValue, defaultValue);
    });
  }, [performanceViewEnabled, filters, getPerformanceFilterDefaultValue]);

  const noUserFiltersOrSearch = React.useMemo(
    () =>
      !hasBasicFiltersApplied &&
      !hasHardwareConfigurationApplied &&
      !hasPerformanceFiltersChanged &&
      !searchTerm,
    [
      hasBasicFiltersApplied,
      hasHardwareConfigurationApplied,
      hasPerformanceFiltersChanged,
      searchTerm,
    ],
  );

  const shouldShowPerformanceEmptyState = React.useMemo(() => {
    const isEmptyResult = catalogModels.items.length === 0;
    const isNotAllModelsCategory = selectedSourceLabel !== CategoryName.allModels;
    const isPerformanceExcludedSection = isNoLabelsSection || noUserFiltersOrSearch;

    return (
      performanceViewEnabled &&
      isEmptyResult &&
      isNotAllModelsCategory &&
      isPerformanceExcludedSection
    );
  }, [
    performanceViewEnabled,
    catalogModels.items.length,
    selectedSourceLabel,
    isNoLabelsSection,
    noUserFiltersOrSearch,
  ]);

  const handleDisablePerformanceView = () => {
    setPerformanceViewEnabled(false);
  };

  const handleSelectAllModels = () => {
    setSelectedSourceLabel(CategoryName.allModels);
    const properties: ModelCatalogCategorySelectedProperties = {
      category: toCategorySelectedValue(CategoryName.allModels),
    };
    trackSimpleEvent(MODEL_CATALOG_EVENTS.CATEGORY_SELECTED, properties);
  };

  const effectiveCategoryLabel = singleCategoryLabel || selectedSourceLabel || '';
  const categoryTitle = isSingleCategory
    ? getLabelDisplayName(effectiveCategoryLabel, catalogLabels)
    : undefined;
  const categoryDescription = isSingleCategory
    ? getLabelDescription(effectiveCategoryLabel, catalogLabels)
    : undefined;

  return (
    <CatalogGalleryLayout
      items={catalogModels.items}
      loaded={loaded}
      loadError={loadError}
      renderCard={(model: CatalogModel) => (
        <ModelCatalogCard
          model={model}
          source={getSourceFromSourceId(model.source_id || '', catalogSources)}
        />
      )}
      getItemKey={(model: CatalogModel) => `${model.name}/${model.source_id}`}
      hasMore={catalogModels.hasMore}
      isLoadingMore={catalogModels.isLoadingMore}
      onLoadMore={handleLoadMore}
      loadMoreLabel="Load more models"
      loadingMoreLabel="Loading more catalog models..."
      loadingLabel="Loading model catalog..."
      errorTitle="Failed to load model catalog"
      categoryTitle={categoryTitle}
      categoryDescription={categoryDescription}
      headerExtra={
        isSingleCategory && performanceViewEnabled ? (
          <ModelCatalogSortDropdown
            performanceViewEnabled={performanceViewEnabled}
            testId="model-catalog-category-sort-dropdown"
          />
        ) : undefined
      }
      renderExtraEmptyStates={() => {
        if (shouldShowPerformanceEmptyState) {
          return (
            <EmptyCatalogState
              testid="performance-empty-state"
              title={
                isSingleCategory
                  ? 'No performance data available'
                  : 'No performance data available in selected category'
              }
              headerIcon={ChartBarIcon}
              variant={EmptyStateVariant.lg}
              description={
                isSingleCategory ? (
                  'No models have performance data available. Turn off model performance view to see all models.'
                ) : (
                  <>
                    No models in the{' '}
                    <strong>
                      {selectedSourceLabel === 'null'
                        ? CategoryName.otherModels
                        : generateCategoryName(selectedSourceLabel || '')}
                    </strong>{' '}
                    category have performance data. Select another model category, or turn off model
                    performance view to see models in the selected category.
                  </>
                )
              }
              primaryAction={
                isSingleCategory ? undefined : (
                  <Button variant="primary" onClick={handleSelectAllModels}>
                    View all models with performance data
                  </Button>
                )
              }
              secondaryAction={
                <Button variant="link" onClick={handleDisablePerformanceView}>
                  Turn off model performance view
                </Button>
              }
            />
          );
        }

        if (catalogModels.items.length === 0 && noUserFiltersOrSearch) {
          return (
            <EmptyCatalogState
              testid="empty-model-catalog-state"
              title="No models available"
              headerIcon={SearchIcon}
              description="No models are available in this category"
            />
          );
        }

        return null;
      }}
      renderEmptyState={() => (
        <EmptyCatalogState
          testid="empty-model-catalog-state"
          title="No results found"
          headerIcon={SearchIcon}
          description="Adjust your filters and try again."
          primaryAction={
            <Button variant="link" onClick={handleFilterReset}>
              {RESET_ALL_FILTERS_LABEL}
            </Button>
          }
        />
      )}
    />
  );
};

export default ModelCatalogGalleryView;
