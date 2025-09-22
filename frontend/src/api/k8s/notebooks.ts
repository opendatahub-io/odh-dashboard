import {
  k8sCreateResource,
  k8sDeleteResource,
  k8sGetResource,
  k8sListResource,
  k8sPatchResource,
  Patch,
  K8sStatus,
  k8sUpdateResource,
} from '@openshift/dynamic-plugin-sdk-utils';
import * as _ from 'lodash-es';
import { NotebookModel } from '#~/api/models';
import {
  ImageStreamKind,
  ImageStreamSpecTagType,
  K8sAPIOptions,
  KnownLabels,
  NotebookKind,
} from '#~/k8sTypes';
import { usernameTranslate } from '#~/utilities/notebookControllerUtils';
import { EnvironmentFromVariable, StartNotebookData } from '#~/pages/projects/types';
import { ROOT_MOUNT_PATH } from '#~/pages/projects/pvc/const';
import { getTolerationPatch, TolerationChanges } from '#~/utilities/tolerations';
import { applyK8sAPIOptions } from '#~/api/apiMergeUtils';
import {
  ELYRA_VOLUME_NAME,
  getElyraVolume,
  getElyraVolumeMount,
  getPipelineVolumeMountPatch,
  getPipelineVolumePatch,
} from '#~/concepts/pipelines/elyra/utils';
import { NodeSelector, Volume, VolumeMount } from '#~/types';
import { getImageStreamDisplayName } from '#~/pages/projects/screens/spawner/spawnerUtils';
import { k8sMergePatchResource } from '#~/api/k8sUtils';
import { getshmVolume, getshmVolumeMount } from '#~/api/k8s/utils';

export const assembleNotebook = (
  data: StartNotebookData,
  username: string,
  canEnablePipelines?: boolean,
): NotebookKind => {
  const {
    projectName,
    notebookData,
    envFrom,
    image,
    volumes: formVolumes,
    volumeMounts: formVolumeMounts,
    podSpecOptions: {
      resources,
      tolerations,
      nodeSelector,
      lastSizeSelection,
      selectedAcceleratorProfile,
      selectedHardwareProfile,
    },
  } = data;
  const dashboardNamespace = data.dashboardNamespace ?? '';
  const {
    name: notebookName,
    description,
    k8sName: { value: notebookId },
  } = notebookData;
  const imageUrl = `${image.imageStream?.status?.dockerImageRepository ?? ''}:${
    image.imageVersion?.name ?? ''
  }`;
  const imageSelection = `${image.imageStream?.metadata.name ?? ''}:${
    image.imageVersion?.name ?? ''
  }`;

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

  const isAcceleratorProfileSelected = !!selectedAcceleratorProfile;
  const hardwareProfileNamespace: Record<string, string | null> =
    selectedHardwareProfile && isAcceleratorProfileSelected
      ? selectedHardwareProfile.metadata.namespace === projectName
        ? { 'opendatahub.io/hardware-profile-namespace': projectName }
        : { 'opendatahub.io/hardware-profile-namespace': dashboardNamespace }
      : { 'opendatahub.io/hardware-profile-namespace': null };

  let acceleratorProfileNamespace: Record<string, string | null> = {
    'opendatahub.io/accelerator-profile-namespace': null,
  };
  if (selectedAcceleratorProfile?.metadata.namespace === projectName) {
    acceleratorProfileNamespace = {
      'opendatahub.io/accelerator-profile-namespace': data.projectName,
    };
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
        ...hardwareProfileNamespace,
        ...acceleratorProfileNamespace,
        'openshift.io/display-name': notebookName.trim(),
        'openshift.io/description': description || '',
        'notebooks.opendatahub.io/oauth-logout-url': `${origin}/projects/${projectName}?notebookLogout=${notebookId}`,
        'notebooks.opendatahub.io/last-size-selection': lastSizeSelection || '',
        'notebooks.opendatahub.io/last-image-selection': imageSelection,
        'notebooks.opendatahub.io/inject-oauth': 'true',
        'opendatahub.io/username': username,
        'opendatahub.io/accelerator-name': selectedAcceleratorProfile?.metadata.name || '',
        'opendatahub.io/hardware-profile-name': isAcceleratorProfileSelected
          ? ''
          : selectedHardwareProfile?.metadata.name || '',
        'notebooks.opendatahub.io/last-image-version-git-commit-selection':
          image.imageVersion?.annotations?.['opendatahub.io/notebook-build-commit'] ?? '',
      },
      name: notebookId,
      namespace: projectName,
    },
    spec: {
      template: {
        spec: {
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
          tolerations: isAcceleratorProfileSelected ? tolerations : undefined,
          nodeSelector: isAcceleratorProfileSelected ? nodeSelector : undefined,
        },
      },
    },
  };

  // set image display name
  if (image.imageStream && resource.metadata.annotations) {
    resource.metadata.annotations['opendatahub.io/image-display-name'] = getImageStreamDisplayName(
      image.imageStream,
    );
    resource.metadata.annotations['opendatahub.io/workbench-image-namespace'] =
      image.imageStream.metadata.namespace === projectName ? projectName : null;
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
  opts?: K8sAPIOptions,
): Promise<NotebookKind> =>
  new Promise((resolve, reject) => {
    const notebook = assembleNotebook(data, username, canEnablePipelines);

    k8sCreateResource<NotebookKind>(
      applyK8sAPIOptions(
        {
          model: NotebookModel,
          resource: notebook,
        },
        opts,
      ),
    )
      .then((fetchedNotebook) => {
        resolve(fetchedNotebook);
      })
      .catch(reject);
  });

export const updateNotebook = (
  existingNotebook: NotebookKind,
  assignableData: StartNotebookData,
  username: string,
  opts?: K8sAPIOptions,
): Promise<NotebookKind> => {
  const notebook = assembleNotebook(assignableData, username);
  const oldNotebook = structuredClone(existingNotebook);
  const container = oldNotebook.spec.template.spec.containers[0];

  // clean the envFrom array in case of merging the old value again
  container.envFrom = [];
  // clean the resources, affinity and tolerations for accelerator
  oldNotebook.spec.template.spec.tolerations = [];
  oldNotebook.spec.template.spec.affinity = {};
  oldNotebook.spec.template.spec.nodeSelector = {};
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

export const mergePatchUpdateNotebook = (
  existingNotebook: NotebookKind,
  assignableData: StartNotebookData,
  username: string,
  opts?: K8sAPIOptions,
): Promise<NotebookKind> => {
  const notebook = assembleNotebook(assignableData, username, undefined);

  // Remove old node selector keys in merge patch
  const oldNodeSelectorToRemove: Record<string, string | null> = {};
  for (const key of Object.keys(existingNotebook.spec.template.spec.nodeSelector || {})) {
    oldNodeSelectorToRemove[key] = null;
  }

  const resource: NotebookKind = {
    ...notebook,
    spec: {
      ...notebook.spec,
      template: {
        ...notebook.spec.template,
        spec: {
          ...notebook.spec.template.spec,
          // Null values are required for merge patch
          // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
          nodeSelector: {
            ...oldNodeSelectorToRemove,
            ...notebook.spec.template.spec.nodeSelector,
          } as NodeSelector,
        },
      },
    },
  };

  return k8sMergePatchResource<NotebookKind>(
    applyK8sAPIOptions(
      {
        model: NotebookModel,
        resource,
      },
      opts,
    ),
  );
};

export const patchNotebookImage = (
  existingNotebook: NotebookKind,
  imageStream: ImageStreamKind,
  imageVersion: ImageStreamSpecTagType,
  opts?: K8sAPIOptions,
): Promise<NotebookKind> => {
  const imageUrl = `${imageStream.status?.dockerImageRepository ?? ''}:${imageVersion.name}`;
  const imageSelection = `${imageStream.metadata.name}:${imageVersion.name}`;
  const patches: Patch[] = [
    {
      op: 'replace',
      path: '/metadata/annotations/notebooks.opendatahub.io~1last-image-selection',
      value: imageSelection,
    },
    {
      op: 'replace',
      path: '/spec/template/spec/containers/0/image',
      value: imageUrl,
    },
    {
      op: 'replace',
      path: '/spec/template/spec/containers/0/env/1/value',
      value: imageUrl,
    },
  ];

  patches.push({
    op: existingNotebook.metadata.annotations?.[
      'notebooks.opendatahub.io/last-image-version-git-commit-selection'
    ]
      ? 'replace'
      : 'add',
    path: '/metadata/annotations/notebooks.opendatahub.io~1last-image-version-git-commit-selection',
    value: imageVersion.annotations?.['opendatahub.io/notebook-build-commit'],
  });

  return k8sPatchResource<NotebookKind>(
    applyK8sAPIOptions(
      {
        model: NotebookModel,
        queryOptions: {
          name: existingNotebook.metadata.name,
          ns: existingNotebook.metadata.namespace,
        },
        patches,
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
  mountPath: string,
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
      value: { mountPath, name: pvcName },
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

export const updateNotebookPVC = (
  notebookName: string,
  namespace: string,
  mountPath: string,
  pvcName: string,
  opts?: K8sAPIOptions,
): Promise<NotebookKind> =>
  new Promise((resolve, reject) => {
    getNotebook(notebookName, namespace)
      .then((notebook) => {
        const volumes = notebook.spec.template.spec.volumes || [];
        const volumeMounts = notebook.spec.template.spec.containers[0].volumeMounts || [];

        const filteredVolumeMounts = volumeMounts.map((volumeMount) => {
          if (volumeMount.name === pvcName) {
            return { ...volumeMount, mountPath };
          }
          return volumeMount;
        });

        const patches: Patch[] = [
          {
            op: 'replace',
            path: '/spec/template/spec/volumes',
            value: volumes,
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

export const restartNotebook = (
  notebookName: string,
  namespace: string,
  opts?: K8sAPIOptions,
): Promise<NotebookKind> => {
  const patches: Patch[] = [
    {
      op: 'add',
      path: '/metadata/annotations/notebooks.opendatahub.io~1notebook-restart',
      value: 'true',
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
