import { LatencyMetric, LatencyPercentile } from '~/concepts/modelCatalog/const';
export type LatencyFilterConfig = {
    metric: LatencyMetric;
    percentile: LatencyPercentile;
};
export declare const getLatencyFilterConfig: () => LatencyFilterConfig;
export declare const setLatencyFilterConfig: (config: LatencyFilterConfig) => void;
export declare const useLatencyFilterConfig: () => {
    config: LatencyFilterConfig;
    updateConfig: (newConfig: LatencyFilterConfig) => void;
};
