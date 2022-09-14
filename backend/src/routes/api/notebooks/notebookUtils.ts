import {
  KubeFastifyInstance,
  Notebook,
  NotebookList,
  NotebookResources,
  Route,
} from '../../../types';
import {
  PatchUtils,
  V1ContainerStatus,
  V1Pod,
  V1PodList,
  V1Role,
  V1RoleBinding,
} from '@kubernetes/client-node';
import { FastifyRequest } from 'fastify';
import { createCustomError } from '../../../utils/requestUtils';
import { getUserName } from '../../../utils/userUtils';
import { RecursivePartial } from '../../../typeHelpers';
import { sanitizeNotebookForSecurity } from '../../../utils/route-security';

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
  notebookName: string,
): Promise<Notebook | null> => {
  try {
    const kubeResponse = await fastify.kube.customObjectsApi.getNamespacedCustomObject(
      'kubeflow.org',
      'v1',
      namespace,
      'notebooks',
      notebookName,
    );
    return kubeResponse.body as Notebook;
  } catch (e) {
    if (e.response?.statusCode === 404) {
      return null;
    }
    throw e;
  }
};

const checkPodContainersReady = (pod: V1Pod): boolean => {
  const containerStatuses: V1ContainerStatus[] = pod.status?.containerStatuses || [];
  if (containerStatuses.length === 0) {
    return false;
  }
  return containerStatuses.every(
    (containerStatus) => containerStatus.ready && containerStatus.state?.running,
  );
};

export const getNotebookStatus = async (
  fastify: KubeFastifyInstance,
  namespace: string,
  notebookName: string,
): Promise<boolean> => {
  return fastify.kube.coreV1Api
    .listNamespacedPod(
      namespace,
      undefined,
      undefined,
      undefined,
      undefined,
      `notebook-name=${notebookName}`,
    )
    .then((response) => {
      const pods = (response.body as V1PodList).items;
      return pods.some((pod) => checkPodContainersReady(pod));
    });
};

export const verifyResources = (resources: NotebookResources): NotebookResources => {
  if (resources.requests && !resources.limits) {
    resources.limits = resources.requests;
  }

  //TODO: verify if resources can fit on node

  return resources;
};

export const patchNotebookRoute = async (
  fastify: KubeFastifyInstance,
  route: Route,
  namespace: string,
  notebookName: string,
): Promise<Notebook> => {
  const patch: RecursivePartial<Notebook> = {
    metadata: {
      annotations: {
        'opendatahub.io/link': `https://${route.spec.host}/notebook/${namespace}/${notebookName}`,
      },
    },
  };

  return await patchNotebook(fastify, patch, namespace, notebookName).catch((res) => {
    const e = res.response.body;
    const error = createCustomError('Error adding route data to Notebook', e.message, e.code);
    fastify.log.error(error);
    throw error;
  });
};

export const createNotebook = async (
  fastify: KubeFastifyInstance,
  request: FastifyRequest<{
    Params: {
      namespace: string;
    };
    Body: Notebook;
  }>,
): Promise<Notebook> => {
  const namespace = request.params.namespace;
  const notebookData = await sanitizeNotebookForSecurity<Notebook>(fastify, request, request.body);
  notebookData.metadata.namespace = namespace;

  if (!notebookData?.metadata?.annotations) {
    notebookData.metadata.annotations = {};
  }

  notebookData.metadata.annotations['notebooks.opendatahub.io/inject-oauth'] = 'true';
  const notebookContainers = notebookData.spec.template.spec.containers;

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

  const notebook = await fastify.kube.customObjectsApi
    .createNamespacedCustomObject('kubeflow.org', 'v1', namespace, 'notebooks', notebookData)
    .then((res) => res.body as Notebook)
    .catch((res) => {
      const e = res.response.body;
      const error = createCustomError('Error creating Notebook Custom Resource', e.message, e.code);
      fastify.log.error(error);
      throw error;
    });

  await createRBAC(fastify, request, namespace, notebookData).catch((res) => {
    const e = res.response.body;
    if (e.code === 409) {
      // Conflict on a deterministic resource does not matter
      return;
    }
    const error = createCustomError('Error creating Notebook RBAC', e.message, e.code);
    fastify.log.error(error);
    throw error;
  });

  return notebook;
};

export const patchNotebook = async (
  fastify: KubeFastifyInstance,
  patchData: RecursivePartial<Notebook>,
  namespace: string,
  notebookName: string,
): Promise<Notebook> => {
  return fastify.kube.customObjectsApi
    .patchNamespacedCustomObject(
      'kubeflow.org',
      'v1',
      namespace,
      'notebooks',
      notebookName,
      patchData,
      undefined,
      undefined,
      undefined,
      {
        headers: { 'Content-type': PatchUtils.PATCH_FORMAT_JSON_MERGE_PATCH },
      },
    )
    .then((response) => response.body as Notebook);
};

export const createRBAC = async (
  fastify: KubeFastifyInstance,
  request: FastifyRequest<{
    Params: {
      namespace: string;
    };
    Body: Notebook;
  }>,
  namespace: string,
  notebookData: Notebook,
): Promise<void> => {
  const userName = await getUserName(fastify, request);

  const notebookRole: V1Role = {
    apiVersion: 'rbac.authorization.k8s.io/v1',
    kind: 'Role',
    metadata: {
      name: `${notebookData.metadata.name}-notebook-view`,
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
        name: userName,
      },
    ],
  };

  await fastify.kube.rbac.createNamespacedRole(namespace, notebookRole);
  await fastify.kube.rbac.createNamespacedRoleBinding(namespace, notebookRoleBinding);
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
