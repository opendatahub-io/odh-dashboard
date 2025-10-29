import { CatalogPerformanceMetricsArtifact, CatalogAccuracyMetricsArtifact } from '~/app/modelCatalogTypes';
export type ValidatedModelMetrics = {
    hardwareType: string;
    hardwareCount: string;
    rpsPerReplica: number;
    ttftMean: number;
};
export type PerformanceMetrics = {
    hardwareType: string;
    hardwareCount: string;
    rpsPerReplica: number;
    ttftMean: number;
};
export declare const extractPerformanceMetrics: (performanceMetrics: CatalogPerformanceMetricsArtifact) => PerformanceMetrics;
export declare const extractValidatedModelMetrics: (performanceMetrics: CatalogPerformanceMetricsArtifact[], accuracyMetrics: CatalogAccuracyMetricsArtifact[], currentPerformanceIndex?: number) => ValidatedModelMetrics;
