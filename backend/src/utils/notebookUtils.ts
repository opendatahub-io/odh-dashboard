import { getDashboardConfig } from './resourceUtils';
import {
  EnvironmentVariable,
  ImageInfo,
  ImageTag,
  KubeFastifyInstance,
  LIMIT_NOTEBOOK_IMAGE_GPU,
  Notebook,
  NotebookAffinity,
  NotebookData,
  NotebookList,
  NotebookResources,
  NotebookSize,
  NotebookToleration,
  NotebookTolerationSettings,
  RecursivePartial,
  Route,
  VolumeMount,
} from '../types';
import { getUserName, usernameTranslate } from './userUtils';
import { createCustomError } from './requestUtils';
import {
  PatchUtils,
  V1PersistentVolumeClaim,
  V1Role,
  V1RoleBinding,
} from '@kubernetes/client-node';
import { DEFAULT_NOTEBOOK_SIZES, DEFAULT_PVC_SIZE, MOUNT_PATH } from './constants';
import { FastifyRequest } from 'fastify';
import { verifyEnvVars } from './envUtils';
import { getImageInfo } from '../routes/api/images/imageUtils';

export const generateNotebookNameFromUsername = (username: string): string =>
  `jupyter-nb-${usernameTranslate(username)}`;

export const generatePvcNameFromUsername = (username: string): string =>
  `jupyterhub-nb-${usernameTranslate(username)}-pvc`;

export const generateEnvVarFileNameFromUsername = (username: string): string =>
  `jupyterhub-singleuser-profile-${usernameTranslate(username)}-envs`;

export const getNamespaces = (
  fastify: KubeFastifyInstance,
): { dashboardNamespace: string; notebookNamespace: string } => {
  const config = getDashboardConfig();
  const notebookNamespace = config.spec.notebookController?.notebookNamespace;
  const fallbackNamespace = config.metadata.namespace || fastify.kube.namespace;

  return {
    notebookNamespace: notebookNamespace || fallbackNamespace,
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

const getNotebookSize = (notebookSizeName: string): NotebookSize => {
  const sizes = getDashboardConfig().spec?.notebookSizes || DEFAULT_NOTEBOOK_SIZES;

  const size = sizes.find((size) => size.name === notebookSizeName);

  if (!size) {
    throw Error(`Error getting notebook size for ${notebookSizeName}`);
  }

  return size;
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
  tolerationSettings: NotebookTolerationSettings,
): Promise<Notebook> => {
  const { notebookSizeName, imageName, imageTagName, gpus, envVars } = data;

  const notebookSize = getNotebookSize(notebookSizeName);

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
        e.response?.data?.message || e.message
      }`,
    );
  }

  const volumes = [{ name: pvcName, persistentVolumeClaim: { claimName: pvcName } }];
  const volumeMounts: VolumeMount[] = [{ mountPath: MOUNT_PATH, name: pvcName }];

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
        'notebooks.opendatahub.io/oauth-logout-url': `${url}/notebookController/${translatedUsername}/home`,
        'notebooks.opendatahub.io/last-size-selection': notebookSize.name,
        'notebooks.opendatahub.io/last-image-selection': imageSelection,
        'opendatahub.io/username': username,
        'kubeflow-resource-stopped': null,
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
                  --ServerApp.tornado_settings={"user":"${translatedUsername}","hub_host":"${url}","hub_prefix":"/notebookController/${translatedUsername}"}`,
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
          tolerations,
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
  const username = request.body.username || (await getUserName(fastify, request));
  const name = generateNotebookNameFromUsername(username);
  const { notebookNamespace } = getNamespaces(fastify);

  const dateStr = new Date().toISOString().replace(/\.\d{3}Z/i, 'Z');
  const data: RecursivePartial<Notebook> = {
    metadata: { annotations: { 'kubeflow-resource-stopped': dateStr } },
  };

  const response = await fastify.kube.customObjectsApi.patchNamespacedCustomObject(
    'kubeflow.org',
    'v1',
    notebookNamespace,
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
      `Failed to generate notebook resources, ${e.response?.data?.message || e.message}`,
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
    const notebookAssembled = await generateNotebookResources(fastify, username, url, notebookData);
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
      `Failed to update notebook resources, ${e.response?.data?.message || e.message}`,
    );
    throw e;
  }
};

export const verifyResources = (resources: NotebookResources): NotebookResources => {
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
  const namespace = getNamespaces(fastify).notebookNamespace;
  const tolerationSettings =
    getDashboardConfig().spec.notebookController?.notebookTolerationSettings;

  // generate pvc
  try {
    await fastify.kube.coreV1Api.readNamespacedPersistentVolumeClaim(pvcName, namespace);
  } catch (e) {
    if (e.statusCode === 404) {
      await createPvc(fastify, namespace, pvcName);
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
    tolerationSettings,
  );
};

const createPvc = async (
  fastify: KubeFastifyInstance,
  namespace: string,
  pvcName: string,
): Promise<V1PersistentVolumeClaim> => {
  const pvcSize = getDashboardConfig().spec?.notebookController?.pvcSize ?? DEFAULT_PVC_SIZE;
  const pvc = assemblePvc(pvcName, namespace, pvcSize);

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
  },
  status: {
    phase: 'Pending',
  },
});
