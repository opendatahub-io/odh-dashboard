import { NotebookKind, PodKind } from '../../../k8sTypes';
import { NotebookDataState } from './types';
import { getPodsForNotebook } from '../../../api';
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
      // Sometimes a notebook is terminated without being set a stop annotation
      // We should also check that and think that's also a stop
      // Or the notebook will always be in `isStarting` status
      const isTerminated = notebooks[i].status?.containerState?.terminated;
      const isStopped = hasStopAnnotation(notebooks[i]) || isTerminated;
      const podsReady = pods.some((pod) => checkPodContainersReady(pod));
      return [
        ...acc,
        {
          notebook: notebooks[i],
          isStarting: !isStopped && !podsReady,
          isRunning: !isStopped && podsReady,
          runningPodUid: pods[0]?.metadata?.uid || '',
        },
      ];
    }, []),
  );
};

export const getNotebookStatus = async (notebook: NotebookKind): Promise<NotebookDataState> => {
  return getNotebooksStatus([notebook]).then((states) => states[0]);
};
