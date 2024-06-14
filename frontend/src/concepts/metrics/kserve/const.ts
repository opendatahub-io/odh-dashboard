export const KSERVE_METRICS_CONFIG_MAP_NAME_SUFFIX = '-metrics-dashboard';

export enum KserveMetricsGraphTypes {
  CPU_USAGE = 'CPU_USAGE',
  MEMORY_USAGE = 'MEMORY_USAGE',
  REQUEST_COUNT = 'REQUEST_COUNT',
  MEAN_LATENCY = 'MEAN_LATENCY',
}
