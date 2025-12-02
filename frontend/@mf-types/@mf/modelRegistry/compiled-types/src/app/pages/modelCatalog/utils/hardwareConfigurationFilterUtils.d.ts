import { CatalogPerformanceMetricsArtifact, ModelCatalogFilterStates } from '~/app/modelCatalogTypes';
import { LatencyMetricFieldName, LatencyPercentile, LatencyMetric } from '~/concepts/modelCatalog/const';
import { LatencyFilterConfig as SharedLatencyFilterConfig } from './latencyFilterState';
export type LatencyFilterConfig = SharedLatencyFilterConfig & {
    value: number;
};
/**
 * Maps metric and percentile combination to the corresponding artifact field
 */
export declare const getLatencyFieldName: (metric: LatencyMetric, percentile: LatencyPercentile) => LatencyMetricFieldName;
/**
 * Inverse of getLatencyFieldName
 */
export declare const parseLatencyFieldName: (fieldName: LatencyMetricFieldName) => {
    metric: LatencyMetric;
    percentile: LatencyPercentile;
} | null;
/**
 * Extracts unique hardware types from performance artifacts
 */
export declare const getUniqueHardwareTypes: (artifacts: CatalogPerformanceMetricsArtifact[]) => string[];
/**
 * Enhanced filter for Max Latency that supports metric and percentile selection
 */
export declare const applyMaxLatencyFilter: (artifact: CatalogPerformanceMetricsArtifact, config: LatencyFilterConfig) => boolean;
/**
 * Filters hardware configuration artifacts based on current filter state
 */
export declare const filterHardwareConfigurationArtifacts: (artifacts: CatalogPerformanceMetricsArtifact[], filterState: ModelCatalogFilterStates, latencyConfig?: SharedLatencyFilterConfig) => CatalogPerformanceMetricsArtifact[];
/**
 * Clears all active filters
 */
export declare const clearAllFilters: (setFilterData: <K extends keyof ModelCatalogFilterStates>(key: K, value: ModelCatalogFilterStates[K]) => void) => void;
