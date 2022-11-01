import axios from 'axios';
import { RecursivePartial } from 'typeHelpers';
import { Notebook, NotebookState, NotebookData } from '../types';

export const getNotebook = (namespace: string, name: string): Promise<Notebook> => {
  const url = `/api/notebooks/${namespace}/${name}`;
  return axios
    .get(url)
    .then((response) => {
      return response.data;
    })
    .catch((e) => {
      throw new Error(e.response.data.message);
    });
};

export const getNotebookAndStatus = (
  namespace: string,
  name: string,
  notebook: Notebook | null,
): Promise<{ notebook: Notebook | null; isRunning: boolean }> => {
  const url = `/api/notebooks/${namespace}/${name}/status`;

  return axios
    .get(url)
    .then((response) => response.data)
    .catch((e) => {
      if (e.response.status === 404) {
        return { notebook, isRunning: false };
      }

      console.error(
        'Checking notebook status failed, falling back on notebook check logic',
        e.response.data.message,
      );
      // Notebooks are unreliable to live status on replicas -- but if we have nothing else...
      const isRunning = !!(
        notebook?.status?.readyReplicas &&
        notebook?.status?.readyReplicas >= 1 &&
        notebook?.metadata.annotations?.['opendatahub.io/link'] &&
        !notebook?.metadata.annotations?.['kubeflow-resource-stopped']
      );
      return { notebook, isRunning };
    });
};

export const enableNotebook = async (notebookData: NotebookData): Promise<Notebook> => {
  const url = `/api/notebooks`;

  return axios
    .post(url, notebookData)
    .then((response) => {
      return response.data;
    })
    .catch((e) => {
      throw new Error(e.response.data.message);
    });
};

export const stopNotebook = (username?: string): Promise<Notebook> => {
  const url = `/api/notebooks`;

  const patch: RecursivePartial<NotebookData> = {
    state: NotebookState.Stopped,
    username: username,
  };

  return axios
    .patch(url, patch)
    .then((response) => {
      return response.data;
    })
    .catch((e) => {
      throw new Error(e.response.data.message);
    });
};
