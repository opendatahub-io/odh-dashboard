import * as React from 'react';
import useFetch, { FetchStateObject, NotReadyError } from '@odh-dashboard/ui-core/hooks/useFetch';
import { KnownLabels } from '@odh-dashboard/k8s-core';
import { getModelServingProjects } from '@odh-dashboard/internal/api/k8s/projects';
import { listAllLocalQueues } from '@odh-dashboard/internal/api/k8s/localQueues';
import type { KueueProject } from '../types';

const isKueueManagedProject = (
  project: Awaited<ReturnType<typeof getModelServingProjects>>[number],
): boolean => project.metadata.labels?.[KnownLabels.KUEUE_MANAGED] === 'true';

const resolveKueueProjectsForClusterQueue = async (
  clusterQueueName: string,
): Promise<KueueProject[]> => {
  const [localQueues, projects] = await Promise.all([
    listAllLocalQueues(),
    getModelServingProjects(),
  ]);

  const namespacesForClusterQueue = new Set(
    localQueues
      .filter((localQueue) => localQueue.spec.clusterQueue === clusterQueueName)
      .map((localQueue) => localQueue.metadata?.namespace)
      .filter((namespace): namespace is string => Boolean(namespace)),
  );

  return projects
    .filter(
      (project) =>
        namespacesForClusterQueue.has(project.metadata.name) && isKueueManagedProject(project),
    )
    .map((project) => ({ name: project.metadata.name }))
    .toSorted((a, b) => a.name.localeCompare(b.name));
};

const useKueueProjectsForClusterQueue = (
  clusterQueueName?: string,
): FetchStateObject<KueueProject[]> =>
  useFetch<KueueProject[]>(
    React.useCallback(() => {
      if (!clusterQueueName) {
        return Promise.reject(new NotReadyError('No cluster queue name'));
      }

      return resolveKueueProjectsForClusterQueue(clusterQueueName);
    }, [clusterQueueName]),
    [],
    { initialPromisePurity: true },
  );

export default useKueueProjectsForClusterQueue;
