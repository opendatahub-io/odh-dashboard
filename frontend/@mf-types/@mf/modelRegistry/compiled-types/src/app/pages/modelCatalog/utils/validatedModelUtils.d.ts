import { CatalogPerformanceMetricsArtifact, CatalogAccuracyMetricsArtifact, CatalogModel } from '~/app/modelCatalogTypes';
import { LatencyFilterKey } from '~/concepts/modelCatalog/const';
/**
 * Type for latency metrics - uses LatencyFilterKey from const.ts
 * to dynamically define all possible latency field keys
 */
export type LatencyMetricsMap = Partial<Record<LatencyFilterKey, number>>;
export type ValidatedModelMetrics = {
    hardwareConfiguration: string;
    hardwareType: string;
    hardwareCount: string;
    rpsPerReplica: number;
    ttftMean: number;
    replicas: number | undefined;
    totalRequestsPerSecond: number | undefined;
    latencyMetrics: LatencyMetricsMap;
};
export type PerformanceMetrics = {
    hardwareConfiguration: string;
    hardwareType: string;
    hardwareCount: string;
    rpsPerReplica: number;
    ttftMean: number;
    replicas: number | undefined;
    totalRequestsPerSecond: number | undefined;
    latencyMetrics: LatencyMetricsMap;
};
export declare const extractPerformanceMetrics: (performanceMetrics: CatalogPerformanceMetricsArtifact) => PerformanceMetrics;
/**
 * Gets the latency value for a specific filter key from the latency metrics.
 * The filterKey should be in the full format (e.g., 'artifacts.ttft_p90.double_value').
 */
export declare const getLatencyValue: (latencyMetrics: ValidatedModelMetrics["latencyMetrics"], filterKey: LatencyFilterKey | undefined) => number | undefined;
export declare const extractValidatedModelMetrics: (performanceMetrics: CatalogPerformanceMetricsArtifact[], _accuracyMetrics: CatalogAccuracyMetricsArtifact[], currentPerformanceIndex?: number) => ValidatedModelMetrics | null;
export declare const sortModelsWithCurrentFirst: (models: CatalogModel[], currentModelName: string, limit?: number) => CatalogModel[];
