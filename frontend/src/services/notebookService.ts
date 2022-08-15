import axios from 'axios';
import * as _ from 'lodash';
import {
  EnvVarReducedType,
  Notebook,
  NotebookSize,
  Volume,
  VolumeMount,
  NotebookToleration,
  NotebookTolerationSettings,
  EnvironmentVariable,
  NotebookResources,
  NotebookAffinity,
} from '../types';
import { RecursivePartial } from '../typeHelpers';
import { LIMIT_NOTEBOOK_IMAGE_GPU } from '../utilities/const';
import { MOUNT_PATH } from '../pages/notebookController/const';
import { usernameTranslate } from 'utilities/notebookControllerUtils';

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

export const getNotebookAndStatus = (
  projectName: string,
  notebookName: string,
  notebook: Notebook | null,
): Promise<{ notebook: Notebook | null; isRunning: boolean }> => {
  const url = `/api/notebooks/${projectName}/${notebookName}/status`;

  return axios
    .get(url)
    .then((response) => response.data)
    .catch((e) => {
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

type StartNotebookData = {
  projectName: string;
  notebookName: string;
  username: string;
  imageUrl: string;
  notebookSize: NotebookSize;
  imageSelection: string;
  gpus: number;
  envVars: EnvVarReducedType;
  tolerationSettings?: NotebookTolerationSettings;
  volumes?: Volume[];
  volumeMounts?: VolumeMount[];
};

const assembleNotebook = (data: StartNotebookData): Notebook => {
  const {
    projectName,
    notebookName,
    username,
    imageUrl,
    notebookSize,
    imageSelection,
    gpus,
    envVars,
    tolerationSettings,
    volumes,
    volumeMounts,
  } = data;
  const resources: NotebookResources = { ...notebookSize.resources };
  const tolerations: NotebookToleration[] = [];
  let affinity: NotebookAffinity = {};
  if (gpus > 0) {
    if (!resources.limits) {
      resources.limits = {};
    }
    if (!resources.requests) {
      resources.requests = {};
    }
    resources.limits[LIMIT_NOTEBOOK_IMAGE_GPU] = gpus;
    resources.requests[LIMIT_NOTEBOOK_IMAGE_GPU] = gpus;
    tolerations.push({
      effect: 'NoSchedule',
      key: LIMIT_NOTEBOOK_IMAGE_GPU,
      operator: 'Exists',
    });
  } else {
    affinity = {
      nodeAffinity: {
        preferredDuringSchedulingIgnoredDuringExecution: [
          {
            preference: {
              matchExpressions: [
                {
                  key: 'nvidia.com/gpu.present',
                  operator: 'NotIn',
                  values: ['true'],
                },
              ],
            },
            weight: 1,
          },
        ],
      },
    };
  }

  if (tolerationSettings?.enabled) {
    tolerations.push({
      effect: 'NoSchedule',
      key: tolerationSettings.key,
      operator: 'Exists',
    });
  }
  const translatedUsername = usernameTranslate(username);

  const configMapEnvs = Object.keys(envVars.configMap).map<EnvironmentVariable>((key) => ({
    name: key,
    valueFrom: {
      configMapKeyRef: {
        key,
        name: envVars.envVarFileName,
      },
    },
  }));

  const secretEnvs = Object.keys(envVars.secrets).map<EnvironmentVariable>((key) => ({
    name: key,
    valueFrom: {
      secretKeyRef: {
        key,
        name: envVars.envVarFileName,
      },
    },
  }));
  const location = new URL(window.location.href);
  const origin = location.origin;

  return {
    apiVersion: 'kubeflow.org/v1',
    kind: 'Notebook',
    metadata: {
      labels: {
        app: notebookName,
        'opendatahub.io/odh-managed': 'true',
        'opendatahub.io/user': translatedUsername,
      },
      annotations: {
        'notebooks.opendatahub.io/oauth-logout-url': `${origin}/notebookController/${translatedUsername}/home`,
        'notebooks.opendatahub.io/last-size-selection': notebookSize.name,
        'notebooks.opendatahub.io/last-image-selection': imageSelection,
        'opendatahub.io/username': username,
      },
      name: notebookName,
      namespace: projectName,
    },
    spec: {
      template: {
        spec: {
          affinity,
          enableServiceLinks: false,
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
                  --ServerApp.base_url=/notebook/${projectName}/${notebookName}
                  --ServerApp.quit_button=False
                  --ServerApp.tornado_settings={"user":"${translatedUsername}","hub_host":"${origin}","hub_prefix":"/notebookController/${translatedUsername}"}`,
                },
                {
                  name: 'JUPYTER_IMAGE',
                  value: imageUrl,
                },
                ...configMapEnvs,
                ...secretEnvs,
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
          tolerations,
        },
      },
    },
  };
};

/** We do not have a notebook, create the resources */
const createNotebook = async (notebook: Notebook): Promise<Notebook> => {
  const url = `/api/notebooks/${notebook.metadata.namespace}`;

  return axios
    .post(url, notebook)
    .then((response) => {
      return response.data;
    })
    .catch((e) => {
      throw new Error(e.response.data.message);
    });
};

/** We have a notebook, start it back up */
const enableNotebook = async (notebook: Notebook): Promise<Notebook> => {
  const { name, namespace } = notebook.metadata;

  if (!namespace) {
    return Promise.reject('Notebook is not assigned to a namespace -- cannot start it');
  }

  return patchNotebook(
    namespace,
    name,
    _.merge({}, notebook, { metadata: { annotations: { 'kubeflow-resource-stopped': null } } }),
  );
};

export const startNotebook = (data: StartNotebookData): Promise<Notebook> => {
  const notebook = assembleNotebook(data);

  // Determine if we have a notebook, we want to just start it -- otherwise we want to create it
  return new Promise((resolve, reject) => {
    getNotebook(data.projectName, data.notebookName)
      .then((responseData) => {
        if (!responseData) {
          // Successful 2xx, but no data... create
          createNotebook(notebook).then(resolve).catch(reject);
          return;
        }

        // We have a notebook, patch it
        enableNotebook(notebook).then(resolve).catch(reject);
      })
      .catch(reject);
  });
};

export const stopNotebook = (projectName: string, notebookName: string): Promise<Notebook> => {
  const dateStr = new Date().toISOString().replace(/\.\d{3}Z/i, 'Z');
  const patch: RecursivePartial<Notebook> = {
    metadata: { annotations: { 'kubeflow-resource-stopped': dateStr } },
  };

  return patchNotebook(projectName, notebookName, patch);
};

export const patchNotebook = (
  projectName: string,
  notebookName: string,
  updateData: RecursivePartial<Notebook>,
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
