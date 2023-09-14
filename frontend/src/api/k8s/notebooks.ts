import {
  k8sCreateResource,
  k8sDeleteResource,
  k8sGetResource,
  k8sListResource,
  k8sPatchResource,
  k8sUpdateResource,
  Patch,
} from '@openshift/dynamic-plugin-sdk-utils';
import * as _ from 'lodash';
import { NotebookModel } from '~/api/models';
import { K8sAPIOptions, K8sStatus, KnownLabels, NotebookKind } from '~/k8sTypes';
import { usernameTranslate } from '~/utilities/notebookControllerUtils';
import { EnvironmentFromVariable, StartNotebookData } from '~/pages/projects/types';
import { ROOT_MOUNT_PATH } from '~/pages/projects/pvc/const';
import { translateDisplayNameForK8s } from '~/pages/projects/utils';
import { getTolerationPatch, TolerationChanges } from '~/utilities/tolerations';
import { applyK8sAPIOptions } from '~/api/apiMergeUtils';
import {
  ELYRA_VOLUME_NAME,
  generateElyraServiceAccountRoleBinding,
  getElyraVolume,
  getElyraVolumeMount,
  getPipelineVolumeMountPatch,
  getPipelineVolumePatch,
} from '~/concepts/pipelines/elyra/utils';
import { createRoleBinding } from '~/api';
import { Volume, VolumeMount } from '~/types';
import { assemblePodSpecOptions, getshmVolume, getshmVolumeMount } from './utils';

const assembleNotebook = (
  data: StartNotebookData,
  username: string,
  canEnablePipelines?: boolean,
): NotebookKind => {
  const {
    projectName,
    notebookName,
    notebookId: overrideNotebookId,
    description,
    notebookSize,
    envFrom,
    gpus,
    image,
    volumes: formVolumes,
    volumeMounts: formVolumeMounts,
    tolerationSettings,
  } = data;
  const notebookId = overrideNotebookId || translateDisplayNameForK8s(notebookName);
  const imageUrl = `${image.imageStream?.status?.dockerImageRepository}:${image.imageVersion?.name}`;
  const imageSelection = `${image.imageStream?.metadata.name}:${image.imageVersion?.name}`;

  const { affinity, tolerations, resources } = assemblePodSpecOptions(
    notebookSize.resources,
    gpus,
    tolerationSettings,
  );

  const translatedUsername = usernameTranslate(username);

  const location = new URL(window.location.href);
  const origin = location.origin;

  let volumes: Volume[] | undefined = formVolumes && [...formVolumes];
  let volumeMounts: VolumeMount[] | undefined = formVolumeMounts && [...formVolumeMounts];
  if (canEnablePipelines) {
    volumes = volumes || [];
    if (!volumes.find((volume) => volume.name === ELYRA_VOLUME_NAME)) {
      volumes.push(getElyraVolume());
    }

    volumeMounts = volumeMounts || [];
    if (!volumeMounts.find((volumeMount) => volumeMount.name === ELYRA_VOLUME_NAME)) {
      volumeMounts.push(getElyraVolumeMount());
    }
  }
  volumes = volumes || [];
  if (!volumes.find((volume) => volume.name === 'shm')) {
    volumes.push(getshmVolume());
  }
  volumeMounts = volumeMounts || [];
  if (!volumeMounts.find((volumeMount) => volumeMount.name === 'shm')) {
    volumeMounts.push(getshmVolumeMount());
  }

  return {
    apiVersion: 'kubeflow.org/v1',
    kind: 'Notebook',
    metadata: {
      labels: {
        app: notebookId,
        'opendatahub.io/odh-managed': 'true',
        'opendatahub.io/user': translatedUsername,
        [KnownLabels.DASHBOARD_RESOURCE]: 'true',
      },
      annotations: {
        'openshift.io/display-name': notebookName.trim(),
        'openshift.io/description': description || '',
        'notebooks.opendatahub.io/oauth-logout-url': `${origin}/projects/${projectName}?notebookLogout=${notebookId}`,
        'notebooks.opendatahub.io/last-size-selection': notebookSize.name,
        'notebooks.opendatahub.io/last-image-selection': imageSelection,
        'notebooks.opendatahub.io/inject-oauth': 'true',
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
                  --ServerApp.tornado_settings={"user":"${translatedUsername}","hub_host":"${origin}","hub_prefix":"/projects/${projectName}"}`,
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

export const getNotebooks = (namespace: string): Promise<NotebookKind[]> =>
  k8sListResource<NotebookKind>({
    model: NotebookModel,
    queryOptions: { ns: namespace },
  }).then((listResource) => listResource.items);

export const getNotebook = (name: string, namespace: string): Promise<NotebookKind> =>
  k8sGetResource<NotebookKind>({
    model: NotebookModel,
    queryOptions: { name, ns: namespace },
  });

export const stopNotebook = (name: string, namespace: string): Promise<NotebookKind> =>
  k8sPatchResource<NotebookKind>({
    model: NotebookModel,
    queryOptions: { name, ns: namespace },
    patches: [getStopPatch()],
  });

export const startNotebook = async (
  name: string,
  namespace: string,
  tolerationChanges: TolerationChanges,
  enablePipelines?: boolean,
): Promise<NotebookKind> => {
  const patches: Patch[] = [];
  patches.push(startPatch);

  const tolerationPatch = getTolerationPatch(tolerationChanges);
  if (tolerationPatch) {
    patches.push(tolerationPatch);
  }

  if (enablePipelines) {
    patches.push(getPipelineVolumePatch());
    patches.push(getPipelineVolumeMountPatch());
    await createRoleBinding(generateElyraServiceAccountRoleBinding(name, namespace)).catch((e) => {
      // This is not ideal, but it shouldn't impact the starting of the notebook. Let us log it, and mute the error
      // eslint-disable-next-line no-console
      console.error(
        `Could not patch rolebinding to service account for notebook, ${name}; Reason ${e.message}`,
      );
    });
  }

  return k8sPatchResource<NotebookKind>({
    model: NotebookModel,
    queryOptions: { name, ns: namespace },
    patches,
  });
};

export const createNotebook = (
  data: StartNotebookData,
  username: string,
  canEnablePipelines?: boolean,
): Promise<NotebookKind> => {
  const notebook = assembleNotebook(data, username, canEnablePipelines);

  const notebookPromise = k8sCreateResource<NotebookKind>({
    model: NotebookModel,
    resource: notebook,
  });

  if (canEnablePipelines) {
    return createRoleBinding(
      generateElyraServiceAccountRoleBinding(notebook.metadata.name, notebook.metadata.namespace),
    ).then(() => notebookPromise);
  }

  return notebookPromise;
};

export const updateNotebook = (
  existingNotebook: NotebookKind,
  data: StartNotebookData,
  username: string,
): Promise<NotebookKind> => {
  data.notebookId = existingNotebook.metadata.name;
  const notebook = assembleNotebook(data, username);

  const oldNotebook = structuredClone(existingNotebook);
  const container = oldNotebook.spec.template.spec.containers[0];

  // clean the envFrom array in case of merging the old value again
  container.envFrom = [];
  // clean the resources, affinity and tolerations for GPU
  oldNotebook.spec.template.spec.tolerations = [];
  oldNotebook.spec.template.spec.affinity = {};
  container.resources = {};

  return k8sUpdateResource<NotebookKind>({
    model: NotebookModel,
    resource: _.merge({}, oldNotebook, notebook),
  });
};

export const createNotebookWithoutStarting = (
  data: StartNotebookData,
  username: string,
): Promise<NotebookKind> =>
  new Promise((resolve, reject) =>
    createNotebook(data, username).then((notebook) =>
      setTimeout(
        () =>
          stopNotebook(notebook.metadata.name, notebook.metadata.namespace)
            .then(resolve)
            .catch(reject),
        10_000,
      ),
    ),
  );

export const deleteNotebook = (notebookName: string, namespace: string): Promise<K8sStatus> =>
  k8sDeleteResource<NotebookKind, K8sStatus>({
    model: NotebookModel,
    queryOptions: { name: notebookName, ns: namespace },
  });

export const attachNotebookSecret = (
  notebookName: string,
  namespace: string,
  secretName: string,
  hasExistingEnvFrom: boolean,
  opts?: K8sAPIOptions,
): Promise<NotebookKind> => {
  const patches: Patch[] = [];

  if (!hasExistingEnvFrom) {
    // Create the array if it does not exist
    patches.push({
      op: 'add',
      // TODO: can we assume first container?
      path: '/spec/template/spec/containers/0/envFrom',
      value: [],
    });
  }

  patches.push({
    op: 'add',
    // TODO: can we assume first container?
    path: '/spec/template/spec/containers/0/envFrom/-',
    value: {
      secretRef: {
        name: secretName,
      },
    },
  });

  return k8sPatchResource<NotebookKind>(
    applyK8sAPIOptions(opts, {
      model: NotebookModel,
      queryOptions: { name: notebookName, ns: namespace },
      patches,
    }),
  );
};

export const replaceNotebookSecret = (
  notebookName: string,
  namespace: string,
  newEnvs: EnvironmentFromVariable[],
  opts?: K8sAPIOptions,
): Promise<NotebookKind> => {
  const patches: Patch[] = [
    {
      op: 'replace',
      // TODO: can we assume first container?
      path: '/spec/template/spec/containers/0/envFrom',
      value: newEnvs,
    },
  ];

  return k8sPatchResource<NotebookKind>(
    applyK8sAPIOptions(opts, {
      model: NotebookModel,
      queryOptions: { name: notebookName, ns: namespace },
      patches,
    }),
  );
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
): Promise<NotebookKind> =>
  new Promise((resolve, reject) => {
    getNotebook(notebookName, namespace)
      .then((notebook) => {
        const volumes = notebook.spec.template.spec.volumes || [];
        // TODO: can we assume first container?
        const volumeMounts = notebook.spec.template.spec.containers[0].volumeMounts || [];
        const filteredVolumes = volumes.filter(
          (volume) => volume.persistentVolumeClaim?.claimName !== pvcName,
        );
        const filteredVolumeMounts = volumeMounts.filter(
          (volumeMount) => volumeMount.name !== pvcName,
        );

        const patches: Patch[] = [
          {
            op: 'replace',
            path: '/spec/template/spec/volumes',
            value: filteredVolumes,
          },
          {
            op: 'replace',
            // TODO: can we assume first container?
            path: '/spec/template/spec/containers/0/volumeMounts',
            value: filteredVolumeMounts,
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

export const removeNotebookSecret = (
  notebookName: string,
  namespace: string,
  secretName: string,
): Promise<NotebookKind> =>
  new Promise((resolve, reject) => {
    getNotebook(notebookName, namespace)
      .then((notebook) => {
        const envFroms = notebook.spec.template.spec.containers[0].envFrom || [];
        const filteredEnvFroms = envFroms.filter(
          (envFrom) => envFrom.secretRef?.name !== secretName,
        );

        const patches: Patch[] = [
          {
            op: 'replace',
            // TODO: can we assume first container?
            path: '/spec/template/spec/containers/0/envFrom',
            value: filteredEnvFroms,
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
