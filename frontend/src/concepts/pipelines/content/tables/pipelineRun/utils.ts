export const ALL_RUNS_METRICS_COLUMNS_STORAGE_KEY = 'all-runs-metrics-columns';

export const getMetricsColumnsLocalStorageKey = (experimentId?: string): string =>
  experimentId ? `metrics-columns-${experimentId}` : ALL_RUNS_METRICS_COLUMNS_STORAGE_KEY;
