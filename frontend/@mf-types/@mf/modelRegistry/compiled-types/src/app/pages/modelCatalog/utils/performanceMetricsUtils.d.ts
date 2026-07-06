import { CatalogPerformanceMetricsArtifact } from '~/app/modelCatalogTypes';
export type SliderRange = {
    minValue: number;
    maxValue: number;
    isSliderDisabled: boolean;
};
export declare const MAX_RPS_MAX_VALUE = 50;
export declare const MAX_RPS_RANGE: SliderRange;
export declare const FALLBACK_RPS_RANGE: SliderRange;
export declare const FALLBACK_LATENCY_RANGE: SliderRange;
type CalculateSliderRangeOptions = {
    performanceArtifacts: CatalogPerformanceMetricsArtifact[];
    getArtifactFilterValue: (artifact: CatalogPerformanceMetricsArtifact) => number;
    fallbackRange: SliderRange;
    shouldRound?: boolean;
};
export declare const formatLatency: (value: number) => string;
export declare const formatTps: (value: number) => string;
export declare const formatTokenValue: (value: number) => string;
export declare const getWorkloadType: (artifact: CatalogPerformanceMetricsArtifact) => string;
export declare const getSliderRange: ({ performanceArtifacts, getArtifactFilterValue, fallbackRange, shouldRound, }: CalculateSliderRangeOptions) => SliderRange;
export {};
