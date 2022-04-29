import axios from 'axios';
import {
  ImageStream,
  ImageStreamTag,
  Notebook,
  NotebookList,
  NotebookSize,
  Volume,
  VolumeMount,
} from '../types';
import { store } from '../redux/store/store';
import { ANNOTATION_DESCRIPTION } from '../utilities/const';

export const getNotebooks = (projectName: string): Promise<NotebookList> => {
  const url = `/api/data-projects/${projectName}/notebooks`;
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
  namespace: string,
  name: string,
  imageStream: ImageStream,
  tag: ImageStreamTag,
  notebookSize: NotebookSize | undefined,
  gpus: number,
  notebookDescription?: string | undefined,
  volumes?: Volume[] | undefined,
  volumeMounts?: VolumeMount[] | undefined,
): Promise<Notebook> => {
  const url = `/api/data-projects/${namespace}/notebooks`;
  const resources = { ...notebookSize?.resources };
  //TODO: Add GPUs back in post summit
  // if (gpus > 0) {
  //   if (!resources.limits) {
  //     resources.limits = {};
  //   }
  //   resources.limits[LIMIT_NOTEBOOK_IMAGE_GPU] = gpus;
  // }

  const annotations = notebookDescription
    ? { [ANNOTATION_DESCRIPTION]: notebookDescription }
    : undefined;

  //TODO: instead of store.getState().appState.user, we need to use session and proper auth permissions
  const data = {
    apiVersion: 'kubeflow.org/v1',
    kind: 'Notebook',
    metadata: {
      labels: {
        app: name,
        'opendatahub.io/odh-managed': 'true',
        'opendatahub.io/user': store.getState().appState.user,
      },
      annotations,
      name,
      namespace,
    },
    spec: {
      template: {
        spec: {
          containers: [
            {
              // TODO: authorize and pull from internal registry
              // image: `${imageStream?.status?.dockerImageRepository}:${tag.name}`,
              image: tag.from.name,
              imagePullPolicy: 'Always',
              name: name,
              env: [
                {
                  name: 'NOTEBOOK_ARGS',
                  value: "--NotebookApp.token='' --NotebookApp.password=''",
                },
              ],
              resources,
              volumeMounts,
              ports: {
                name: 'notebook-port',
                containerPort: 8888,
                protocol: 'TCP',
              },
              readinessProbe: {
                initialDelaySeconds: 5,
                periodSeconds: 5,
                timeoutSeconds: 1,
                successThreshold: 1,
                failureThreshold: 3,
                httpGet: {
                  path: '/api',
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
  const url = `/api/data-projects/${projectName}/notebooks/${notebookName}`;

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
  const url = `/api/data-projects/${projectName}/notebooks/${notebookName}`;

  return axios
    .patch(url, updateData)
    .then((response) => {
      return response.data;
    })
    .catch((e) => {
      throw new Error(e.response.data.message);
    });
};
