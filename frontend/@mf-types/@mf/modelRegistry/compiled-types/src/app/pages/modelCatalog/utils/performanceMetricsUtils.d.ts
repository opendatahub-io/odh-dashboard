import { CatalogPerformanceMetricsArtifact, PerformanceMetricsCustomProperties } from '~/app/modelCatalogTypes';
export declare const getTotalRps: (customProperties: PerformanceMetricsCustomProperties | undefined) => number;
export declare const formatLatency: (value: number) => string;
export declare const formatTokenValue: (value: number) => string;
