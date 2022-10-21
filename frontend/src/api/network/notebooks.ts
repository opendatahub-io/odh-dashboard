import {
  k8sCreateResource,
  k8sDeleteResource,
  k8sGetResource,
  k8sListResource,
  k8sPatchResource,
  Patch,
} from '@openshift/dynamic-plugin-sdk-utils';
import { NotebookModel } from '../models';
import { K8sStatus, NotebookKind } from '../../k8sTypes';
import {
  NotebookAffinity,
  NotebookResources,
  NotebookToleration,
  NotebookTolerationSettings,
} from '../../types';
import { usernameTranslate } from '../../utilities/notebookControllerUtils';
import { genRandomChars } from '../../utilities/string';
import { StartNotebookData } from '../../pages/projects/types';
import { ROOT_MOUNT_PATH } from '../../pages/projects/pvc/const';

const assembleNotebookAffinityAndTolerations = (
  resources: NotebookResources,
  gpus: number,
  tolerationSettings?: NotebookTolerationSettings,
): { affinity: NotebookAffinity; tolerations: NotebookToleration[] } => {
  let affinity: NotebookAffinity = {};
  const tolerations: NotebookToleration[] = [];
  if (gpus > 0) {
    if (!resources.limits) {
      resources.limits = {};
    }
    if (!resources.requests) {
      resources.requests = {};
    }
    resources.limits['nvidia.com/gpu'] = gpus;
    resources.requests['nvidia.com/gpu'] = gpus;
    tolerations.push({
      effect: 'NoSchedule',
      key: 'nvidia.com/gpu',
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
  return { affinity, tolerations };
};

const assembleNotebook = (data: StartNotebookData, username: string): NotebookKind => {
  const {
    projectName,
    notebookName,
    description,
    notebookSize,
    envFrom,
    gpus,
    image,
    volumes,
    volumeMounts,
    tolerationSettings,
  } = data;
  const notebookId = `notebook-${genRandomChars()}`;
  const resources: NotebookResources = { ...notebookSize.resources };
  const imageUrl = `${image.imageStream?.status?.dockerImageRepository}:${image.imageVersion?.name}`;
  const imageSelection = `${image.imageStream?.metadata.name}:${image.imageVersion?.name}`;

  const { affinity, tolerations } = assembleNotebookAffinityAndTolerations(
    resources,
    gpus,
    tolerationSettings,
  );

  const translatedUsername = usernameTranslate(username);

  const location = new URL(window.location.href);
  const origin = location.origin;

  return {
    apiVersion: 'kubeflow.org/v1',
    kind: 'Notebook',
    metadata: {
      labels: {
        app: notebookId,
        'opendatahub.io/odh-managed': 'true',
        'opendatahub.io/user': translatedUsername,
      },
      annotations: {
        'openshift.io/display-name': notebookName,
        'openshift.io/description': description || '',
        'notebooks.opendatahub.io/oauth-logout-url': `${origin}/notebookController/${translatedUsername}/home`,
        'notebooks.opendatahub.io/last-size-selection': notebookSize.name,
        'notebooks.opendatahub.io/last-image-selection': imageSelection,
        'opendatahub.io/username': username,
      },
      name: notebookId,
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
              workingDir: ROOT_MOUNT_PATH,
              name: notebookId,
              env: [
                {
                  name: 'NOTEBOOK_ARGS',
                  value: `--ServerApp.port=8888
                  --ServerApp.token=''
                  --ServerApp.password=''
                  --ServerApp.base_url=/notebook/${projectName}/${notebookId}
                  --ServerApp.quit_button=False
                  --ServerApp.tornado_settings={"user":"${translatedUsername}","hub_host":"${origin}","hub_prefix":"/notebookController/${translatedUsername}"}`,
                },
                {
                  name: 'JUPYTER_IMAGE',
                  value: imageUrl,
                },
              ],
              envFrom,
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
                  path: `/notebook/${projectName}/${notebookId}/api`,
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
                  path: `/notebook/${projectName}/${notebookId}/api`,
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

const getStopPatchDataString = (): string => new Date().toISOString().replace(/\.\d{3}Z/i, 'Z');

const startPatch: Patch = {
  op: 'remove',
  path: '/metadata/annotations/kubeflow-resource-stopped',
};
const getStopPatch = (): Patch => ({
  op: 'add',
  path: '/metadata/annotations/kubeflow-resource-stopped',
  value: getStopPatchDataString(),
});

export const getNotebooks = (namespace: string): Promise<NotebookKind[]> => {
  return k8sListResource<NotebookKind>({
    model: NotebookModel,
    queryOptions: { ns: namespace },
  }).then((listResource) => listResource.items);
};

export const getNotebook = (name: string, namespace: string): Promise<NotebookKind> => {
  return k8sGetResource<NotebookKind>({
    model: NotebookModel,
    queryOptions: { name, ns: namespace },
  });
};

export const stopNotebook = (name: string, namespace: string): Promise<NotebookKind> => {
  return k8sPatchResource<NotebookKind>({
    model: NotebookModel,
    queryOptions: { name, ns: namespace },
    patches: [getStopPatch()],
  });
};

export const startNotebook = (name: string, namespace: string): Promise<NotebookKind> => {
  return k8sPatchResource<NotebookKind>({
    model: NotebookModel,
    queryOptions: { name, ns: namespace },
    patches: [startPatch],
  });
};

export const createNotebook = (
  data: StartNotebookData,
  username: string,
): Promise<NotebookKind> => {
  const notebook = assembleNotebook(data, username);

  return k8sCreateResource<NotebookKind>({
    model: NotebookModel,
    resource: notebook,
  });
};

export const createNotebookWithoutStarting = (
  data: StartNotebookData,
  username: string,
): Promise<NotebookKind> => {
  const notebook = assembleNotebook(data, username);
  notebook.metadata.annotations['kubeflow-resource-stopped'] = getStopPatchDataString();

  return k8sCreateResource<NotebookKind>({
    model: NotebookModel,
    resource: notebook,
  });
};

export const deleteNotebook = (notebookName: string, namespace: string): Promise<K8sStatus> => {
  return k8sDeleteResource<NotebookKind, K8sStatus>({
    model: NotebookModel,
    queryOptions: { name: notebookName, ns: namespace },
  });
};

export const attachNotebookPVC = (
  notebookName: string,
  namespace: string,
  pvcName: string,
  mountSuffix: string,
): Promise<NotebookKind> => {
  const patches: Patch[] = [
    {
      op: 'add',
      path: '/spec/template/spec/volumes/-',
      value: { name: pvcName, persistentVolumeClaim: { claimName: pvcName } },
    },
    {
      op: 'add',
      // TODO: can we assume first container?
      path: '/spec/template/spec/containers/0/volumeMounts/-',
      value: { mountPath: `${ROOT_MOUNT_PATH}/${mountSuffix}`, name: pvcName },
    },
  ];

  return k8sPatchResource<NotebookKind>({
    model: NotebookModel,
    queryOptions: { name: notebookName, ns: namespace },
    patches,
  });
};

export const removeNotebookPVC = (
  notebookName: string,
  namespace: string,
  pvcName: string,
): Promise<NotebookKind> => {
  return new Promise((resolve, reject) => {
    getNotebook(notebookName, namespace)
      .then((notebook) => {
        const volumes = notebook.spec.template.spec.volumes || [];
        // TODO: can we assume first container?
        const volumeMounts = notebook.spec.template.spec.containers[0].volumeMounts || [];

        const patches: Patch[] = [
          {
            op: 'replace',
            path: '/spec/template/spec/volumes',
            value: volumes.filter((volume) => volume.persistentVolumeClaim?.claimName !== pvcName),
          },
          {
            op: 'replace',
            // TODO: can we assume first container?
            path: '/spec/template/spec/containers/0/volumeMounts',
            value: volumeMounts.filter((volumeMount) => volumeMount.name !== pvcName),
          },
        ];

        k8sPatchResource<NotebookKind>({
          model: NotebookModel,
          queryOptions: { name: notebookName, ns: namespace },
          patches,
        })
          .then(resolve)
          .catch(reject);
      })
      .catch(reject);
  });
};
