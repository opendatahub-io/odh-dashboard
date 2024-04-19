import * as React from 'react';
import { Bullseye, Alert, Spinner } from '@patternfly/react-core';
import { ClusterQueueKind, LocalQueueKind, WorkloadKind } from '~/k8sTypes';
import { FetchStateObject } from '~/types';
import { DEFAULT_LIST_FETCH_STATE, DEFAULT_VALUE_FETCH_STATE } from '~/utilities/const';
import { SupportedArea, conditionalArea } from '~/concepts/areas';
import useSyncPreferredProject from '~/concepts/projects/useSyncPreferredProject';
import { ProjectsContext, byName } from '~/concepts/projects/ProjectsContext';
import { getProjectDisplayName } from '~/concepts/projects/utils';
import { useMakeFetchObject } from '~/utilities/useMakeFetchObject';
import {
  DEFAULT_DW_PROJECT_CURRENT_METRICS,
  DWProjectCurrentMetrics,
  useDWProjectCurrentMetrics,
} from '~/api';
import { RefreshIntervalValue } from '~/concepts/metrics/const';
import { MetricsCommonContext } from '~/concepts/metrics/MetricsCommonContext';
import useClusterQueues from './useClusterQueues';
import useLocalQueues from './useLocalQueues';
import useWorkloads from './useWorkloads';

type DistributedWorkloadsContextType = {
  clusterQueue: FetchStateObject<ClusterQueueKind | undefined>;
  localQueues: FetchStateObject<LocalQueueKind[]>;
  workloads: FetchStateObject<WorkloadKind[]>;
  projectCurrentMetrics: DWProjectCurrentMetrics;
  refreshAllData: () => void;
  namespace: string;
  projectDisplayName: string;
};

type DistributedWorkloadsContextProviderProps = {
  children: React.ReactNode;
  namespace: string;
};

export const DistributedWorkloadsContext = React.createContext<DistributedWorkloadsContextType>({
  clusterQueue: DEFAULT_VALUE_FETCH_STATE,
  localQueues: DEFAULT_LIST_FETCH_STATE,
  workloads: DEFAULT_LIST_FETCH_STATE,
  projectCurrentMetrics: DEFAULT_DW_PROJECT_CURRENT_METRICS,
  refreshAllData: () => undefined,
  namespace: '',
  projectDisplayName: '',
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
    // We only support one ClusterQueue, but if the user has created multiple we use the first one with resourceGroups
    const clusterQueue: FetchStateObject<ClusterQueueKind | undefined> = {
      ...clusterQueues,
      data: clusterQueues.data.find((cq) => cq.spec.resourceGroups?.length),
    };

    const localQueues = useMakeFetchObject<LocalQueueKind[]>(
      useLocalQueues(namespace, refreshRate),
    );

    const workloads = useMakeFetchObject<WorkloadKind[]>(useWorkloads(namespace, refreshRate));

    const projectCurrentMetrics = useDWProjectCurrentMetrics(
      workloads.data,
      namespace,
      refreshRate,
    );

    const clusterQueuesRefresh = clusterQueues.refresh;
    const localQueuesRefresh = localQueues.refresh;
    const workloadsRefresh = workloads.refresh;
    const projectCurrentMetricsRefresh = projectCurrentMetrics.refresh;

    const refreshAllData = React.useCallback(() => {
      clusterQueuesRefresh();
      localQueuesRefresh();
      workloadsRefresh();
      projectCurrentMetricsRefresh();
    }, [clusterQueuesRefresh, localQueuesRefresh, workloadsRefresh, projectCurrentMetricsRefresh]);

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

    if (!project) {
      return (
        <Bullseye>
          <Spinner />
        </Bullseye>
      );
    }

    return (
      <DistributedWorkloadsContext.Provider
        value={{
          clusterQueue,
          localQueues,
          workloads,
          projectCurrentMetrics,
          refreshAllData,
          namespace,
          projectDisplayName: getProjectDisplayName(project),
        }}
      >
        {children}
      </DistributedWorkloadsContext.Provider>
    );
  });
