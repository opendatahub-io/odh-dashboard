import { getClusterStatus, getDashboardConfig } from './resourceUtils';
import { mergeWith } from 'lodash';
import {
  BYONImagePackage,
  ContainerResources,
  EnvironmentVariable,
  ImageInfo,
  ImageStream,
  ImageStreamTag,
  ImageTag,
  ImageTagInfo,
  KubeFastifyInstance,
  Notebook,
  NotebookData,
  NotebookList,
  RecursivePartial,
  Route,
  TagContent,
  VolumeMount,
} from '../types';
import { getUserInfo, usernameTranslate } from './userUtils';
import { createCustomError } from './requestUtils';
import {
  PatchUtils,
  V1PersistentVolumeClaim,
  V1Role,
  V1RoleBinding,
} from '@kubernetes/client-node';
import { DEFAULT_PVC_SIZE, IMAGE_ANNOTATIONS, MOUNT_PATH } from './constants';
import { FastifyRequest } from 'fastify';
import { verifyEnvVars } from './envUtils';
import { smartMergeArraysWithNameObjects } from './objUtils';

export const generateNotebookNameFromUsername = (username: string): string =>
  `jupyter-nb-${usernameTranslate(username)}`;

export const generatePvcNameFromUsername = (username: string): string =>
  `jupyterhub-nb-${usernameTranslate(username)}-pvc`;

export const generateEnvVarFileNameFromUsername = (username: string): string =>
  `jupyterhub-singleuser-profile-${usernameTranslate(username)}-envs`;

export const getWorkbenchNamespace = (fastify: KubeFastifyInstance): string => {
  try {
    const clusterStatus = getClusterStatus(fastify);
    const workbenchNamespace = clusterStatus?.components?.workbenches?.workbenchNamespace;

    if (!workbenchNamespace) {
      fastify.log.warn(
        'Workbench namespace not found in cluster status, will fall back to dashboard namespace',
      );
    }

    return workbenchNamespace;
  } catch (error) {
    fastify.log.error(error, 'Failed to fetch cluster status for workbench namespace:');
    return undefined;
  }
};

export const getNamespaces = (
  fastify: KubeFastifyInstance,
): { dashboardNamespace: string; workbenchNamespace: string } => {
  const config = getDashboardConfig();
  const workbenchNamespace = getWorkbenchNamespace(fastify);
  const fallbackNamespace = config.metadata.namespace || fastify.kube.namespace;

  return {
    workbenchNamespace: workbenchNamespace || fallbackNamespace,
    dashboardNamespace: fallbackNamespace,
  };
};

export const getRoute = async (
  fastify: KubeFastifyInstance,
  namespace: string,
  routeName: string,
): Promise<Route> => {
  const kubeResponse = await fastify.kube.customObjectsApi
    .getNamespacedCustomObject('route.openshift.io', 'v1', namespace, 'routes', routeName)
    .catch((res) => {
      const e = res.response.body;
      const error = createCustomError('Error getting Route', e.message, e.code);
      fastify.log.error(error);
      throw error;
    });
  return kubeResponse.body as Route;
};

export const createRBAC = async (
  fastify: KubeFastifyInstance,
  namespace: string,
  notebookData: Notebook,
  username: string,
): Promise<void> => {
  const notebookRole: V1Role = {
    apiVersion: 'rbac.authorization.k8s.io/v1',
    kind: 'Role',
    metadata: {
      name: `${notebookData.metadata.name}-notebook-view`,
      labels: {
        'opendatahub.io/dashboard': 'true',
      },
    },
    rules: [
      {
        apiGroups: ['kubeflow.org'],
        resources: ['notebooks'],
        resourceNames: [`${notebookData.metadata.name}`],
        verbs: ['get'],
      },
    ],
  };

  const notebookRoleBinding: V1RoleBinding = {
    apiVersion: 'rbac.authorization.k8s.io/v1',
    kind: 'RoleBinding',
    metadata: {
      name: `${notebookData.metadata.name}-notebook-view`,
      labels: {
        'opendatahub.io/dashboard': 'true',
      },
    },
    roleRef: {
      apiGroup: 'rbac.authorization.k8s.io',
      kind: 'Role',
      name: `${notebookData.metadata.name}-notebook-view`,
    },
    subjects: [
      {
        apiGroup: 'rbac.authorization.k8s.io',
        kind: 'User',
        name: username,
      },
    ],
  };

  await fastify.kube.rbac.createNamespacedRole(namespace, notebookRole);
  await fastify.kube.rbac.createNamespacedRoleBinding(namespace, notebookRoleBinding);
};

const getImageTag = (image: ImageInfo, imageTagName: string): ImageTag => {
  const tag = image.tags.find((tag) => tag.name === imageTagName);

  if (!tag) {
    throw Error(`Error getting image tag for image ${image.name}`);
  }

  return {
    image,
    tag,
  };
};

export const assembleNotebook = async (
  fastify: KubeFastifyInstance,
  data: NotebookData,
  username: string,
  url: string,
  name: string,
  namespace: string,
  pvcName: string,
  envName: string,
): Promise<Notebook> => {
  const { imageName, imageTagName, envVars, podSpecOptions } = data;

  let imageUrl = ``;
  let imageSelection = ``;

  try {
    const image = await getImageInfo(fastify, imageName);

    const selectedImage = getImageTag(image, imageTagName);

    imageUrl = `${selectedImage.image?.dockerImageRepo}:${selectedImage.tag?.name}`;
    imageSelection = `${selectedImage.image?.name}:${selectedImage.tag?.name}`;
  } catch (e) {
    fastify.log.error(`Error getting the image for ${imageName}:${imageTagName}`);
    throw Error(
      `Error getting the image for ${imageName}:${imageTagName}, ${
        e.response?.body?.message || e.message
      }`,
    );
  }

  const volumes = [
    { name: pvcName, persistentVolumeClaim: { claimName: pvcName } },
    { name: 'shm', emptyDir: { medium: 'Memory' } },
  ];
  const volumeMounts: VolumeMount[] = [
    { mountPath: MOUNT_PATH, name: pvcName },
    { mountPath: '/dev/shm', name: 'shm' },
  ];

  const {
    resources,
    tolerations,
    affinity,
    nodeSelector,
    selectedAcceleratorProfile,
    selectedHardwareProfile,
    lastSizeSelection,
  } = podSpecOptions;

  const translatedUsername = usernameTranslate(username);

  const configMapEnvs = Object.keys(envVars.configMap).map<EnvironmentVariable>((key) => ({
    name: key,
    valueFrom: {
      configMapKeyRef: {
        key,
        name: envName,
      },
    },
  }));

  const secretEnvs = Object.keys(envVars.secrets).map<EnvironmentVariable>((key) => ({
    name: key,
    valueFrom: {
      secretKeyRef: {
        key,
        name: envName,
      },
    },
  }));

  return {
    apiVersion: 'kubeflow.org/v1',
    kind: 'Notebook',
    metadata: {
      labels: {
        app: name,
        'opendatahub.io/odh-managed': 'true',
        'opendatahub.io/user': translatedUsername,
        'opendatahub.io/dashboard': 'true',
      },
      annotations: {
        'notebooks.opendatahub.io/oauth-logout-url': `${url}/notebook-controller/${translatedUsername}/home`,
        'notebooks.opendatahub.io/last-size-selection': lastSizeSelection,
        'notebooks.opendatahub.io/last-image-selection': imageSelection,
        'opendatahub.io/username': username,
        'kubeflow-resource-stopped': null,
        'opendatahub.io/accelerator-name': selectedAcceleratorProfile?.metadata.name || '',
        'opendatahub.io/hardware-profile-name': selectedHardwareProfile?.metadata.name || '',
        'opendatahub.io/hardware-profile-namespace':
          selectedHardwareProfile?.metadata.namespace || '',
      },
      name: name,
      namespace: namespace,
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
              name: name,
              env: [
                {
                  name: 'NOTEBOOK_ARGS',
                  value: `--ServerApp.port=8888
                  --ServerApp.token=''
                  --ServerApp.password=''
                  --ServerApp.base_url=/notebook/${namespace}/${name}
                  --ServerApp.quit_button=False
                  --ServerApp.tornado_settings={"user":"${translatedUsername}","hub_host":"${url}","hub_prefix":"/notebook-controller/${translatedUsername}"}`,
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
                  path: `/notebook/${namespace}/${name}/api`,
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
                  path: `/notebook/${namespace}/${name}/api`,
                  port: 'notebook-port',
                },
              },
            },
          ],
          volumes,
          tolerations: !selectedHardwareProfile ? tolerations : null,
          nodeSelector: !selectedHardwareProfile ? nodeSelector : null,
        },
      },
    },
  };
};

export const getNotebooks = async (
  fastify: KubeFastifyInstance,
  namespace: string,
  labels?: string,
): Promise<NotebookList> => {
  const kubeResponse = await fastify.kube.customObjectsApi.listNamespacedCustomObject(
    'kubeflow.org',
    'v1',
    namespace,
    'notebooks',
    undefined,
    undefined,
    undefined,
    labels,
  );
  return kubeResponse.body as NotebookList;
};

export const getNotebook = async (
  fastify: KubeFastifyInstance,
  namespace: string,
  name: string,
): Promise<Notebook> => {
  const kubeResponse = await fastify.kube.customObjectsApi.getNamespacedCustomObject(
    'kubeflow.org',
    'v1',
    namespace,
    'notebooks',
    name,
  );
  return kubeResponse.body as Notebook;
};

export const stopNotebook = async (
  fastify: KubeFastifyInstance,
  request: FastifyRequest<{
    Body: NotebookData;
  }>,
): Promise<Notebook> => {
  const username = request.body.username || (await getUserInfo(fastify, request)).userName;
  const name = generateNotebookNameFromUsername(username);
  const { workbenchNamespace } = getNamespaces(fastify);

  const dateStr = new Date().toISOString().replace(/\.\d{3}Z/i, 'Z');
  const data: RecursivePartial<Notebook> = {
    metadata: { annotations: { 'kubeflow-resource-stopped': dateStr } },
  };

  const response = await fastify.kube.customObjectsApi.patchNamespacedCustomObject(
    'kubeflow.org',
    'v1',
    workbenchNamespace,
    'notebooks',
    name,
    data,
    undefined,
    undefined,
    undefined,
    {
      headers: { 'Content-type': PatchUtils.PATCH_FORMAT_JSON_MERGE_PATCH },
    },
  );

  return response.body as Notebook;
};

export const createNotebook = async (
  fastify: KubeFastifyInstance,
  username: string,
  url: string,
  notebookData?: NotebookData,
): Promise<Notebook> => {
  if (!notebookData) {
    const error = createCustomError(
      'Missing Notebook',
      'Request body malformed, missing notebook',
      400,
    );
    fastify.log.error(error.message);
    throw error;
  }

  let notebookAssembled: Notebook;

  try {
    notebookAssembled = await generateNotebookResources(fastify, username, url, notebookData);
  } catch (e) {
    fastify.log.error(
      `Failed to generate notebook resources, ${e.response?.body?.message || e.message}`,
    );
    throw e;
  }

  if (!notebookAssembled?.metadata?.annotations) {
    notebookAssembled.metadata.annotations = {};
  }

  notebookAssembled.metadata.annotations['notebooks.opendatahub.io/inject-oauth'] = 'true';
  const notebookContainers = notebookAssembled.spec.template.spec.containers;

  if (!notebookContainers[0]) {
    const error = createCustomError(
      'Missing notebook containers',
      'No containers found in posted notebook.',
      400,
    );
    fastify.log.error(error);
    throw error;
  }

  notebookContainers[0].env.push({ name: 'JUPYTER_NOTEBOOK_PORT', value: '8888' });
  notebookContainers[0].resources = verifyResources(notebookContainers[0].resources);

  let notebook: Notebook;
  try {
    const response = await fastify.kube.customObjectsApi.createNamespacedCustomObject(
      'kubeflow.org',
      'v1',
      notebookAssembled.metadata.namespace,
      'notebooks',
      notebookAssembled,
    );
    notebook = response.body as Notebook;
  } catch (e) {
    const error = e.response.body;
    const customError = createCustomError(
      'Error creating Notebook Custom Resource',
      error.message,
      error.code,
    );
    fastify.log.error(customError);
    throw customError;
  }

  try {
    await createRBAC(fastify, notebookAssembled.metadata.namespace, notebookAssembled, username);
  } catch (e) {
    if (e.statusCode === 409) {
      // Conflict, we likely have one already -- just continue
      fastify.log.warn(
        'Requested to recreate RBAC piece of create Notebook. Got a conflict, assuming it is already there and letting the flow continue.',
      );
    } else {
      const error = e.response.body;
      const customError = createCustomError(
        'Error creating Notebook RBAC',
        error.message,
        error.code,
      );
      fastify.log.error(customError);
      throw customError;
    }
  }

  return notebook;
};

export const updateNotebook = async (
  fastify: KubeFastifyInstance,
  username: string,
  url: string,
  notebookData: NotebookData,
  oldNotebook: Notebook,
): Promise<Notebook> => {
  if (!notebookData) {
    const error = createCustomError(
      'Missing Notebook',
      'Request body malformed, missing notebook',
      400,
    );
    fastify.log.error(error.message);
    throw error;
  }
  try {
    const serverNotebook = await generateNotebookResources(fastify, username, url, notebookData);

    // Fix for Workbench Certs that get overridden
    // We are intentionally applying on some details as to avoid implementing logic to properly
    // manage the notebook the same way as workbench
    const importantOldNotebookDetails: RecursivePartial<Notebook> = {
      spec: {
        template: {
          spec: {
            containers: [
              {
                // Drop all env vars we added in the past, because we will just add them back if they are still there
                env: oldNotebook.spec.template.spec.containers[0].env.filter(({ valueFrom }) => {
                  if (!valueFrom) {
                    return true;
                  } else {
                    const value = valueFrom.secretKeyRef ?? valueFrom.configMapKeyRef;
                    return !value?.name?.startsWith('jupyterhub-singleuser-profile');
                  }
                }),
                volumeMounts: oldNotebook.spec.template.spec.containers[0].volumeMounts,
              },
            ],
            volumes: oldNotebook.spec.template.spec.volumes,
          },
        },
      },
    };

    const notebookAssembled = mergeWith(
      {},
      importantOldNotebookDetails,
      serverNotebook,
      smartMergeArraysWithNameObjects,
    );

    const response = await fastify.kube.customObjectsApi.patchNamespacedCustomObject(
      'kubeflow.org',
      'v1',
      notebookAssembled.metadata.namespace,
      'notebooks',
      notebookAssembled.metadata.name,
      notebookAssembled,
      undefined,
      undefined,
      undefined,
      {
        headers: { 'Content-type': PatchUtils.PATCH_FORMAT_JSON_MERGE_PATCH },
      },
    );
    return response.body as Notebook;
  } catch (e) {
    fastify.log.error(
      `Failed to update notebook resources, ${e.response?.body?.message || e.message}`,
    );
    throw e;
  }
};

export const verifyResources = (resources: ContainerResources): ContainerResources => {
  if (resources.requests && !resources.limits) {
    resources.limits = resources.requests;
  }

  //TODO: verify if resources can fit on node

  return resources;
};

const generateNotebookResources = async (
  fastify: KubeFastifyInstance,
  username: string,
  url: string,
  notebookData: NotebookData,
): Promise<Notebook> => {
  const name = generateNotebookNameFromUsername(username);
  const pvcName = generatePvcNameFromUsername(username);
  const envName = generateEnvVarFileNameFromUsername(username);
  const namespace = getNamespaces(fastify).workbenchNamespace;

  // generate pvc
  try {
    await fastify.kube.coreV1Api.readNamespacedPersistentVolumeClaim(pvcName, namespace);
  } catch (e) {
    if (e.statusCode === 404) {
      await createPvc(fastify, namespace, pvcName, notebookData.storageClassName);
    } else {
      throw e;
    }
  }

  //generate env variables
  await verifyEnvVars(fastify, namespace, envName, notebookData.envVars);
  return await assembleNotebook(
    fastify,
    notebookData,
    username,
    url,
    name,
    namespace,
    pvcName,
    envName,
  );
};

const createPvc = async (
  fastify: KubeFastifyInstance,
  namespace: string,
  pvcName: string,
  storageClassName?: string,
): Promise<V1PersistentVolumeClaim> => {
  const pvcSize = getDashboardConfig().spec?.notebookController?.pvcSize ?? DEFAULT_PVC_SIZE;
  const preferredStorageClassName =
    getDashboardConfig().spec.notebookController?.storageClassName ?? storageClassName;
  const pvc = assemblePvc(pvcName, namespace, pvcSize, preferredStorageClassName);

  try {
    const pvcResponse = await fastify.kube.coreV1Api.createNamespacedPersistentVolumeClaim(
      namespace,
      pvc,
    );
    return pvcResponse.body;
  } catch (e) {
    throw Error(`PVC ${pvcName} could not be read, ${e.response?.body?.message || e.message || e}`);
  }
};

const assemblePvc = (
  pvcName: string,
  namespace: string,
  pvcSize: string,
  storageClassName?: string,
): V1PersistentVolumeClaim => ({
  apiVersion: 'v1',
  kind: 'PersistentVolumeClaim',
  metadata: {
    name: pvcName,
    namespace,
    labels: {
      'opendatahub.io/dashboard': 'true',
    },
  },
  spec: {
    accessModes: ['ReadWriteOnce'],
    resources: {
      requests: {
        storage: pvcSize,
      },
    },
    volumeMode: 'Filesystem',
    storageClassName,
  },
  status: {
    phase: 'Pending',
  },
});

const getImage = async (fastify: KubeFastifyInstance, imageName: string): Promise<ImageStream> => {
  return fastify.kube.customObjectsApi
    .getNamespacedCustomObject(
      'image.openshift.io',
      'v1',
      fastify.kube.namespace,
      'imagestreams',
      imageName,
    )
    .then((res) => {
      return res.body as ImageStream;
    });
};

export const getImageInfo = async (
  fastify: KubeFastifyInstance,
  imageName: string,
): Promise<ImageInfo> => {
  return getImage(fastify, imageName).then((res) => {
    return processImageInfo(res);
  });
};

export const processImageInfo = (imageStream: ImageStream): ImageInfo => {
  const annotations = imageStream.metadata.annotations || {};

  const imageInfo: ImageInfo = {
    name: imageStream.metadata.name,
    description: annotations[IMAGE_ANNOTATIONS.DESC] || '',
    url: annotations[IMAGE_ANNOTATIONS.URL] || '',
    display_name: annotations[IMAGE_ANNOTATIONS.DISP_NAME] || imageStream.metadata.name,
    tags: getTagInfo(imageStream),
    order: +annotations[IMAGE_ANNOTATIONS.IMAGE_ORDER] || 100,
    dockerImageRepo: imageStream.status?.dockerImageRepository || '',
    error: isBYONImage(imageStream) && getBYONImageErrorMessage(imageStream),
  };

  return imageInfo;
};

const getTagInfo = (imageStream: ImageStream): ImageTagInfo[] => {
  const tagInfoArray: ImageTagInfo[] = [];
  const tags = imageStream.spec.tags;
  if (!tags?.length) {
    console.error(`${imageStream.metadata.name} does not have any tags.`);
    return;
  }
  tags.forEach((tag) => {
    let tagAnnotations;
    if (tag.annotations != null) {
      tagAnnotations = tag.annotations;
    } else {
      tag.annotations = {};
      tagAnnotations = {};
    }
    if (!checkTagExistence(tag, imageStream)) {
      return; //Skip tag
    }
    if (tagAnnotations[IMAGE_ANNOTATIONS.OUTDATED]) {
      return; // tag is outdated - we want to keep it around for existing notebooks, not for new ones
    }

    const tagInfo: ImageTagInfo = {
      content: getTagContent(tag),
      name: tag.name,
      recommended: JSON.parse(tagAnnotations[IMAGE_ANNOTATIONS.RECOMMENDED] || 'false'),
      default: JSON.parse(tagAnnotations[IMAGE_ANNOTATIONS.DEFAULT] || 'false'),
    };
    tagInfoArray.push(tagInfo);
  });
  return tagInfoArray;
};

// Check for existence in status.tags
const checkTagExistence = (tag: ImageStreamTag, imageStream: ImageStream): boolean => {
  if (imageStream.status) {
    const tags = imageStream.status.tags;
    if (tags) {
      for (let i = 0; i < tags.length; i++) {
        if (tags[i].tag === tag.name) {
          return true;
        }
      }
    }
  }
  return false;
};

const getTagContent = (tag: ImageStreamTag): TagContent => {
  const content: TagContent = {
    software: jsonParsePackage(tag.annotations[IMAGE_ANNOTATIONS.SOFTWARE]),
    dependencies: jsonParsePackage(tag.annotations[IMAGE_ANNOTATIONS.DEPENDENCIES]),
  };
  return content;
};

const jsonParsePackage = (unparsedPackage: string): BYONImagePackage[] => {
  try {
    return JSON.parse(unparsedPackage) || [];
  } catch {
    return [];
  }
};

const isBYONImage = (imageStream: ImageStream) =>
  imageStream.metadata.labels?.['app.kubernetes.io/created-by'] === 'byon';

const getBYONImageErrorMessage = (imageStream: ImageStream) => {
  // there will be always only 1 tag in the spec for BYON images
  // status tags could be more than one
  const activeTag = imageStream.status?.tags?.find(
    (statusTag) => statusTag.tag === imageStream.spec.tags?.[0].name,
  );
  return activeTag?.conditions?.[0]?.message;
};
