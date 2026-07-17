import type { RecursivePartial } from '@odh-dashboard/foundation';
import axios from '#~/utilities/axios';
import { NotebookState, NotebookData, NotebookRunningState } from '#~/types';
import { NotebookKind } from '#~/k8sTypes';

export const getNotebook = (namespace: string, name: string): Promise<NotebookKind> => {
  const url = `/api/notebooks/${namespace}/${name}`;
  return axios
    .get(url)
    .then((response) => response.data)
    .catch((e) => {
      throw new Error(e.response?.data?.message || e.message);
    });
};

export const getNotebookAndStatus = (
  namespace: string,
  name: string,
  notebook: NotebookKind | null,
): Promise<NotebookRunningState> => {
  const url = `/api/notebooks/${namespace}/${name}/status`;

  return axios
    .get(url)
    .then((response) => response.data)
    .catch((e) => {
      if (e.response?.status === 404) {
        return { notebook, isRunning: false };
      }
      /* eslint-disable-next-line no-console */
      console.error(
        'Checking notebook status failed, falling back on notebook check logic',
        e.response?.data?.message || e.message,
      );
      // Notebooks are unreliable to live status on replicas -- but if we have nothing else...
      const isRunning = !!(
        notebook?.status?.readyReplicas &&
        notebook.status.readyReplicas >= 1 &&
        !notebook.metadata.annotations?.['kubeflow-resource-stopped']
      );
      return { notebook, isRunning };
    });
};

export const enableNotebook = async (notebookData: NotebookData): Promise<NotebookKind> => {
  const url = `/api/notebooks`;

  return axios
    .post(url, notebookData)
    .then((response) => response.data)
    .catch((e) => {
      throw new Error(e.response?.data?.message || e.message);
    });
};

export const stopNotebook = (username?: string): Promise<NotebookKind> => {
  const url = `/api/notebooks`;

  const patch: RecursivePartial<NotebookData> = {
    state: NotebookState.Stopped,
    // only used for admin calls
    username,
  };

  return axios
    .patch(url, patch)
    .then((response) => response.data)
    .catch((e) => {
      throw new Error(e.response?.data?.message || e.message);
    });
};
