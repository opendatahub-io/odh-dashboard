import * as React from 'react';
import { PrometheusQueryResponse } from '~/types';
import { FetchStateObject } from '~/utilities/useFetch';
import { useMakeFetchObject } from '~/utilities/useMakeFetchObject';
import { DEFAULT_VALUE_FETCH_STATE } from '~/utilities/const';
import { WorkloadKind, WorkloadOwnerType } from '~/k8sTypes';
import { TopWorkloadUsageType, getWorkloadOwner } from '~/concepts/distributedWorkloads/utils';
import usePrometheusQuery from './usePrometheusQuery';

export type WorkloadMetricIndexedByOwner = Record<
  WorkloadOwnerType,
  { [ownerName: string]: number }
>;

export const EMPTY_WORKLOAD_METRIC_INDEXED_BY_OWNER: WorkloadMetricIndexedByOwner = {
  [WorkloadOwnerType.RayCluster]: {},
  [WorkloadOwnerType.Job]: {},
};

export type WorkloadMetricPromQueryResponse = PrometheusQueryResponse<{
  metric: { owner_kind: WorkloadOwnerType; owner_name: string };
}>;

export const indexWorkloadMetricByOwner = (
  promResponse: WorkloadMetricPromQueryResponse | null,
): WorkloadMetricIndexedByOwner => {
  if (!promResponse) {
    return EMPTY_WORKLOAD_METRIC_INDEXED_BY_OWNER;
  }
  return promResponse.data.result.reduce((acc, { metric, value }) => {
    const valueStr = value[1];
    if (valueStr && !Number.isNaN(Number(valueStr))) {
      return {
        ...acc,
        [metric.owner_kind]: { ...acc[metric.owner_kind], [metric.owner_name]: Number(valueStr) },
      };
    }
    return acc;
  }, EMPTY_WORKLOAD_METRIC_INDEXED_BY_OWNER);
};

const useWorkloadMetricIndexedByOwner = (
  query?: string,
  refreshRate = 0,
): FetchStateObject<WorkloadMetricIndexedByOwner> => {
  const promQueryFetchObj = useMakeFetchObject(
    usePrometheusQuery<WorkloadMetricPromQueryResponse>('/api/prometheus/query', query, {
      refreshRate,
    }),
  );
  return React.useMemo(
    () => ({
      ...promQueryFetchObj,
      data: indexWorkloadMetricByOwner(promQueryFetchObj.data),
      refresh: async () => indexWorkloadMetricByOwner((await promQueryFetchObj.refresh()) || null),
    }),
    [promQueryFetchObj],
  );
};

export type WorkloadCurrentUsage = {
  cpuCoresUsed: number | undefined;
  memoryBytesUsed: number | undefined;
};

export type WorkloadWithUsage = {
  workload: WorkloadKind;
  usage: number | undefined;
};
export type TopWorkloadsByUsage = Record<keyof WorkloadCurrentUsage, TopWorkloadUsageType>;

export const getTotalUsage = (workloadsWithUsage: WorkloadWithUsage[]): number =>
  workloadsWithUsage.reduce((prev, current) => prev + (current.usage || 0), 0);

export const getTopResourceConsumingWorkloads = (
  workloads: WorkloadKind[],
  getWorkloadCurrentUsage: (workload: WorkloadKind) => WorkloadCurrentUsage,
): TopWorkloadsByUsage => {
  const getTopWorkloadsFor = (usageType: keyof WorkloadCurrentUsage): TopWorkloadUsageType => {
    const workloadsSortedByUsage: WorkloadWithUsage[] = workloads
      .map((workload) => ({
        workload,
        usage: getWorkloadCurrentUsage(workload)[usageType],
      }))
      .filter(({ usage }) => usage !== undefined)
      .toSorted((a, b) => (b.usage || 0) - (a.usage || 0));

    const topWorkloads =
      workloadsSortedByUsage.length === 6
        ? workloadsSortedByUsage
        : workloadsSortedByUsage.slice(0, 5);
    return {
      totalUsage: getTotalUsage(workloadsSortedByUsage),
      topWorkloads,
      otherUsage:
        workloadsSortedByUsage.length < 7
          ? undefined
          : getTotalUsage(workloadsSortedByUsage.slice(5, workloadsSortedByUsage.length)),
    };
  };
  return {
    cpuCoresUsed: getTopWorkloadsFor('cpuCoresUsed'),
    memoryBytesUsed: getTopWorkloadsFor('memoryBytesUsed'),
  };
};

export type DWProjectCurrentMetricsValues = {
  cpuCoresUsedByWorkloadOwner: WorkloadMetricIndexedByOwner;
  memoryBytesUsedByWorkloadOwner: WorkloadMetricIndexedByOwner;
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
    cpuCoresUsedByWorkloadOwner: DEFAULT_VALUE_FETCH_STATE,
    memoryBytesUsedByWorkloadOwner: DEFAULT_VALUE_FETCH_STATE,
  },
  getWorkloadCurrentUsage: () => ({ cpuCoresUsed: undefined, memoryBytesUsed: undefined }),
  topWorkloadsByUsage: {
    cpuCoresUsed: { totalUsage: 0, topWorkloads: [], otherUsage: undefined },
    memoryBytesUsed: { totalUsage: 0, topWorkloads: [], otherUsage: undefined },
  },
  refresh: () => Promise.resolve(undefined),
};

const getDWProjectCurrentMetricsQueries = (
  namespace: string,
): Record<DWProjectCurrentMetricType, string> => ({
  cpuCoresUsedByWorkloadOwner: `namespace=${namespace}&query=sum by(owner_name, owner_kind)  (kube_pod_owner{owner_kind=~"RayCluster|Job", namespace="${namespace}"} * on (namespace, pod) group_right(owner_name, owner_kind) node_namespace_pod_container:container_cpu_usage_seconds_total:sum_irate)`,
  memoryBytesUsedByWorkloadOwner: `namespace=${namespace}&query=sum by(owner_name, owner_kind) (kube_pod_owner{owner_kind=~"RayCluster|Job", namespace="${namespace}"} * on (namespace, pod) group_right(owner_name, owner_kind) node_namespace_pod_container:container_memory_working_set_bytes)`,
});

export const useDWProjectCurrentMetrics = (
  workloads: WorkloadKind[],
  namespace: string,
  refreshRate = 0,
): DWProjectCurrentMetrics => {
  const queries = getDWProjectCurrentMetricsQueries(namespace);
  const data: DWProjectCurrentMetrics['data'] = {
    cpuCoresUsedByWorkloadOwner: useWorkloadMetricIndexedByOwner(
      queries.cpuCoresUsedByWorkloadOwner,
      refreshRate,
    ),
    memoryBytesUsedByWorkloadOwner: useWorkloadMetricIndexedByOwner(
      queries.memoryBytesUsedByWorkloadOwner,
      refreshRate,
    ),
  };
  const cpuCoresUsedByWorkloadOwnerRefresh = data.cpuCoresUsedByWorkloadOwner.refresh;
  const memoryBytesUsedByWorkloadOwnerRefresh = data.memoryBytesUsedByWorkloadOwner.refresh;
  const getWorkloadCurrentUsage = React.useCallback(
    (workload: WorkloadKind) => {
      const owner = getWorkloadOwner(workload);
      return {
        cpuCoresUsed: owner
          ? data.cpuCoresUsedByWorkloadOwner.data?.[owner.kind][owner.name]
          : undefined,
        memoryBytesUsed: owner
          ? data.memoryBytesUsedByWorkloadOwner.data?.[owner.kind][owner.name]
          : undefined,
      };
    },
    [data.cpuCoresUsedByWorkloadOwner, data.memoryBytesUsedByWorkloadOwner],
  );
  const topWorkloadsByUsage: TopWorkloadsByUsage = React.useMemo(
    () => getTopResourceConsumingWorkloads(workloads, getWorkloadCurrentUsage),
    [workloads, getWorkloadCurrentUsage],
  );
  return {
    data,
    refresh: React.useCallback(
      async () => ({
        cpuCoresUsedByWorkloadOwner: {
          data: await cpuCoresUsedByWorkloadOwnerRefresh(),
          loaded: true,
          refresh: cpuCoresUsedByWorkloadOwnerRefresh,
        },
        memoryBytesUsedByWorkloadOwner: {
          data: await memoryBytesUsedByWorkloadOwnerRefresh(),
          loaded: true,
          refresh: memoryBytesUsedByWorkloadOwnerRefresh,
        },
      }),
      [cpuCoresUsedByWorkloadOwnerRefresh, memoryBytesUsedByWorkloadOwnerRefresh],
    ),
    loaded: Object.values(data).every(({ loaded }) => loaded),
    error: Object.values(data).find(({ error }) => !!error)?.error,
    getWorkloadCurrentUsage,
    topWorkloadsByUsage,
  };
};
