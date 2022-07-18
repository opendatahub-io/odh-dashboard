import axios from 'axios';
import { Notebook, NotebookSize, Volume, VolumeMount } from '../types';
import { store } from '../redux/store/store';
import { LIMIT_NOTEBOOK_IMAGE_GPU } from '../utilities/const';
import { MOUNT_PATH } from '../pages/notebookController/const';

export const getNotebook = (projectName: string, notebookName: string): Promise<Notebook> => {
  const url = `/api/notebooks/${projectName}/${notebookName}`;
  return axios
    .get(url)
    .then((response) => {
      return response.data;
    })
    .catch((e) => {
      throw new Error(e.response.data.message);
    });
};

export const createNotebook = (
  projectName: string,
  notebookName: string,
  imageUrl: string,
  notebookSize: NotebookSize | undefined,
  gpus: number,
  volumes?: Volume[],
  volumeMounts?: VolumeMount[],
): Promise<Notebook> => {
  const url = `/api/notebooks/${projectName}`;
  const resources = { ...notebookSize?.resources };
  if (gpus > 0) {
    if (!resources.limits) {
      resources.limits = {};
    }
    resources.limits[LIMIT_NOTEBOOK_IMAGE_GPU] = gpus;
  }

  //TODO: instead of store.getState().appState.user, we need to use session and proper auth permissions
  const data = {
    apiVersion: 'kubeflow.org/v1',
    kind: 'Notebook',
    metadata: {
      labels: {
        app: notebookName,
        'opendatahub.io/odh-managed': 'true',
        'opendatahub.io/user': store.getState().appState.user,
      },
      name: notebookName,
    },
    spec: {
      template: {
        spec: {
          containers: [
            {
              image: imageUrl,
              imagePullPolicy: 'Always',
              workingDir: MOUNT_PATH,
              name: notebookName,
              env: [
                {
                  name: 'NOTEBOOK_ARGS',
                  value: `--ServerApp.port=8888
                  --ServerApp.token=''
                  --ServerApp.password=''
                  --ServerApp.base_url=/notebook/${projectName}/${notebookName}`,
                },
                {
                  name: 'JUPYTER_IMAGE',
                  value: imageUrl,
                },
              ],
              resources,
              volumeMounts,
              ports: [
                {
                  name: 'notebook-port',
                  containerPort: 8888,
                  protocol: 'TCP',
                },
              ],
              livenessProbe: {
                initialDelaySeconds: 10,
                periodSeconds: 5,
                timeoutSeconds: 1,
                successThreshold: 1,
                failureThreshold: 3,
                httpGet: {
                  scheme: 'HTTP',
                  path: `/notebook/${projectName}/${notebookName}/api`,
                  port: 'notebook-port',
                },
              },
              readinessProbe: {
                initialDelaySeconds: 10,
                periodSeconds: 5,
                timeoutSeconds: 1,
                successThreshold: 1,
                failureThreshold: 3,
                httpGet: {
                  scheme: 'HTTP',
                  path: `/notebook/${projectName}/${notebookName}/api`,
                  port: 'notebook-port',
                },
              },
            },
          ],
          volumes,
        },
      },
    },
  };

  return axios
    .post(url, data)
    .then((response) => {
      return response.data;
    })
    .catch((e) => {
      throw new Error(e.response.data.message);
    });
};

export const deleteNotebook = (projectName: string, notebookName: string): Promise<any> => {
  const url = `/api/notebooks/${projectName}/${notebookName}`;

  return axios
    .delete(url)
    .then((response) => {
      return response.data;
    })
    .catch((e) => {
      throw new Error(e.response.data.message);
    });
};

export const patchNotebook = (
  projectName: string,
  notebookName: string,
  updateData: any,
): Promise<Notebook> => {
  const url = `/api/notebooks/${projectName}/${notebookName}`;

  return axios
    .patch(url, updateData)
    .then((response) => {
      return response.data;
    })
    .catch((e) => {
      throw new Error(e.response.data.message);
    });
};
