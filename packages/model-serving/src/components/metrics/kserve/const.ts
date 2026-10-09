export const KSERVE_METRICS_CONFIG_MAP_NAME_SUFFIX = '-metrics-dashboard';

export enum KserveMetricsGraphTypes {
  CPU_USAGE = 'CPU_USAGE',
  MEMORY_USAGE = 'MEMORY_USAGE',
  REQUEST_COUNT = 'REQUEST_COUNT',
  MEAN_LATENCY = 'MEAN_LATENCY',
  // Shared with NimMetricsGraphTypes below (same string values): non-NIM
  // Kserve runtimes (e.g. vLLM) can already expose these metrics and the
  // odh-model-controller-generated ConfigMap can already contain graph
  // definitions of these types for such runtimes; they were previously
  // silently dropped by KservePerformanceGraphs.
  TIME_TO_FIRST_TOKEN = 'TIME_TO_FIRST_TOKEN',
  TIME_PER_OUTPUT_TOKEN = 'TIME_PER_OUTPUT_TOKEN',
  KV_CACHE = 'KV_CACHE',
  CURRENT_REQUESTS = 'CURRENT_REQUESTS',
  TOKENS_COUNT = 'TOKENS_COUNT',
  REQUEST_OUTCOMES = 'REQUEST_OUTCOMES',
}

export enum NimMetricsGraphTypes {
  TIME_TO_FIRST_TOKEN = 'TIME_TO_FIRST_TOKEN',
  TIME_PER_OUTPUT_TOKEN = 'TIME_PER_OUTPUT_TOKEN',
  KV_CACHE = 'KV_CACHE',
  CURRENT_REQUESTS = 'CURRENT_REQUESTS',
  TOKENS_COUNT = 'TOKENS_COUNT',
  REQUEST_OUTCOMES = 'REQUEST_OUTCOMES',
}
