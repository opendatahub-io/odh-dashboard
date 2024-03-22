import * as React from 'react';
import { FetchStateObject, PrometheusQueryResponse } from '~/types';
import { useMakeFetchObject } from '~/utilities/useMakeFetchObject';
import { DEFAULT_VALUE_FETCH_STATE } from '~/utilities/const';
import { WorkloadKind } from '~/k8sTypes';
import { getWorkloadOwnerJobName } from '~/concepts/distributedWorkloads/utils';
import usePrometheusQuery from './usePrometheusQuery';

export type WorkloadMetricPromQueryResponse = PrometheusQueryResponse<{
  metric: { workload: string; workload_type: string };
}>;

export const indexNumericValuesByJobName = (
  promResponse: WorkloadMetricPromQueryResponse | null,
): Record<string, number> => {
  if (!promResponse) {
    return {};
  }
  const valuesByJobName: Record<string, number> = {};
  promResponse.data.result.forEach(({ metric, value }) => {
    const valueStr = value[1]; // value[0] is a timestamp, value[1] is the actual measured value
    if (valueStr && !Number.isNaN(Number(valueStr))) {
      valuesByJobName[metric.workload] = Number(valueStr);
    }
  });
  return valuesByJobName;
};

const useWorkloadMetricIndexedByJobName = (
  query?: string,
  refreshRate = 0,
): FetchStateObject<Record<string, number>> => {
  const promQueryFetchObj = useMakeFetchObject(
    usePrometheusQuery<WorkloadMetricPromQueryResponse>('/api/prometheus/query', query, {
      refreshRate,
    }),
  );
  return React.useMemo(
    () => ({
      ...promQueryFetchObj,
      data: indexNumericValuesByJobName(promQueryFetchObj.data),
    }),
    [promQueryFetchObj],
  );
};

export type WorkloadCurrentUsage = {
  cpuCoresUsed: number | undefined;
  memoryBytesUsed: number | undefined;
};

export type WorkloadWithUsage = {
  workload: WorkloadKind | 'other';
  usage: number | undefined;
};
export type TopWorkloadsByUsage = Record<
  keyof WorkloadCurrentUsage,
  { totalUsage: number; topWorkloads: WorkloadWithUsage[] }
>;

export const getTotalUsage = (workloadsWithUsage: WorkloadWithUsage[]): number =>
  workloadsWithUsage.reduce((prev, current) => prev + (current.usage || 0), 0);

export const getTopResourceConsumingWorkloads = (
  workloads: WorkloadKind[],
  getWorkloadCurrentUsage: (workload: WorkloadKind) => WorkloadCurrentUsage,
): TopWorkloadsByUsage => {
  const getTopWorkloadsFor = (
    usageType: keyof WorkloadCurrentUsage,
  ): { totalUsage: number; topWorkloads: WorkloadWithUsage[] } => {
    const workloadsSortedByUsage: WorkloadWithUsage[] = workloads
      .map((workload) => ({
        workload,
        usage: getWorkloadCurrentUsage(workload)[usageType],
      }))
      .filter(({ usage }) => usage !== undefined)
      .sort((a, b) => (b.usage || 0) - (a.usage || 0));
    const top5Workloads = workloadsSortedByUsage.slice(0, 5);
    const restOfWorkloads = workloadsSortedByUsage.slice(5, workloadsSortedByUsage.length);
    return {
      totalUsage: getTotalUsage(workloadsSortedByUsage),
      topWorkloads: [
        ...top5Workloads,
        ...(restOfWorkloads.length === 1
          ? restOfWorkloads
          : restOfWorkloads.length > 1
          ? [
              {
                workload: 'other',
                usage: getTotalUsage(restOfWorkloads),
              } satisfies WorkloadWithUsage,
            ]
          : []),
      ],
    };
  };
  return {
    cpuCoresUsed: getTopWorkloadsFor('cpuCoresUsed'),
    memoryBytesUsed: getTopWorkloadsFor('memoryBytesUsed'),
  };
};

export type DWProjectCurrentMetricsValues = {
  cpuCoresUsedByJobName: Record<string, number>;
  memoryBytesUsedByJobName: Record<string, number>;
};
export type DWProjectCurrentMetricType = keyof DWProjectCurrentMetricsValues;
export type DWProjectCurrentMetrics = FetchStateObject<{
  [key in DWProjectCurrentMetricType]: FetchStateObject<
    DWProjectCurrentMetricsValues[key] | undefined
  >;
}> & {
  getWorkloadCurrentUsage: (workload: WorkloadKind) => WorkloadCurrentUsage;
  topWorkloadsByUsage: TopWorkloadsByUsage;
};

export const DEFAULT_DW_PROJECT_CURRENT_METRICS: DWProjectCurrentMetrics = {
  ...DEFAULT_VALUE_FETCH_STATE,
  data: {
    cpuCoresUsedByJobName: DEFAULT_VALUE_FETCH_STATE,
    memoryBytesUsedByJobName: DEFAULT_VALUE_FETCH_STATE,
  },
  getWorkloadCurrentUsage: () => ({ cpuCoresUsed: undefined, memoryBytesUsed: undefined }),
  topWorkloadsByUsage: {
    cpuCoresUsed: { totalUsage: 0, topWorkloads: [] },
    memoryBytesUsed: { totalUsage: 0, topWorkloads: [] },
  },
};

const getDWProjectCurrentMetricsQueries = (
  namespace: string,
): Record<DWProjectCurrentMetricType, string> => ({
  cpuCoresUsedByJobName: `namespace=${namespace}&query=sum(node_namespace_pod_container:container_cpu_usage_seconds_total:sum_irate{cluster="", namespace="${namespace}"} * on(namespace,pod) group_left(workload, workload_type) namespace_workload_pod:kube_pod_owner:relabel{cluster="", namespace="${namespace}", workload_type="job"}) by (workload, workload_type)`,
  memoryBytesUsedByJobName: `namespace=${namespace}&query=sum(container_memory_working_set_bytes{job="kubelet", metrics_path="/metrics/cadvisor", cluster="", namespace="${namespace}", container!="", image!=""} * on(namespace,pod) group_left(workload, workload_type) namespace_workload_pod:kube_pod_owner:relabel{cluster="", namespace="${namespace}", workload_type="job"}) by (workload, workload_type)`,
});

export const useDWProjectCurrentMetrics = (
  workloads: WorkloadKind[],
  namespace?: string,
  refreshRate = 0,
): DWProjectCurrentMetrics => {
  const queries = namespace ? getDWProjectCurrentMetricsQueries(namespace) : undefined;
  const data: DWProjectCurrentMetrics['data'] = {
    cpuCoresUsedByJobName: useWorkloadMetricIndexedByJobName(
      queries?.cpuCoresUsedByJobName,
      refreshRate,
    ),
    memoryBytesUsedByJobName: useWorkloadMetricIndexedByJobName(
      queries?.memoryBytesUsedByJobName,
      refreshRate,
    ),
  };
  const cpuCoresUsedByJobNameRefresh = data.cpuCoresUsedByJobName.refresh;
  const memoryBytesUsedByJobNameRefresh = data.memoryBytesUsedByJobName.refresh;
  const getWorkloadCurrentUsage = React.useCallback(
    (workload: WorkloadKind) => {
      const jobName = getWorkloadOwnerJobName(workload);
      return {
        cpuCoresUsed: jobName ? data.cpuCoresUsedByJobName.data?.[jobName] : undefined,
        memoryBytesUsed: jobName ? data.memoryBytesUsedByJobName.data?.[jobName] : undefined,
      };
    },
    [data.cpuCoresUsedByJobName, data.memoryBytesUsedByJobName],
  );
  const topWorkloadsByUsage: TopWorkloadsByUsage = React.useMemo(
    () => getTopResourceConsumingWorkloads(workloads, getWorkloadCurrentUsage),
    [workloads, getWorkloadCurrentUsage],
  );
  return {
    data,
    refresh: React.useCallback(() => {
      cpuCoresUsedByJobNameRefresh();
      memoryBytesUsedByJobNameRefresh();
    }, [cpuCoresUsedByJobNameRefresh, memoryBytesUsedByJobNameRefresh]),
    loaded: Object.values(data).every(({ loaded }) => loaded),
    error: Object.values(data).find(({ error }) => !!error)?.error,
    getWorkloadCurrentUsage,
    topWorkloadsByUsage,
  };
};
