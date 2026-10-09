import * as React from 'react';
import type { ProjectKind } from '@odh-dashboard/k8s-core';
import useFetch, { type FetchStateObject } from '@odh-dashboard/ui-core/hooks/useFetch';
import { INFRASTRUCTURE_WORKLOADS_REFRESH_INTERVAL } from '../const';
import { listInfrastructureWorkloads } from '../utils/infrastructureWorkloads';
import { isKueueManagedDataScienceProject } from '../utils/kueueProjects';
import type { InfrastructureWorkloadsResult } from '../types/infrastructureWorkloads';

const emptyResult: InfrastructureWorkloadsResult = {
  workloads: [],
  kueueEnabled: false,
  failedSources: [],
};

type UseInfrastructureWorkloadsResult = InfrastructureWorkloadsResult & {
  loaded: boolean;
  error?: Error;
  refresh: FetchStateObject<InfrastructureWorkloadsResult>['refresh'];
};

const useInfrastructureWorkloads = (
  namespace: string | undefined,
  project: ProjectKind | null,
): UseInfrastructureWorkloadsResult => {
  const projectName = project?.metadata.name;
  const kueueEnabled = project ? isKueueManagedDataScienceProject(project) : false;
  const { data, loaded, error, refresh } = useFetch(
    React.useCallback(
      () =>
        namespace
          ? listInfrastructureWorkloads(namespace, projectName, kueueEnabled)
          : Promise.resolve(emptyResult),
      [namespace, projectName, kueueEnabled],
    ),
    emptyResult,
    { refreshRate: INFRASTRUCTURE_WORKLOADS_REFRESH_INTERVAL, initialPromisePurity: true },
  );

  return { ...data, loaded: namespace ? loaded : true, error, refresh };
};

export default useInfrastructureWorkloads;
