import * as React from 'react';
import type { ProjectKind } from '@odh-dashboard/k8s-core';
import useFetch, { type FetchStateObject } from '@odh-dashboard/ui-core/hooks/useFetch';
import { INFRASTRUCTURE_WORKLOADS_REFRESH_INTERVAL } from '../const';
import {
  enrichInfrastructureWorkloads,
  listInfrastructureWorkloadsBase,
  type InfrastructureWorkloadsBaseResult,
} from '../utils/infrastructureWorkloads';
import { isKueueManagedDataScienceProject } from '../utils/kueueProjects';
import type { InfrastructureWorkloadsResult } from '../types/infrastructureWorkloads';

const emptyResult: InfrastructureWorkloadsResult = {
  workloads: [],
  kueueEnabled: false,
  failedSources: [],
};

const emptyBaseResult: InfrastructureWorkloadsBaseResult = {
  ...emptyResult,
  resources: [],
};

type UseInfrastructureWorkloadsResult = InfrastructureWorkloadsResult & {
  loaded: boolean;
  hardwareProfilesLoading: boolean;
  error?: Error;
  refresh: FetchStateObject<InfrastructureWorkloadsBaseResult>['refresh'];
};

const useInfrastructureWorkloads = (
  namespace: string | undefined,
  project: ProjectKind | null,
): UseInfrastructureWorkloadsResult => {
  const projectName = project?.metadata.name;
  const kueueEnabled = project ? isKueueManagedDataScienceProject(project) : false;
  const { data, loaded, error, refresh } = useFetch<InfrastructureWorkloadsBaseResult>(
    React.useCallback(
      () =>
        namespace
          ? listInfrastructureWorkloadsBase(namespace, projectName, kueueEnabled)
          : Promise.resolve(emptyBaseResult),
      [namespace, projectName, kueueEnabled],
    ),
    emptyBaseResult,
    { refreshRate: INFRASTRUCTURE_WORKLOADS_REFRESH_INTERVAL, initialPromisePurity: true },
  );

  const [workloads, setWorkloads] = React.useState(data.workloads);
  const [hardwareProfilesLoading, setHardwareProfilesLoading] = React.useState(false);
  const enrichmentGeneration = React.useRef(0);

  React.useEffect(() => {
    const generation = ++enrichmentGeneration.current;
    setWorkloads(data.workloads);

    if (data.resources.length === 0) {
      setHardwareProfilesLoading(false);
      return;
    }

    setHardwareProfilesLoading(true);
    void enrichInfrastructureWorkloads(data)
      .then((enriched) => {
        if (generation === enrichmentGeneration.current) {
          setWorkloads(enriched.workloads);
        }
      })
      .finally(() => {
        if (generation === enrichmentGeneration.current) {
          setHardwareProfilesLoading(false);
        }
      });
  }, [data]);

  return {
    workloads,
    kueueEnabled: data.kueueEnabled,
    failedSources: data.failedSources,
    loaded: namespace ? loaded : true,
    hardwareProfilesLoading,
    error,
    refresh,
  };
};

export default useInfrastructureWorkloads;
