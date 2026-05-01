import { CatalogArtifacts, CatalogFilterOptionsList, CatalogLabel, CatalogLabelList, CatalogModel, CatalogModelDetailsParams, CatalogSource, CatalogSourceList, ModelCatalogFilterStates, ModelCatalogStringFilterValueType, ModelCatalogFilterKey } from '~/app/modelCatalogTypes';
import { ModelCatalogStringFilterKey, ModelCatalogNumberFilterKey, LatencyMetricFieldName, ModelCatalogSortOption } from '~/concepts/modelCatalog/const';
export declare const extractVersionTag: (tags?: string[]) => string | undefined;
export declare const filterNonVersionTags: (tags?: string[]) => string[] | undefined;
export declare const getModelName: (modelName: string) => string;
export declare const decodeParams: (params: Readonly<CatalogModelDetailsParams>) => CatalogModelDetailsParams;
export declare const encodeParams: (params: CatalogModelDetailsParams) => CatalogModelDetailsParams;
export declare const filterEnabledCatalogSources: (catalogSources: CatalogSourceList | null) => CatalogSourceList | null;
export declare const getModelArtifactUri: (artifacts: CatalogArtifacts[]) => string;
export declare const hasModelArtifacts: (artifacts: CatalogArtifacts[]) => boolean;
/**
 * Extracts architecture values from the model artifact's custom properties.
 * The architecture custom property should be a JSON-encoded array of architecture strings.
 * Architectures are normalized to lowercase and deduplicated.
 *
 * @param artifacts Array of catalog artifacts to search
 * @returns Array of architecture strings, or empty array if none found or invalid
 */
export declare const getArchitecturesFromArtifacts: (artifacts: CatalogArtifacts[]) => string[];
export declare const hasPerformanceArtifacts: (artifacts: CatalogArtifacts[]) => boolean;
export declare const isModelValidated: (model: CatalogModel) => boolean;
export declare const isRedHatModel: (model: CatalogModel) => boolean;
export declare const shouldShowValidatedInsights: (model: CatalogModel, artifacts: CatalogArtifacts[]) => boolean;
export declare const useCatalogStringFilterState: <K extends ModelCatalogStringFilterKey>(filterKey: K) => {
    isSelected: (value: ModelCatalogStringFilterValueType[K]) => boolean;
    setSelected: (value: string, selected: boolean) => void;
};
export declare const useCatalogNumberFilterState: (filterKey: ModelCatalogNumberFilterKey) => {
    value: number | undefined;
    setValue: (value: number | undefined) => void;
};
/**
 * Gets the active latency field name from the filter state (if any)
 */
export declare const getActiveLatencyFieldName: (filterData: ModelCatalogFilterStates) => LatencyMetricFieldName | undefined;
export declare const getEffectiveSortBy: (sortBy: ModelCatalogSortOption | null, performanceViewEnabled: boolean) => ModelCatalogSortOption;
/**
 * Gets the sort parameters for API requests based on sort option and filter state.
 * @param sortBy - The selected sort option (or null for default)
 * @param performanceViewEnabled - Whether performance view is enabled
 * @param activeLatencyField - The active latency field name (if any)
 * @returns Object with orderBy and sortOrder for API requests
 */
export declare const getSortParams: (sortBy: ModelCatalogSortOption | null, performanceViewEnabled: boolean, activeLatencyField: LatencyMetricFieldName | undefined) => {
    orderBy: string;
    sortOrder: string;
};
/**
 * Strips the 'artifacts.' prefix from a filter key if present.
 * Used when constructing filterQuery for artifacts endpoint.
 * Example: 'artifacts.use_case.string_value' -> 'use_case.string_value'
 */
export declare const stripArtifactsPrefix: (filterId: string) => string;
/**
 * Target endpoint type for filter query construction.
 * - 'models': Include all filters (except RPS), use filter keys directly
 * - 'artifacts': Only include artifact-prefixed filters, strip the prefix in output
 */
export type FilterQueryTarget = 'models' | 'artifacts';
/**
 * Converts filter data into a filter query string.
 *
 * @param filterData - The current filter state
 * @param options - Filter options from the server (includes namedQueries for operators)
 * @param target - The target endpoint:
 *   - 'models': Include all filters (except RPS), use filter keys directly
 *   - 'artifacts': Only include artifact-prefixed filters, strip the prefix in output
 *
 * Note: RPS is NOT included in filterQuery for either target - it's passed as targetRPS param.
 */
export declare const filtersToFilterQuery: (filterData: ModelCatalogFilterStates, options: CatalogFilterOptionsList, target?: FilterQueryTarget) => string;
/**
 * Returns a copy of filterData with only basic (non-performance) filters.
 * Used when performance view is disabled to exclude performance filters from API queries.
 * Performance filters are cleared to their empty state ([] for arrays, undefined for numbers).
 */
export declare const getBasicFiltersOnly: (filterData: ModelCatalogFilterStates) => ModelCatalogFilterStates;
export declare const getUniqueSourceLabels: (catalogSources: CatalogSourceList | null) => string[];
export declare const hasSourcesWithoutLabels: (catalogSources: CatalogSourceList | null) => boolean;
export declare const getSourceFromSourceId: (sourceId: string, catalogSources: CatalogSourceList | null) => CatalogSource | undefined;
/**
 * Checks if any filters are applied. If filterKeys is provided, only checks those specific filters.
 * Otherwise checks all filters.
 */
export declare const hasFiltersApplied: (filterData: ModelCatalogFilterStates, filterKeys?: ModelCatalogFilterKey[]) => boolean;
/**
 * Checks if a filter value differs from its default value.
 * Used to determine if a filter chip should be visible.
 */
export declare const isValueDifferentFromDefault: (currentValue: string | number | string[] | undefined, defaultValue: string | number | string[] | undefined) => boolean;
/**
 * Filters catalog sources to only include those with discoverable models.
 * A source has models if its status is AVAILABLE or PARTIALLY_AVAILABLE.
 * This is used to filter out disabled sources or sources with errors from the switcher.
 */
export declare const filterSourcesWithModels: (catalogSources: CatalogSourceList | null) => CatalogSourceList | null;
/**
 * Checks if there are any catalog sources that have models available.
 * Returns true if at least one source has status AVAILABLE or PARTIALLY_AVAILABLE.
 */
export declare const hasSourcesWithModels: (catalogSources: CatalogSourceList | null) => boolean;
export declare const generateCategoryName: (name: string) => string;
/**
 * Finds a label from the catalog labels list that matches the given source label name.
 * Handles the special case where sourceLabel is 'null' (other/unlabeled sources).
 * @param sourceLabel The label string from a source (or SourceLabel.other for unlabeled sources)
 * @param catalogLabels The list of catalog labels from the API
 * @returns The matching CatalogLabel or undefined if not found
 */
export declare const findLabelData: (sourceLabel: string | undefined, catalogLabels: CatalogLabelList | null) => CatalogLabel | undefined;
/**
 * Gets the display name for a source label, using the catalog labels data if available.
 * Falls back to the raw label name with the given suffix appended if no display name is found.
 * @param sourceLabel The label string from a source (or SourceLabel.other for unlabeled sources)
 * @param catalogLabels The list of catalog labels from the API
 * @param otherFallback Display name for sources without labels (default: 'Other models')
 * @param categorySuffix Suffix appended to the label name when no display name exists (default: 'models')
 * @returns The display name to show in the UI
 */
export declare const getLabelDisplayName: (sourceLabel: string | undefined, catalogLabels: CatalogLabelList | null, otherFallback?: string, categorySuffix?: string) => string;
/**
 * Gets the description for a source label from the catalog labels data.
 * @param sourceLabel The label string from a source (or SourceLabel.other for unlabeled sources)
 * @param catalogLabels The list of catalog labels from the API
 * @returns The description text or undefined if not found
 */
export declare const getLabelDescription: (sourceLabel: string | undefined, catalogLabels: CatalogLabelList | null) => string | undefined;
/**
 * Orders source labels according to the order in the catalog labels list.
 * Labels that appear in catalogLabels are ordered first (in the order they appear in the API),
 * followed by any labels found on sources that don't appear in catalogLabels.
 * @param sourceLabels Array of unique source labels from the sources
 * @param catalogLabels The list of catalog labels from the API
 * @returns Ordered array of source labels
 */
export declare const orderLabelsByPriority: (sourceLabels: string[], catalogLabels: CatalogLabelList | null) => string[];
export declare const getActiveSourceLabels: (catalogSources: CatalogSourceList | null, catalogLabels: CatalogLabelList | null) => string[];
/**
 * Formats model type value for display in the UI.
 * Converts raw API values (generative, predictive, unknown) to user-friendly display labels.
 *
 * @param modelTypeRaw The raw model type value from customProperties, or null if not set
 * @returns Formatted display string for the model type
 */
export declare const formatModelTypeDisplay: (modelTypeRaw: string | null) => string;
