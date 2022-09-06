import {
  KubeFastifyInstance,
  Notebook,
  NotebookList,
  NotebookResources,
  Route,
} from '../../../types';
import { PatchUtils, V1PodList, V1Role, V1RoleBinding } from '@kubernetes/client-node';
import { FastifyRequest } from 'fastify';
import { createCustomError } from '../../../utils/requestUtils';
import { getUserName } from '../../../utils/userUtils';
import { RecursivePartial } from '../../../typeHelpers';

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
): Promise<Notebook> => {
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
      return !!pods.find((pod) => pod.status.phase === 'Running');
    });
};

export const verifyResources = (resources: NotebookResources): NotebookResources => {
  if (resources.requests && !resources.limits) {
    resources.limits = resources.requests;
  }

  //TODO: verify if resources can fit on node

  return resources;
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
  const notebookData = request.body;
  const notebookName = notebookData.metadata.name;
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

  await fastify.kube.customObjectsApi
    .createNamespacedCustomObject('kubeflow.org', 'v1', namespace, 'notebooks', notebookData)
    .catch((res) => {
      const e = res.body;
      const error = createCustomError('Error creating Notebook Custom Resource', e.message, e.code);
      fastify.log.error(error);
      throw error;
    });

  await createRBAC(fastify, request, namespace, notebookData).catch((res) => {
    const e = res.body;
    const error = createCustomError('Error creating Notebook RBAC', e.message, e.code);
    fastify.log.error(error);
    throw error;
  });

  await new Promise((r) => setTimeout(r, 500));
  const route = await fastify.kube.customObjectsApi
    .getNamespacedCustomObject('route.openshift.io', 'v1', namespace, 'routes', notebookName)
    .then((response) => response.body as Route)
    .catch((res) => {
      const e = res.body;
      const error = createCustomError('Error fetching Notebook Route', e.message, e.code);
      fastify.log.error(error);
      throw error;
    });

  const patch: RecursivePartial<Notebook> = {
    metadata: {
      annotations: {
        'opendatahub.io/link': `https://${route.spec.host}/notebook/${namespace}/${notebookName}`,
      },
    },
  };

  return await patchNotebook(fastify, patch, namespace, notebookName).catch((res) => {
    const e = res.body;
    const error = createCustomError('Error adding route data to Notebook', e.message, e.code);
    fastify.log.error(error);
    throw error;
  });
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
