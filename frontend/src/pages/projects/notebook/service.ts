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
    podsPerNotebook.reduce<NotebookDataState[]>(
      (acc, pods, i) => [
        ...acc,
        {
          notebook: notebooks[i],
          isStarting: !hasStopAnnotation(notebooks[i]),
          isRunning:
            !hasStopAnnotation(notebooks[i]) && pods.some((pod) => checkPodContainersReady(pod)),
        },
      ],
      [],
    ),
  );
};

export const getNotebookStatus = async (notebook: NotebookKind): Promise<NotebookDataState> => {
  return getNotebooksStatus([notebook]).then((states) => states[0]);
};
