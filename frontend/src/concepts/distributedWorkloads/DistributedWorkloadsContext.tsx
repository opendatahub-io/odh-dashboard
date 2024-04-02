import * as React from 'react';
import { Bullseye, Alert } from '@patternfly/react-core';
import { ClusterQueueKind, WorkloadKind } from '~/k8sTypes';
import { FetchStateObject } from '~/types';
import { DEFAULT_LIST_FETCH_STATE, DEFAULT_VALUE_FETCH_STATE } from '~/utilities/const';
import { SupportedArea, conditionalArea } from '~/concepts/areas';
import useSyncPreferredProject from '~/concepts/projects/useSyncPreferredProject';
import { ProjectsContext, byName } from '~/concepts/projects/ProjectsContext';
import { useMakeFetchObject } from '~/utilities/useMakeFetchObject';
import { DWProjectCurrentMetrics, useDWProjectCurrentMetrics } from '~/api';
import { RefreshIntervalValue } from '~/concepts/metrics/const';
import { MetricsCommonContext } from '~/concepts/metrics/MetricsCommonContext';
import useClusterQueues from './useClusterQueues';
import useWorkloads from './useWorkloads';

type DistributedWorkloadsContextType = {
  clusterQueues: FetchStateObject<ClusterQueueKind[]>;
  workloads: FetchStateObject<WorkloadKind[]>;
  projectCurrentMetrics: DWProjectCurrentMetrics;
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
  projectCurrentMetrics: {
    ...DEFAULT_VALUE_FETCH_STATE,
    data: {
      cpuCoresUsedByJobName: DEFAULT_VALUE_FETCH_STATE,
      memoryBytesUsedByJobName: DEFAULT_VALUE_FETCH_STATE,
    },
    getWorkloadCurrentUsage: () => ({ cpuCoresUsed: undefined, memoryBytesUsed: undefined }),
    topResourceConsumingWorkloads: {
      cpuCoresUsed: { totalUsage: 0, topWorkloads: [] },
      memoryBytesUsed: { totalUsage: 0, topWorkloads: [] },
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

    const { currentRefreshInterval } = React.useContext(MetricsCommonContext);

    const refreshRate = RefreshIntervalValue[currentRefreshInterval];

    // TODO mturley implement lazy loading, let the context consumers tell us what data they need and make the other ones throw a NotReadyError

    const clusterQueues = useMakeFetchObject<ClusterQueueKind[]>(useClusterQueues(refreshRate));
    const workloads = useMakeFetchObject<WorkloadKind[]>(useWorkloads(namespace, refreshRate));
    const projectCurrentMetrics = useDWProjectCurrentMetrics(
      workloads.data,
      namespace,
      refreshRate,
    );

    const clusterQueuesRefresh = clusterQueues.refresh;
    const workloadsRefresh = workloads.refresh;
    const projectCurrentMetricsRefresh = projectCurrentMetrics.refresh;

    const refreshAllData = React.useCallback(() => {
      clusterQueuesRefresh();
      workloadsRefresh();
      projectCurrentMetricsRefresh();
    }, [clusterQueuesRefresh, workloadsRefresh, projectCurrentMetricsRefresh]);

    const fetchError = [clusterQueues, workloads, projectCurrentMetrics].find(
      ({ error }) => !!error,
    )?.error;

    if (fetchError) {
      return (
        <Bullseye>
          <Alert title="Distributed workload metrics load error" variant="danger" isInline>
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
          projectCurrentMetrics,
          refreshAllData,
          namespace,
        }}
      >
        {children}
      </DistributedWorkloadsContext.Provider>
    );
  });
