import { KubeFastifyInstance, Notebook, NotebookData, Route } from '../../../types';
import { PatchUtils, V1ContainerStatus, V1Pod, V1PodList } from '@kubernetes/client-node';
import { createCustomError } from '../../../utils/requestUtils';
import { getUserName } from '../../../utils/userUtils';
import { RecursivePartial } from '../../../typeHelpers';
import {
  createNotebook,
  generateNotebookNameFromUsername,
  getNamespaces,
  getNotebook,
  getRoute,
  updateNotebook,
} from '../../../utils/notebookUtils';
import { FastifyRequest } from 'fastify';

export const getNotebookStatus = async (
  fastify: KubeFastifyInstance,
  namespace: string,
  name: string,
): Promise<{ notebook: Notebook; isRunning: boolean; podUID: string }> => {
  const notebook = await getNotebook(fastify, namespace, name);
  const hasStopAnnotation = !!notebook?.metadata.annotations?.['kubeflow-resource-stopped'];
  const [isRunning, podUID] = hasStopAnnotation
    ? [false, '']
    : await listNotebookStatus(fastify, namespace, name);

  const notebookName = notebook?.metadata.name;
  let newNotebook: Notebook;
  if (isRunning && !notebook?.metadata.annotations?.['opendatahub.io/link']) {
    const route = await getRoute(fastify, namespace, notebookName).catch((e) => {
      fastify.log.warn(`Failed getting route ${notebookName}: ${e.message}`);
      return undefined;
    });
    if (route) {
      newNotebook = await patchNotebookRoute(fastify, route, namespace, notebookName).catch((e) => {
        fastify.log.warn(`Failed patching route to notebook ${notebookName}: ${e.message}`);
        return notebook;
      });
    }
  }

  return { notebook: newNotebook || notebook, isRunning, podUID };
};

export const listNotebookStatus = async (
  fastify: KubeFastifyInstance,
  namespace: string,
  name: string,
): Promise<[boolean, string]> => {
  const response = await fastify.kube.coreV1Api.listNamespacedPod(
    namespace,
    undefined,
    undefined,
    undefined,
    undefined,
    `notebook-name=${name}`,
  );
  const pods = (response.body as V1PodList).items;
  return [pods.some((pod) => checkPodContainersReady(pod)), pods[0]?.metadata.uid || ''];
};

export const checkPodContainersReady = (pod: V1Pod): boolean => {
  const containerStatuses: V1ContainerStatus[] = pod.status?.containerStatuses || [];
  if (containerStatuses.length === 0) {
    return false;
  }
  return containerStatuses.every(
    (containerStatus) => containerStatus.ready && containerStatus.state?.running,
  );
};

export const patchNotebookRoute = async (
  fastify: KubeFastifyInstance,
  route: Route,
  namespace: string,
  name: string,
): Promise<Notebook> => {
  const patch: RecursivePartial<Notebook> = {
    metadata: {
      annotations: {
        'opendatahub.io/link': `https://${route.spec.host}/notebook/${namespace}/${name}`,
      },
    },
  };

  try {
    const response = await fastify.kube.customObjectsApi.patchNamespacedCustomObject(
      'kubeflow.org',
      'v1',
      namespace,
      'notebooks',
      name,
      patch,
      undefined,
      undefined,
      undefined,
      {
        headers: { 'Content-type': PatchUtils.PATCH_FORMAT_JSON_MERGE_PATCH },
      },
    );
    return response.body as Notebook;
  } catch (e) {
    const err = e.response.body;
    const error = createCustomError('Error adding route data to Notebook', err.message, err.code);
    fastify.log.error(error);
    throw error;
  }
};

export const enableNotebook = async (
  fastify: KubeFastifyInstance,
  request: FastifyRequest<{
    Body: NotebookData;
  }>,
): Promise<Notebook> => {
  const notebookData = request.body;
  const { notebookNamespace } = getNamespaces(fastify);
  const username = request.body.username || (await getUserName(fastify, request));
  const name = generateNotebookNameFromUsername(username);
  const url = request.headers.origin;

  try {
    await getNotebook(fastify, notebookNamespace, name);
    return await updateNotebook(fastify, username, url, notebookData);
  } catch (e) {
    if (e.response?.statusCode === 404) {
      return await createNotebook(fastify, username, url, notebookData);
    } else {
      throw e;
    }
  }
};
