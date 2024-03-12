import * as React from 'react';
import { Bullseye, Alert } from '@patternfly/react-core';
import { ClusterQueueKind, WorkloadKind } from '~/k8sTypes';
import { FetchStateObject } from '~/types';
import { DEFAULT_LIST_FETCH_STATE, DEFAULT_VALUE_FETCH_STATE } from '~/utilities/const';
import { SupportedArea, conditionalArea } from '~/concepts/areas';
import useSyncPreferredProject from '~/concepts/projects/useSyncPreferredProject';
import { ProjectsContext, byName } from '~/concepts/projects/ProjectsContext';
import { useMakeFetchObject } from '~/utilities/useMakeFetchObject';
import {
  DWProjectMetrics,
  DWWorkloadCurrentMetrics,
  DWWorkloadTrendMetrics,
  useDWProjectMetrics,
  useDWWorkloadCurrentMetrics,
  useDWWorkloadTrendMetrics,
} from '~/api';
import { RefreshIntervalValue } from '~/concepts/metrics/const';
import { MetricsCommonContext } from '~/concepts/metrics/MetricsCommonContext';
import useClusterQueues from './useClusterQueues';
import useWorkloads from './useWorkloads';

type DistributedWorkloadsContextType = {
  clusterQueues: FetchStateObject<ClusterQueueKind[]>;
  workloads: FetchStateObject<WorkloadKind[]>;
  projectMetrics: DWProjectMetrics;
  workloadCurrentMetrics: DWWorkloadCurrentMetrics;
  workloadTrendMetrics: DWWorkloadTrendMetrics;
  refreshAllData: () => void;
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
});

export const DistributedWorkloadsContextProvider =
  conditionalArea<DistributedWorkloadsContextProviderProps>(
    SupportedArea.DISTRIBUTED_WORKLOADS,
    true,
  )(({ children, namespace }) => {
    const { projects } = React.useContext(ProjectsContext);
    const project = projects.find(byName(namespace)) ?? null;
    useSyncPreferredProject(project);

    const { currentTimeframe, currentRefreshInterval, lastUpdateTime, setLastUpdateTime } =
      React.useContext(MetricsCommonContext);

    const refreshRate = RefreshIntervalValue[currentRefreshInterval];

    // TODO mturley implement lazy loading, let the context consumers tell us what data they need and make the other ones throw a NotReadyError

    const clusterQueues = useMakeFetchObject<ClusterQueueKind[]>(useClusterQueues(refreshRate));
    const workloads = useMakeFetchObject<WorkloadKind[]>(useWorkloads(namespace, refreshRate));
    const projectMetrics = useDWProjectMetrics(namespace, refreshRate);
    const workloadCurrentMetrics = useDWWorkloadCurrentMetrics(namespace, refreshRate);

    const workloadTrendMetrics = useDWWorkloadTrendMetrics(
      currentTimeframe,
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
          namespace,
        }}
      >
        {children}
      </DistributedWorkloadsContext.Provider>
    );
  });
