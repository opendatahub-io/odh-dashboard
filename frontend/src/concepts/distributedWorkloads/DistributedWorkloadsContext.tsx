import * as React from 'react';
import { Bullseye, Alert } from '@patternfly/react-core';
import { ClusterQueueKind, WorkloadKind } from '~/k8sTypes';
import { FetchStateObject } from '~/types';
import {
  DEFAULT_LIST_FETCH_STATE,
  DEFAULT_VALUE_FETCH_STATE,
  POLL_INTERVAL,
} from '~/utilities/const';
import { SupportedArea, conditionalArea } from '~/concepts/areas';
import { useMakeFetchObject } from '~/utilities/useMakeFetchObject';
import {
  DWProjectMetrics,
  DWWorkloadCurrentMetrics,
  DWWorkloadTrendMetrics,
  useDWProjectMetrics,
  useDWWorkloadCurrentMetrics,
  useDWWorkloadTrendMetrics,
} from '~/api';
// TODO mturley these imports from ~/pages/modelServing/* should be moved somewhere page-agnostic
import { TimeframeTitle } from '~/pages/modelServing/screens/types';
import useClusterQueues from './useClusterQueues';
import useWorkloads from './useWorkloads';

type DistributedWorkloadsContextType = {
  clusterQueues: FetchStateObject<ClusterQueueKind[]>;
  workloads: FetchStateObject<WorkloadKind[]>;
  projectMetrics: DWProjectMetrics;
  workloadCurrentMetrics: DWWorkloadCurrentMetrics;
  workloadTrendMetrics: DWWorkloadTrendMetrics;
  refreshAllData: () => void;
  refreshRate: number;
  setRefreshRate: (interval: number) => void;
  lastUpdateTime: number;
  setLastUpdateTime: (time: number) => void;
  namespace?: string;
};

type DistributedWorkloadsContextProviderProps = {
  children: React.ReactNode;
  namespace?: string;
};

export const DistributedWorkloadsContext = React.createContext<DistributedWorkloadsContextType>({
  clusterQueues: DEFAULT_LIST_FETCH_STATE,
  workloads: DEFAULT_LIST_FETCH_STATE,
  projectMetrics: {
    ...DEFAULT_VALUE_FETCH_STATE,
    data: {
      cpuRequested: DEFAULT_VALUE_FETCH_STATE,
      cpuUtilized: DEFAULT_VALUE_FETCH_STATE,
    },
  },
  workloadCurrentMetrics: {
    ...DEFAULT_VALUE_FETCH_STATE,
    data: {
      numJobsActive: DEFAULT_VALUE_FETCH_STATE,
      numJobsFailed: DEFAULT_VALUE_FETCH_STATE,
      numJobsSucceeded: DEFAULT_VALUE_FETCH_STATE,
      numJobsInadmissible: DEFAULT_VALUE_FETCH_STATE,
      numJobsPending: DEFAULT_VALUE_FETCH_STATE,
    },
  },
  workloadTrendMetrics: {
    ...DEFAULT_VALUE_FETCH_STATE,
    data: {
      jobsActiveTrend: DEFAULT_LIST_FETCH_STATE,
      jobsInadmissibleTrend: DEFAULT_LIST_FETCH_STATE,
      jobsPendingTrend: DEFAULT_LIST_FETCH_STATE,
    },
  },
  refreshAllData: () => undefined,
  refreshRate: POLL_INTERVAL,
  setRefreshRate: () => undefined,
  lastUpdateTime: 0,
  setLastUpdateTime: () => undefined,
});

export const DistributedWorkloadsContextProvider =
  conditionalArea<DistributedWorkloadsContextProviderProps>(
    SupportedArea.DISTRIBUTED_WORKLOADS,
    true,
  )(({ children, namespace }) => {
    const [refreshRate, setRefreshRate] = React.useState(POLL_INTERVAL);
    const [lastUpdateTime, setLastUpdateTime] = React.useState<number>(Date.now());

    // TODO mturley implement lazy loading, let the context consumers tell us what data they need and make the other ones throw a NotReadyError

    const clusterQueues = useMakeFetchObject<ClusterQueueKind[]>(useClusterQueues(refreshRate));
    const workloads = useMakeFetchObject<WorkloadKind[]>(useWorkloads(namespace, refreshRate));
    const projectMetrics = useDWProjectMetrics(namespace, refreshRate);
    const workloadCurrentMetrics = useDWWorkloadCurrentMetrics(namespace, refreshRate);

    // TODO mturley this timeframe param is a placeholder, wire it up to real timeframe selector state
    const workloadTrendMetrics = useDWWorkloadTrendMetrics(
      TimeframeTitle.ONE_DAY,
      lastUpdateTime,
      setLastUpdateTime,
      namespace,
      refreshRate,
    );

    const clusterQueuesRefresh = clusterQueues.refresh;
    const workloadsRefresh = workloads.refresh;
    const projectMetricsRefresh = projectMetrics.refresh;
    const workloadCurrentMetricsRefresh = workloadCurrentMetrics.refresh;
    const workloadTrendMetricsRefresh = workloadTrendMetrics.refresh;
    const refreshAllData = React.useCallback(() => {
      clusterQueuesRefresh();
      workloadsRefresh();
      projectMetricsRefresh();
      workloadCurrentMetricsRefresh();
      workloadTrendMetricsRefresh();
    }, [
      clusterQueuesRefresh,
      workloadsRefresh,
      projectMetricsRefresh,
      workloadCurrentMetricsRefresh,
      workloadTrendMetricsRefresh,
    ]);

    const fetchError = [clusterQueues, workloads, projectMetrics, workloadCurrentMetrics].find(
      ({ error }) => !!error,
    )?.error;

    if (fetchError) {
      return (
        <Bullseye>
          <Alert title="Workload metrics load error" variant="danger" isInline>
            {fetchError.message}
          </Alert>
        </Bullseye>
      );
    }

    return (
      <DistributedWorkloadsContext.Provider
        value={{
          clusterQueues,
          workloads,
          projectMetrics,
          workloadCurrentMetrics,
          workloadTrendMetrics,
          refreshAllData,
          refreshRate,
          setRefreshRate,
          lastUpdateTime,
          setLastUpdateTime,
          namespace,
        }}
      >
        {children}
      </DistributedWorkloadsContext.Provider>
    );
  });
