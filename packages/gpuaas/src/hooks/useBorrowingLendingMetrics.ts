import * as React from 'react';
import usePrometheusQueryRange from '@odh-dashboard/internal/api/prometheus/usePrometheusQueryRange';
import { ClusterQueueKind } from '@odh-dashboard/k8s-core';
import type {
  PrometheusQueryRangeResponseData,
  PrometheusQueryRangeResponseDataResult,
  PrometheusQueryRangeResultValue,
} from '@odh-dashboard/internal/types';
import {
  ACCELERATOR_RESOURCE_PREFIXES,
  ACCELERATOR_RESOURCE_REGEX,
  SEVEN_DAYS_MS,
  TREND_REFRESH_INTERVAL,
} from '../const';
import { UnifiedCohort } from '../types';
import parseK8sQuantity from '../utils/parseK8sQuantity';

const SEVEN_DAYS_IN_SECONDS = SEVEN_DAYS_MS / 1000;
const HOURLY_STEP = 3600;
const PROMETHEUS_API_PATH = '/api/prometheus/queryRange';

const isAcceleratorResource = (resourceName: string): boolean =>
  ACCELERATOR_RESOURCE_PREFIXES.some((prefix) => resourceName.startsWith(prefix));

/** Extended metric type that includes Kueue-specific Prometheus labels. */
export type KueueUsageMetricResult = {
  metric: PrometheusQueryRangeResponseDataResult['metric'] & {
    cluster_queue?: string;
    cohort?: string;
  };
  values: PrometheusQueryRangeResultValue[];
};

/** Type guard that widens a base result to include optional Kueue label fields. */
const isKueueUsageResult = (
  r: PrometheusQueryRangeResponseDataResult,
): r is KueueUsageMetricResult => 'metric' in r && 'values' in r;

const kueueUsagePredicate = (data: PrometheusQueryRangeResponseData): KueueUsageMetricResult[] =>
  (data.result ?? []).filter(isKueueUsageResult);

export type CQMetricSeries = {
  cqName: string;
  /** Empty string means standalone (not in a cohort). */
  cohortName: string;
  /** Nominal GPU quota declared for this cluster queue (in GPU units). */
  nominalQuota: number;
  data: { x: number; y: number }[];
};

type CQInfo = {
  nominalQuota: number;
  cohortName: string;
};

type BorrowingLendingMetricsResult = {
  series: CQMetricSeries[];
  loaded: boolean;
  error: Error | undefined;
};

const getGpuNominalQuota = (cq: ClusterQueueKind): number =>
  (cq.spec.resourceGroups ?? []).reduce(
    (total, rg) =>
      total +
      rg.flavors.reduce(
        (sum, f) =>
          sum +
          f.resources
            .filter((r) => isAcceleratorResource(r.name))
            .reduce((s, r) => s + parseK8sQuantity(r.nominalQuota), 0),
        0,
      ),
    0,
  );

/** Sum accelerator quota from a FlavorQuota pool (cohort-level). */
const getGpuNominalQuotaFromPool = (pool: UnifiedCohort['effectivePool']): number =>
  pool.reduce(
    (total, f) =>
      total +
      f.resources
        .filter((r) => isAcceleratorResource(r.name))
        .reduce((s, r) => s + r.nominalQuota, 0),
    0,
  );

const buildCQInfoMap = (cohorts: UnifiedCohort[]): Map<string, CQInfo> => {
  const map = new Map<string, CQInfo>();
  cohorts.forEach((cohort) => {
    const isStandalone = cohort.state === 'standalone';

    // For cohort members, use the cohort-level GPU pool as a fallback quota
    // when a CQ inherits quota implicitly rather than declaring it explicitly.
    const cohortPoolQuota = isStandalone ? 0 : getGpuNominalQuotaFromPool(cohort.effectivePool);

    cohort.memberClusterQueues.forEach((cq) => {
      const cqName = cq.metadata?.name ?? '';
      if (!cqName) {
        return;
      }
      const cqQuota = getGpuNominalQuota(cq);

      // Standalone CQs always use their own declared quota (no cohort pool).
      // Cohort CQs fall back to an equal share of the cohort pool when they
      // don't declare GPU resources explicitly in spec.resourceGroups.
      const nominalQuota = isStandalone
        ? cqQuota
        : cqQuota > 0
        ? cqQuota
        : cohort.memberClusterQueues.length > 0
        ? cohortPoolQuota / cohort.memberClusterQueues.length
        : 0;

      // Only add CQs that have GPU quota — standalone CQs with quota=0
      // have no GPU resources tracked and would only add noise.
      if (nominalQuota === 0) {
        return;
      }

      map.set(cqName, {
        nominalQuota,
        // Empty string signals "standalone" to the chart label formatter.
        cohortName: isStandalone ? '' : cohort.name,
      });
    });
  });
  return map;
};

const buildSeries = (
  prometheusResults: KueueUsageMetricResult[],
  cqInfoMap: Map<string, CQInfo>,
): CQMetricSeries[] =>
  prometheusResults
    .map((result) => {
      const cqName = result.metric.cluster_queue ?? '';
      if (!cqName) {
        return null;
      }
      const info = cqInfoMap.get(cqName);
      // Only include CQs that are members of a cohort — borrowing and lending
      // are cohort-level concepts. Standalone CQs cannot borrow or lend.
      if (!info) {
        return null;
      }
      return {
        cqName,
        cohortName: info.cohortName,
        nominalQuota: info.nominalQuota,
        data: result.values.map(([timestamp, valueStr]) => ({
          x: timestamp * 1000,
          y: parseFloat(valueStr) - info.nominalQuota,
        })),
      };
    })
    .filter((s): s is CQMetricSeries => s !== null);

// Use max instead of sum: Kueue runs with leader/follower replicas and both
// emit the same metric value. Summing across replicas would double-count.
// max by (cluster_queue) is equivalent to the leader's value and works for
// both single-replica and HA deployments.
const QUERY_LANG = `max by (cluster_queue) (kueue_cluster_queue_resource_usage{resource=~"${ACCELERATOR_RESOURCE_REGEX}"})`;

const useBorrowingLendingMetrics = (cohorts: UnifiedCohort[]): BorrowingLendingMetricsResult => {
  const cqInfoMap = React.useMemo(() => buildCQInfoMap(cohorts), [cohorts]);

  // Stabilise endInMs: initialise once and tick at the refresh interval.
  // Passing Date.now() directly would produce a new value on every render,
  // which recreates usePrometheusQueryRange's fetchData callback and triggers
  // a new HTTP request on every render cycle.
  const [endInMs, setEndInMs] = React.useState(() => Date.now());
  React.useEffect(() => {
    const id = setInterval(() => setEndInMs(Date.now()), TREND_REFRESH_INTERVAL);
    return () => clearInterval(id);
  }, []);

  const [prometheusResults, loaded, error] = usePrometheusQueryRange(
    true,
    PROMETHEUS_API_PATH,
    QUERY_LANG,
    SEVEN_DAYS_IN_SECONDS,
    endInMs,
    HOURLY_STEP,
    kueueUsagePredicate,
    '',
  );

  const series = React.useMemo(
    () => buildSeries(prometheusResults, cqInfoMap),
    [prometheusResults, cqInfoMap],
  );

  return { series, loaded, error };
};

export { buildSeries, getGpuNominalQuota };
export default useBorrowingLendingMetrics;
