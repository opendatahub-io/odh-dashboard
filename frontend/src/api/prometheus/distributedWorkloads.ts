import * as React from 'react';
import { FetchStateObject, PrometheusQueryRangeResultValue } from '~/types';
import { useMakeFetchObject } from '~/utilities/useMakeFetchObject';
import { TimeframeTitle } from '~/concepts/metrics/types';
import useRefreshInterval from '~/utilities/useRefreshInterval';
import usePrometheusNumberValueQuery from './usePrometheusNumberValueQuery';
import { defaultResponsePredicate } from './usePrometheusQueryRange';
import useQueryRangeResourceData from './useQueryRangeResourceData';

export type DWProjectMetricsValues = {
  cpuRequested: number;
  cpuUtilized: number;
};
export type DWProjectMetricType = keyof DWProjectMetricsValues;
export type DWProjectMetrics = FetchStateObject<{
  [key in DWProjectMetricType]: FetchStateObject<DWProjectMetricsValues[key] | undefined>;
}>;

// TODO mturley things to think about when it's time to implement the project metrics tab:
//      * double-check the units we're getting back here - percent? absolute usage? int/float?
//      * what about "utilized by all projects", how do we get that?
//      * what about unused? do we just derive that by (all - used)?

const getDWProjectMetricsQueries = (namespace: string): Record<DWProjectMetricType, string> => ({
  cpuRequested: `namespace=${namespace}&query=kube_pod_container_resource_requests{namespace='${namespace}', resource='cpu'}`,
  cpuUtilized: `namespace=${namespace}&query=pod:container_cpu_usage:sum{namespace='${namespace}'}`,
});

// TODO mturley add unit tests for useDWProjectMetrics once RBAC issues are settled and we know these are really the queries we need

export const useDWProjectMetrics = (namespace?: string, refreshRate = 0): DWProjectMetrics => {
  const queries = namespace ? getDWProjectMetricsQueries(namespace) : undefined;
  const data: DWProjectMetrics['data'] = {
    cpuRequested: useMakeFetchObject(
      usePrometheusNumberValueQuery(queries?.cpuRequested, refreshRate),
    ),
    cpuUtilized: useMakeFetchObject(
      usePrometheusNumberValueQuery(queries?.cpuUtilized, refreshRate),
    ),
  };
  const cpuRequestedRefresh = data.cpuRequested.refresh;
  const cpuUtilizedRefresh = data.cpuUtilized.refresh;
  return {
    data,
    refresh: React.useCallback(() => {
      cpuRequestedRefresh();
      cpuUtilizedRefresh();
    }, [cpuRequestedRefresh, cpuUtilizedRefresh]),
    loaded: Object.values(data).every(({ loaded }) => loaded),
    error: Object.values(data).find(({ error }) => !!error)?.error,
  };
};

export type DWWorkloadTrendMetricsValues = {
  jobsActiveTrend: PrometheusQueryRangeResultValue[];
  jobsInadmissibleTrend: PrometheusQueryRangeResultValue[];
  jobsPendingTrend: PrometheusQueryRangeResultValue[];
};

export type DWWorkloadTrendMetricType = keyof DWWorkloadTrendMetricsValues;
export type DWWorkloadTrendMetrics = FetchStateObject<{
  [key in DWWorkloadTrendMetricType]: FetchStateObject<DWWorkloadTrendMetricsValues[key]> & {
    pending?: boolean;
  };
}>;

const getDWWorkloadTrendMetricsQueries = (
  namespace: string,
): Record<DWWorkloadTrendMetricType, string> => ({
  jobsActiveTrend: `kube_job_status_active{namespace='${namespace}'}`,
  jobsInadmissibleTrend: `kueue_pending_workloads{status='inadmissible', namespace='${namespace}'}`,
  jobsPendingTrend: `kueue_pending_workloads{status!='inadmissible', namespace='${namespace}'}`,
});

// TODO mturley this workloadTrendMetrics is currently unused until RBAC issues are resolved and the DWStatusTrendsChart is restored.

export const useDWWorkloadTrendMetrics = (
  timeframe: TimeframeTitle,
  lastUpdateTime: number,
  setLastUpdateTime: (time: number) => void,
  namespace?: string,
  refreshRate = 0,
): DWWorkloadTrendMetrics => {
  const [end, setEnd] = React.useState(lastUpdateTime);
  const queries = namespace ? getDWWorkloadTrendMetricsQueries(namespace) : undefined;
  const data: DWWorkloadTrendMetrics['data'] = {
    jobsActiveTrend: useQueryRangeResourceData(
      !!queries,
      queries?.jobsActiveTrend || '',
      end,
      timeframe,
      defaultResponsePredicate,
      namespace || '',
      '/api/prometheus/queryRange',
      { initialPromisePurity: true },
    ),
    jobsInadmissibleTrend: useQueryRangeResourceData(
      !!queries,
      queries?.jobsInadmissibleTrend || '',
      end,
      timeframe,
      defaultResponsePredicate,
      namespace || '',
      '/api/prometheus/queryRange',
      { initialPromisePurity: true },
    ),
    jobsPendingTrend: useQueryRangeResourceData(
      !!queries,
      queries?.jobsPendingTrend || '',
      end,
      timeframe,
      defaultResponsePredicate,
      namespace || '',
      '/api/prometheus/queryRange',
      { initialPromisePurity: true },
    ),
  };

  React.useEffect(() => {
    setLastUpdateTime(Date.now());
    // re-compute lastUpdateTime when data changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.jobsActiveTrend, data.jobsInadmissibleTrend, data.jobsPendingTrend]);

  const refreshAllMetrics = React.useCallback(() => {
    setEnd(Date.now());
  }, []);

  useRefreshInterval(refreshRate, refreshAllMetrics);

  return {
    data,
    refresh: refreshAllMetrics,
    loaded: Object.values(data).every(({ loaded }) => loaded),
    error: Object.values(data).find(({ error }) => !!error)?.error,
  };
};
