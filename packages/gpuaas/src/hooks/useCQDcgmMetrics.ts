import * as React from 'react';
import usePrometheusQuery from '@odh-dashboard/internal/api/prometheus/usePrometheusQuery';
import { PrometheusQueryResponse } from '@odh-dashboard/internal/types';
import { CQDcgmResult } from '../types';
import {
  INFRASTRUCTURE_REFRESH_INTERVAL,
  PROMQL_COMPUTE_BY_MODEL,
  PROMQL_MEMORY_BY_MODEL,
} from '../const';
import { normalizeModelName } from '../utils/clusterQueueUtils';

export type { CQDcgmResult };

const PROMETHEUS_API = '/api/prometheus/query';

type ByModelResponse = PrometheusQueryResponse<{ metric?: { modelName?: string } }>;

export const parseByModel = (response: ByModelResponse | null): Map<string, number> => {
  const out = new Map<string, number>();
  if (!response?.data.result) {
    return out;
  }
  for (const { metric, value } of response.data.result) {
    const { modelName } = metric ?? {};
    if (!modelName) {
      continue;
    }
    const pct = Math.round(parseFloat(value[1]));
    if (!Number.isNaN(pct)) {
      out.set(normalizeModelName(modelName), pct);
    }
  }
  return out;
};

type CQDcgmMetricsReturn = {
  /** Map from GPU model name → per-model DCGM utilization */
  byModel: Map<string, CQDcgmResult>;
  loaded: boolean;
  dcgmAvailable: boolean;
};

/**
 * Fetches per-GPU-model DCGM compute and memory utilization in two scalar
 * Prometheus queries (one for compute, one for memory), both of which return
 * all model names at once.  This avoids calling hooks in a loop.
 */
const useCQDcgmMetrics = (refreshRate = INFRASTRUCTURE_REFRESH_INTERVAL): CQDcgmMetricsReturn => {
  const fetchOptions = React.useMemo(() => ({ refreshRate }), [refreshRate]);

  const computeState = usePrometheusQuery<ByModelResponse>(
    PROMETHEUS_API,
    PROMQL_COMPUTE_BY_MODEL,
    fetchOptions,
  );
  const memoryState = usePrometheusQuery<ByModelResponse>(
    PROMETHEUS_API,
    PROMQL_MEMORY_BY_MODEL,
    fetchOptions,
  );

  const loaded =
    (computeState.loaded || !!computeState.error) && (memoryState.loaded || !!memoryState.error);

  const computeSettled = computeState.loaded || !!computeState.error;
  const memorySettled = memoryState.loaded || !!memoryState.error;

  const byModel = React.useMemo((): Map<string, CQDcgmResult> => {
    const computeMap = parseByModel(computeState.data);
    const memoryMap = parseByModel(memoryState.data);

    const allModels = new Set([...computeMap.keys(), ...memoryMap.keys()]);
    const result = new Map<string, CQDcgmResult>();
    for (const model of allModels) {
      result.set(model, {
        // undefined (→ "No telemetry data") once settled; null (→ spinner) while loading
        computePercentage: computeSettled ? computeMap.get(model) : null,
        memoryPercentage: memorySettled ? memoryMap.get(model) : null,
      });
    }
    return result;
  }, [computeState.data, memoryState.data, computeSettled, memorySettled]);

  const dcgmAvailable = byModel.size > 0;

  return { byModel, loaded, dcgmAvailable };
};

export default useCQDcgmMetrics;
