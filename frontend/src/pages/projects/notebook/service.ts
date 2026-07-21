import type { PodKind } from '@odh-dashboard/k8s-core';
import { NotebookKind } from '#~/k8sTypes';
import { getPodsForNotebook } from '#~/api';
import { NotebookDataState } from './types';
import { hasStopAnnotation } from './utils';

const checkPodContainersReady = (pod: PodKind): boolean => {
  const containerStatuses = pod.status?.containerStatuses || [];
  if (containerStatuses.length === 0) {
    return false;
  }
  return containerStatuses.every(
    (containerStatus) => containerStatus.ready && containerStatus.state?.running,
  );
};

export const getNotebooksStatus = async (
  notebooks: NotebookKind[],
): Promise<NotebookDataState[]> => {
  if (notebooks.length === 0) {
    return [];
  }

  return Promise.all(
    notebooks.map((notebook) =>
      getPodsForNotebook(notebook.metadata.namespace, notebook.metadata.name),
    ),
  ).then((podsPerNotebook) =>
    podsPerNotebook.reduce<NotebookDataState[]>((acc, pods, i) => {
      const isStopped = hasStopAnnotation(notebooks[i]);
      const runningPod = pods.find((pod) => checkPodContainersReady(pod));
      const podsReady = runningPod != null;
      return [
        ...acc,
        {
          notebook: notebooks[i],
          isStarting: !isStopped && !podsReady,
          isRunning: !isStopped && podsReady,
          isStopping: isStopped && podsReady,
          isStopped: isStopped && !podsReady,
          runningPodUid: runningPod?.metadata.uid ?? pods[0]?.metadata?.uid ?? '',
          containerStatuses: runningPod?.status?.containerStatuses ?? [],
        },
      ];
    }, []),
  );
};

export const getNotebookStatus = async (notebook: NotebookKind): Promise<NotebookDataState> =>
  getNotebooksStatus([notebook]).then((states) => states[0]);
