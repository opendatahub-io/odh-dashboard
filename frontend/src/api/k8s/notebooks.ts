import {
  k8sCreateResource,
  k8sDeleteResource,
  k8sGetResource,
  k8sListResource,
  k8sPatchResource,
  k8sUpdateResource,
  Patch,
  K8sStatus,
} from '@openshift/dynamic-plugin-sdk-utils';
import * as _ from 'lodash-es';
import { NotebookModel } from '~/api/models';
import { K8sAPIOptions, KnownLabels, NotebookKind } from '~/k8sTypes';
import { usernameTranslate } from '~/utilities/notebookControllerUtils';
import { EnvironmentFromVariable, StartNotebookData } from '~/pages/projects/types';
import { ROOT_MOUNT_PATH } from '~/pages/projects/pvc/const';
import { translateDisplayNameForK8s } from '~/concepts/k8s/utils';
import { getTolerationPatch, TolerationChanges } from '~/utilities/tolerations';
import { applyK8sAPIOptions } from '~/api/apiMergeUtils';
import {
  createElyraServiceAccountRoleBinding,
  ELYRA_VOLUME_NAME,
  getElyraVolume,
  getElyraVolumeMount,
  getPipelineVolumeMountPatch,
  getPipelineVolumePatch,
} from '~/concepts/pipelines/elyra/utils';
import { Volume, VolumeMount } from '~/types';
import { getImageStreamDisplayName } from '~/pages/projects/screens/spawner/spawnerUtils';
import { assemblePodSpecOptions, getshmVolume, getshmVolumeMount } from './utils';

export const assembleNotebook = (
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
    acceleratorProfile,
    image,
    volumes: formVolumes,
    volumeMounts: formVolumeMounts,
    tolerationSettings,
    existingTolerations,
    existingResources,
  } = data;
  const notebookId = overrideNotebookId || translateDisplayNameForK8s(notebookName);
  const imageUrl = `${image.imageStream?.status?.dockerImageRepository}:${image.imageVersion?.name}`;
  const imageSelection = `${image.imageStream?.metadata.name}:${image.imageVersion?.name}`;

  const { affinity, tolerations, resources } = assemblePodSpecOptions(
    notebookSize.resources,
    acceleratorProfile,
    tolerationSettings,
    existingTolerations,
    undefined,
    existingResources,
  );

  const translatedUsername = usernameTranslate(username);

  const location = new URL(window.location.href);
  const { origin } = location;

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

  const resource: NotebookKind = {
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
        'opendatahub.io/accelerator-name':
          acceleratorProfile.acceleratorProfile?.metadata.name || '',
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

  // set image display name
  if (image.imageStream && resource.metadata.annotations) {
    resource.metadata.annotations['opendatahub.io/image-display-name'] = getImageStreamDisplayName(
      image.imageStream,
    );
  }

  return resource;
};

const getStopPatchDataString = (): string => new Date().toISOString().replace(/\.\d{3}Z/i, 'Z');

export const startPatch: Patch = {
  op: 'remove',
  path: '/metadata/annotations/kubeflow-resource-stopped',
};
export const getStopPatch = (): Patch => ({
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
  notebook: NotebookKind,
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
    await createElyraServiceAccountRoleBinding(notebook);
  }

  return k8sPatchResource<NotebookKind>({
    model: NotebookModel,
    queryOptions: { name: notebook.metadata.name, ns: notebook.metadata.namespace },
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
    return notebookPromise.then((fetchedNotebook) =>
      createElyraServiceAccountRoleBinding(fetchedNotebook).then(() => fetchedNotebook),
    );
  }

  return notebookPromise;
};

export const updateNotebook = (
  existingNotebook: NotebookKind,
  assignableData: StartNotebookData,
  username: string,
  opts?: K8sAPIOptions,
): Promise<NotebookKind> => {
  assignableData.notebookId = existingNotebook.metadata.name;
  const notebook = assembleNotebook(assignableData, username);

  const oldNotebook = structuredClone(existingNotebook);
  const container = oldNotebook.spec.template.spec.containers[0];

  // clean the envFrom array in case of merging the old value again
  container.envFrom = [];
  // clean the resources, affinity and tolerations for accelerator
  oldNotebook.spec.template.spec.tolerations = [];
  oldNotebook.spec.template.spec.affinity = {};
  container.resources = {};

  return k8sUpdateResource<NotebookKind>(
    applyK8sAPIOptions(
      {
        model: NotebookModel,
        resource: _.merge({}, oldNotebook, notebook),
      },
      opts,
    ),
  );
};

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
    applyK8sAPIOptions(
      {
        model: NotebookModel,
        queryOptions: { name: notebookName, ns: namespace },
        patches,
      },
      opts,
    ),
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
    applyK8sAPIOptions(
      {
        model: NotebookModel,
        queryOptions: { name: notebookName, ns: namespace },
        patches,
      },
      opts,
    ),
  );
};

export const attachNotebookPVC = (
  notebookName: string,
  namespace: string,
  pvcName: string,
  mountSuffix: string,
  opts?: K8sAPIOptions,
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

  return k8sPatchResource<NotebookKind>(
    applyK8sAPIOptions(
      {
        model: NotebookModel,
        queryOptions: { name: notebookName, ns: namespace },
        patches,
      },
      opts,
    ),
  );
};

export const removeNotebookPVC = (
  notebookName: string,
  namespace: string,
  pvcName: string,
  opts?: K8sAPIOptions,
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

        k8sPatchResource<NotebookKind>(
          applyK8sAPIOptions(
            {
              model: NotebookModel,
              queryOptions: { name: notebookName, ns: namespace },
              patches,
            },
            opts,
          ),
        )
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
