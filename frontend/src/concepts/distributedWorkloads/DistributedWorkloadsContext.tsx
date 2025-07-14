import * as React from 'react';
import { Bullseye, Alert, Spinner } from '@patternfly/react-core';
import { ClusterQueueKind, LocalQueueKind, WorkloadKind } from '#~/k8sTypes';
import { FetchStateObject } from '#~/utilities/useFetch';
import { DEFAULT_LIST_FETCH_STATE } from '#~/utilities/const';
import { SupportedArea, conditionalArea } from '#~/concepts/areas';
import useSyncPreferredProject from '#~/concepts/projects/useSyncPreferredProject';
import { ProjectsContext, byName } from '#~/concepts/projects/ProjectsContext';
import { useMakeFetchObject } from '#~/utilities/useMakeFetchObject';
import {
  DEFAULT_DW_PROJECT_CURRENT_METRICS,
  DWProjectCurrentMetrics,
  useDWProjectCurrentMetrics,
} from '#~/api';
import { RefreshIntervalValue } from '#~/concepts/metrics/const';
import { MetricsCommonContext } from '#~/concepts/metrics/MetricsCommonContext';
import { getDisplayNameFromK8sResource } from '#~/concepts/k8s/utils';
import useClusterQueues from './useClusterQueues';
import useLocalQueues from './useLocalQueues';
import useWorkloads from './useWorkloads';

type DistributedWorkloadsContextType = {
  clusterQueues: FetchStateObject<ClusterQueueKind[]>;
  localQueues: FetchStateObject<LocalQueueKind[]>;
  workloads: FetchStateObject<WorkloadKind[]>;
  projectCurrentMetrics: DWProjectCurrentMetrics;
  refreshAllData: () => void;
  namespace: string;
  projectDisplayName: string;
  cqExists: boolean;
};

type DistributedWorkloadsContextProviderProps = {
  children: React.ReactNode;
  namespace: string;
};

export const DistributedWorkloadsContext = React.createContext<DistributedWorkloadsContextType>({
  clusterQueues: DEFAULT_LIST_FETCH_STATE,
  localQueues: DEFAULT_LIST_FETCH_STATE,
  workloads: DEFAULT_LIST_FETCH_STATE,
  projectCurrentMetrics: DEFAULT_DW_PROJECT_CURRENT_METRICS,
  refreshAllData: () => undefined,
  namespace: '',
  projectDisplayName: '',
  cqExists: false,
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

    const localQueues = useMakeFetchObject<LocalQueueKind[]>(
      useLocalQueues(namespace, refreshRate),
    );

    const allClusterQueues = useMakeFetchObject<ClusterQueueKind[]>(useClusterQueues(refreshRate));

    const validCQExists = allClusterQueues.data.some((cq) => cq.spec.resourceGroups?.length);

    const clusterQueues = {
      ...allClusterQueues,
      data: allClusterQueues.data.filter(
        (cq) =>
          localQueues.data.some((lq) => lq.spec.clusterQueue === cq.metadata?.name) &&
          cq.spec.resourceGroups?.length,
      ),
    };

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
          <Alert title="Distributed workloads load error" variant="danger" isInline>
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
          clusterQueues,
          localQueues,
          workloads,
          projectCurrentMetrics,
          refreshAllData,
          namespace,
          projectDisplayName: getDisplayNameFromK8sResource(project),
          cqExists: validCQExists,
        }}
      >
        {children}
      </DistributedWorkloadsContext.Provider>
    );
  });
