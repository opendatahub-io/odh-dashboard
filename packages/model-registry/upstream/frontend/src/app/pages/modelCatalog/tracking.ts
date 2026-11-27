import { CategoryName, ModelCatalogFilterStates } from '~/app/modelCatalogTypes';
import {
  BASIC_FILTER_KEYS,
  getAllFiltersToShow,
  isLatencyFilterKey,
  LatencyMetric,
  ModelCatalogNumberFilterKey,
  ModelCatalogSortOption,
  ModelCatalogStringFilterKey,
} from '~/concepts/modelCatalog/const';
import { TrackingOutcome } from '~/concepts/userInteraction';
import { isValueDifferentFromDefault } from '~/app/pages/modelCatalog/utils/modelCatalogUtils';

/**
 * Model Catalog Segment event names and property types.
 * Frozen analytics contract — do not rename or reshape.
 * @see https://docs.google.com/document/d/13UKq-QHree-MTwhgEp70OqWt-HTWC1mFVmEOFEEOrWU
 */
export const MODEL_CATALOG_EVENTS = {
  VALIDATED_ARGUMENTS_COPIED: 'Model Catalog Validated Arguments Copied',
  VALIDATED_ARGUMENTS_EXPANDED: 'Model Catalog Validated Arguments Card Expanded',
  VALIDATED_ARGUMENTS_FILTER_APPLIED: 'Model Catalog Validated Arguments Filter Applied',
  VALIDATED_LABEL_CLICKED: 'Model Catalog Validated Label Clicked',
  MODEL_SELECTED: 'Model Catalog Model Selected',
  SEARCH_SUBMITTED: 'Model Catalog Search Submitted',
  FILTER_APPLIED: 'Model Catalog Filter Applied',
  VRAM_FILTER_APPLIED: 'Model Catalog VRAM Filter Applied',
  FILTERS_RESET: 'Model Catalog Filters Reset',
  LOAD_MORE_CLICKED: 'Model Catalog Load More Clicked',
  PERFORMANCE_VIEW_TOGGLED: 'Model Catalog Performance View Toggled',
  SORT_CHANGED: 'Model Catalog Sort Changed',
  PERFORMANCE_FILTER_APPLIED: 'Model Catalog Performance Filter Applied',
  DETAILS_VIEWED: 'Model Catalog Details Viewed',
  REGISTER_MODEL_CLICKED: 'Model Catalog Register Model Clicked',
  DEPLOY_CLICKED: 'Model Catalog Deploy Clicked',
  CATEGORY_SELECTED: 'Model Catalog Category Selected',
  COLUMN_CUSTOMIZATION_UPDATED: 'Model Catalog Column Customization Updated',
} as const;

export type ModelCatalogSearchSubmittedProperties = {
  hasResults: boolean;
  resultCount: number;
  hasActiveFilters: boolean;
  countActiveFilters: number;
};

export type ModelCatalogFilterAppliedType =
  | 'task'
  | 'provider'
  | 'license'
  | 'tensorType'
  | 'containerSize';

export type ModelCatalogFilterAppliedProperties = {
  filterType: ModelCatalogFilterAppliedType;
  filterValue: string | number;
  isSelected: boolean;
  countActiveFilters: number;
  hasResults: boolean;
};

export type ModelCatalogVramFilterAppliedProperties = {
  action: 'applied' | 'reset';
  hasResults: boolean;
};

export type ModelCatalogFiltersResetSource = 'toolbar' | 'emptyState';

export type ModelCatalogFiltersResetProperties = {
  source: ModelCatalogFiltersResetSource;
};

export type ModelCatalogLoadMoreClickedProperties = {
  visibleCountBefore: number;
  visibleCountAfter: number;
  totalAvailable: number;
};

export type ModelCatalogPerformanceViewToggledProperties = {
  isEnabled: boolean;
};

export type ModelCatalogDetailsEntrySource = 'cardName' | 'benchmarksLink' | 'directUrl';

export type ModelCatalogDetailsNavigationState = {
  entrySource: 'cardName' | 'benchmarksLink';
  hasActiveFilters: boolean;
  isPerformanceView: boolean;
};

export type ModelCatalogDetailsViewedProperties = {
  modelName: string;
  entrySource: ModelCatalogDetailsEntrySource;
  hasActiveFilters: boolean;
  isPerformanceView: boolean;
};

export type ModelCatalogRegisterModelClickedProperties = {
  modelName: string;
};

export type ModelCatalogDeployClickedProperties = {
  modelName: string;
};

export type ModelCatalogCategorySelectedValue = 'all' | 'validated' | 'redhat' | 'other';

export type ModelCatalogCategorySelectedProperties = {
  category: ModelCatalogCategorySelectedValue;
};

export const toCategorySelectedValue = (
  sourceLabel: string | undefined,
): ModelCatalogCategorySelectedValue => {
  if (!sourceLabel || sourceLabel === CategoryName.allModels) {
    return 'all';
  }
  const normalized = sourceLabel.toLowerCase();
  if (normalized.includes('validated')) {
    return 'validated';
  }
  if (normalized === 'red hat ai' || normalized === 'red hat ai models') {
    return 'redhat';
  }
  return 'other';
};

export type ModelCatalogColumnCustomizationSource = 'catalog' | 'modelDetails';

export type ModelCatalogColumnCustomizationUpdatedProperties = {
  source: ModelCatalogColumnCustomizationSource;
  outcome: TrackingOutcome;
  success: boolean;
  countVisibleColumns: number;
  error?: string;
};

let lastTrackedDetailsViewedKey: string | null = null;

export const claimDetailsViewedTracking = (key: string): boolean => {
  if (lastTrackedDetailsViewedKey === key) {
    return false;
  }
  lastTrackedDetailsViewedKey = key;
  return true;
};

export const resetDetailsViewedTracking = (): void => {
  lastTrackedDetailsViewedKey = null;
};

export const isModelCatalogDetailsNavigationState = (
  state: unknown,
): state is ModelCatalogDetailsNavigationState => {
  if (!state || typeof state !== 'object' || !('entrySource' in state)) {
    return false;
  }
  const { entrySource } = state;
  return entrySource === 'cardName' || entrySource === 'benchmarksLink';
};

export type ModelCatalogSortChangedOption = 'latency' | 'coldStart' | 'updated';

export type ModelCatalogSortChangedProperties = {
  sortOption: ModelCatalogSortChangedOption;
};

export const toSortChangedOption = (
  sortBy: ModelCatalogSortOption,
): ModelCatalogSortChangedOption => {
  switch (sortBy) {
    case ModelCatalogSortOption.LOWEST_LATENCY:
      return 'latency';
    case ModelCatalogSortOption.LOWEST_COLD_START:
      return 'coldStart';
    case ModelCatalogSortOption.RECENT_PUBLISH:
      return 'updated';
  }
};

export type ModelCatalogPerformanceFilterAppliedType =
  | 'coldStart'
  | 'latency'
  | 'rps'
  | 'workload'
  | 'hardware';

export type ModelCatalogPerformanceFilterLatencyMetric = 'TTFT' | 'ITL' | 'E2E' | 'TPS';

export type ModelCatalogPerformanceFilterAppliedProperties = {
  filterType: ModelCatalogPerformanceFilterAppliedType;
  action: 'applied' | 'reset';
  latencyMetric?: ModelCatalogPerformanceFilterLatencyMetric;
  hasResults: boolean;
};

export const toPerformanceFilterAppliedType = (
  filterKey: string,
): ModelCatalogPerformanceFilterAppliedType | undefined => {
  if (isLatencyFilterKey(filterKey)) {
    return 'latency';
  }
  switch (filterKey) {
    case ModelCatalogNumberFilterKey.COLD_START_LOAD_TIME:
      return 'coldStart';
    case ModelCatalogNumberFilterKey.MAX_RPS:
      return 'rps';
    case ModelCatalogStringFilterKey.USE_CASE:
      return 'workload';
    case ModelCatalogStringFilterKey.HARDWARE_CONFIGURATION:
      return 'hardware';
    default:
      return undefined;
  }
};

export const toPerformanceFilterLatencyMetric = (
  metric: LatencyMetric,
): ModelCatalogPerformanceFilterLatencyMetric => {
  switch (metric) {
    case LatencyMetric.TTFT:
      return 'TTFT';
    case LatencyMetric.ITL:
      return 'ITL';
    case LatencyMetric.E2E:
      return 'E2E';
    case LatencyMetric.TPS:
      return 'TPS';
  }
};

export const toFilterAppliedType = (
  filterKey: string,
): ModelCatalogFilterAppliedType | undefined => {
  switch (filterKey) {
    case ModelCatalogStringFilterKey.TASK:
      return 'task';
    case ModelCatalogStringFilterKey.PROVIDER:
      return 'provider';
    case ModelCatalogStringFilterKey.LICENSE:
      return 'license';
    case ModelCatalogStringFilterKey.TENSOR_TYPE:
      return 'tensorType';
    case ModelCatalogNumberFilterKey.IMAGE_SIZE:
      return 'containerSize';
    default:
      return undefined;
  }
};

export type CountActiveFiltersOptions = {
  performanceViewEnabled: boolean;
  getPerformanceFilterDefaultValue: (
    filterKey: keyof ModelCatalogFilterStates,
  ) => string | number | string[] | undefined;
};

/** Counts constraints Reset all clears (not search text or category). */
export const countActiveFilters = (
  filters: ModelCatalogFilterStates,
  { performanceViewEnabled, getPerformanceFilterDefaultValue }: CountActiveFiltersOptions,
): number => {
  const keys = performanceViewEnabled ? getAllFiltersToShow(filters) : BASIC_FILTER_KEYS;

  let count = 0;
  for (const filterKey of keys) {
    const filterValue = filters[filterKey];
    const hasValue =
      filterValue !== undefined && !(Array.isArray(filterValue) && filterValue.length === 0);
    if (!hasValue) {
      continue;
    }

    const defaultValue = getPerformanceFilterDefaultValue(filterKey);
    if (defaultValue !== undefined && !isValueDifferentFromDefault(filterValue, defaultValue)) {
      continue;
    }

    if (Array.isArray(filterValue)) {
      count += filterValue.length;
    } else {
      count += 1;
    }
  }
  return count;
};

export const buildModelCatalogDetailsNavigationState = (
  entrySource: 'cardName' | 'benchmarksLink',
  filters: ModelCatalogFilterStates,
  options: CountActiveFiltersOptions,
): ModelCatalogDetailsNavigationState => {
  const activeFilterCount = countActiveFilters(filters, options);
  return {
    entrySource,
    hasActiveFilters: activeFilterCount > 0,
    isPerformanceView: options.performanceViewEnabled,
  };
};

export const getToggledFilterValue = (
  previousValues: string[] | undefined,
  nextValues: string[],
): string | undefined => {
  const prev = previousValues ?? [];
  const added = nextValues.find((value) => !prev.includes(value));
  if (added) {
    return added;
  }
  return prev.find((value) => !nextValues.includes(value));
};
