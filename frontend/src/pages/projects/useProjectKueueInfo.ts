import * as React from 'react';
import { LocalQueueKind, ProjectKind } from '#~/k8sTypes';
import { FetchStateObject } from '#~/utilities/useFetch';
import { useKueueConfiguration } from '#~/concepts/hardwareProfiles/kueueUtils';
import useLocalQueues from '#~/concepts/distributedWorkloads/useLocalQueues';

export type ProjectKueueInfo = {
  kueueConfig: ReturnType<typeof useKueueConfiguration>;
  localQueues: FetchStateObject<LocalQueueKind[]>;
};

const useProjectKueueInfo = (
  project: ProjectKind | null,
  namespace: string | undefined,
): ProjectKueueInfo => {
  const kueueConfig = useKueueConfiguration(project ?? undefined);

  const shouldFetchLocalQueues =
    kueueConfig.isKueueFeatureEnabled && kueueConfig.isProjectKueueEnabled;
  const [localQueuesData, localQueuesLoaded, localQueuesError, localQueuesRefresh] = useLocalQueues(
    shouldFetchLocalQueues ? namespace : undefined,
  );

  const localQueues: FetchStateObject<LocalQueueKind[]> = React.useMemo(
    () => ({
      data: localQueuesData,
      loaded: localQueuesLoaded,
      error: localQueuesError,
      refresh: localQueuesRefresh,
    }),
    [localQueuesData, localQueuesLoaded, localQueuesError, localQueuesRefresh],
  );

  return React.useMemo(() => ({ kueueConfig, localQueues }), [kueueConfig, localQueues]);
};

export default useProjectKueueInfo;
