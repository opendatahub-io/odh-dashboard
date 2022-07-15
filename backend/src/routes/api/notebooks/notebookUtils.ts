import {
  KubeFastifyInstance,
  Notebook,
  NotebookList,
  NotebookResources,
  Route,
} from '../../../types';
import { PatchUtils } from '@kubernetes/client-node';

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
  namespace: string,
  notebookData: Notebook,
): Promise<Notebook> => {
  const notebookName = notebookData.metadata.name;
  notebookData.metadata.namespace = namespace;
  if (!notebookData?.metadata?.annotations) {
    notebookData.metadata.annotations = {};
  }

  notebookData.metadata.annotations['notebooks.opendatahub.io/inject-oauth'] = 'true';
  const notebookContainers = notebookData.spec.template.spec.containers;

  if (!notebookContainers[0]) {
    console.error('No containers found in posted notebook');
  }
  notebookContainers[0].env.push({ name: 'JUPYTER_NOTEBOOK_PORT', value: '8888' });
  notebookContainers[0].imagePullPolicy = 'Always';
  notebookContainers[0].workingDir = '/opt/app-root/src';

  notebookContainers[0].resources = verifyResources(notebookContainers[0].resources);

  try {
    await fastify.kube.customObjectsApi.createNamespacedCustomObject(
      'kubeflow.org',
      'v1',
      namespace,
      'notebooks',
      notebookData,
    );
  } catch (e) {
    fastify.log.error(e.toString());
  }
  // wait until the Route is created
  await new Promise((r) => setTimeout(r, 500));
  const getRouteResponse = await fastify.kube.customObjectsApi.getNamespacedCustomObject(
    'route.openshift.io',
    'v1',
    namespace,
    'routes',
    notebookData.metadata.name,
  );

  const route = getRouteResponse.body as Route;

  const patch = {
    metadata: {
      annotations: {
        'opendatahub.io/link': `https://${route.spec.host}`,
      },
    },
  };
  const patchNotebookResponse = await patchNotebook(fastify, patch, namespace, notebookName);

  return patchNotebookResponse as Notebook;
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
