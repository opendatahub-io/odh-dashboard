import {
  KubeFastifyInstance,
  Notebook,
  NotebookList,
  NotebookResources,
  Route,
} from '../../../types';
import { PatchUtils, V1Role, V1RoleBinding } from '@kubernetes/client-node';
import { FastifyRequest } from 'fastify';
import { createCustomError } from '../../../utils/requestUtils';
import createHttpError from 'http-errors';
import { getUserName } from '../../../utils/userUtils';

export const getNotebooks = async (
  fastify: KubeFastifyInstance,
  namespace: string,
  labels: string,
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

export const verifyResources = (resources: NotebookResources): NotebookResources => {
  if (resources.requests && !resources.limits) {
    resources.limits = resources.requests;
  }

  //TODO: verify if resources can fit on node

  return resources;
};

export const postNotebook = async (
  fastify: KubeFastifyInstance,
  request: FastifyRequest<{
    Params: {
      projectName: string;
    };
    Body: Notebook;
  }>,
): Promise<Notebook> => {
  const namespace = request.params.projectName;
  const notebookData = request.body;
  const notebookName = notebookData.metadata.name;
  notebookData.metadata.namespace = namespace;

  if (!notebookData?.metadata?.annotations) {
    notebookData.metadata.annotations = {};
  }

  notebookData.metadata.annotations['notebooks.opendatahub.io/inject-oauth'] = 'true';
  const notebookContainers = notebookData.spec.template.spec.containers;

  if (!notebookContainers[0]) {
    const error: createHttpError.HttpError<500> = createCustomError(
      'missing notebook containers',
      'No containers found in posted notebook.',
    );
    fastify.log.error(error.message);
    throw error;
  }

  notebookContainers[0].env.push({ name: 'JUPYTER_NOTEBOOK_PORT', value: '8888' });
  notebookContainers[0].resources = verifyResources(notebookContainers[0].resources);

  await fastify.kube.customObjectsApi
    .createNamespacedCustomObject('kubeflow.org', 'v1', namespace, 'notebooks', notebookData)
    .catch((e) => {
      const error: createHttpError.HttpError<500> = createCustomError(
        'error creating Notebook Custom Resource',
        `Error, failed to create Notebook Custom Resource. ${e.toString()}`,
      );
      fastify.log.error(
        `Error creating Notebook Custom Resource for ${notebookName}, ${e.toString()}`,
      );
      throw error;
    });

  await createRBAC(fastify, request, namespace, notebookData).catch((e) => {
    const error: createHttpError.HttpError<500> = createCustomError(
      'error creating Notebook RBAC',
      'Error, failed to create Notebook RBAC.',
    );
    fastify.log.error(`Error creating Notebook RBAC for ${notebookName}, ${e.toString()}`);
    throw error;
  });

  await new Promise((r) => setTimeout(r, 500));
  const getRouteResponse = await fastify.kube.customObjectsApi.getNamespacedCustomObject(
    'route.openshift.io',
    'v1',
    namespace,
    'routes',
    notebookName,
  );

  const route = getRouteResponse.body as Route;

  const patch = {
    metadata: {
      annotations: {
        'opendatahub.io/link': `https://${route.spec.host}/notebook/${namespace}/${notebookName}`,
      },
    },
  };

  const patchNotebookResponse = await patchNotebook(fastify, patch, namespace, notebookName).catch(
    (e) => {
      const error: createHttpError.HttpError<500> = createCustomError(
        'error patching Notebook route',
        'Error, failed to patch Notebook route.',
      );
      fastify.log.error(`Error patching Notebook route for ${notebookName}, ${e.toString()}`);
      throw error;
    },
  );
  return patchNotebookResponse;
};

export const patchNotebook = async (
  fastify: KubeFastifyInstance,
  request: { stopped: boolean } | any,
  namespace: string,
  notebookName: string,
): Promise<Notebook> => {
  let patch;
  const options = {
    headers: { 'Content-type': PatchUtils.PATCH_FORMAT_JSON_MERGE_PATCH },
  };
  if (request.stopped) {
    const dateStr = new Date().toISOString().replace(/\.\d{3}Z/i, 'Z');
    patch = { metadata: { annotations: { 'kubeflow-resource-stopped': dateStr } } };
  } else if (request.stopped === false) {
    patch = { metadata: { annotations: { 'kubeflow-resource-stopped': null } } };
  } else {
    patch = request;
  }

  const kubeResponse = await fastify.kube.customObjectsApi.patchNamespacedCustomObject(
    'kubeflow.org',
    'v1',
    namespace,
    'notebooks',
    notebookName,
    patch,
    undefined,
    undefined,
    undefined,
    options,
  );
  return kubeResponse.body as Notebook;
};

export const deleteNotebook = async (
  fastify: KubeFastifyInstance,
  request: FastifyRequest<{
    Params: {
      projectName: string;
      notebookName: string;
    };
  }>,
): Promise<Record<string, unknown>> => {
  const namespace = request.params.projectName;
  const notebookName = request.params.notebookName;

  try {
    await fastify.kube.rbac.deleteNamespacedRole(`${notebookName}-notebook-view`, namespace);
    await fastify.kube.rbac.deleteNamespacedRoleBinding(`${notebookName}-notebook-view`, namespace);
  } catch (e) {
    const error: createHttpError.HttpError<500> = createCustomError(
      'error deleting Notebook RBAC',
      'Error, failed to delete Notebook RBAC.',
    );
    fastify.log.error(`Error deleting Notebook RBAC for ${notebookName}, ${e.toString()}`);
    throw error;
  }

  try {
    const deletedCR = await fastify.kube.customObjectsApi.deleteNamespacedCustomObject(
      'kubeflow.org',
      'v1',
      request.params.projectName,
      'notebooks',
      request.params.notebookName,
    );
    return deletedCR;
  } catch (e) {
    const error: createHttpError.HttpError<500> = createCustomError(
      'error deleting Notebook Custom Resource',
      'Error, failed to delete Notebook Custom Resource.',
    );
    fastify.log.error(
      `Error deleting Notebook Custom Resource for ${notebookName}, ${e.toString()}`,
    );
    throw error;
  }
};

export const createRBAC = async (
  fastify: KubeFastifyInstance,
  request: FastifyRequest<{
    Params: {
      projectName: string;
    };
    Body: Notebook;
  }>,
  namespace: string,
  notebookData: Notebook,
): Promise<void> => {
  const userName = await getUserName(fastify, request, fastify.kube.customObjectsApi);

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
