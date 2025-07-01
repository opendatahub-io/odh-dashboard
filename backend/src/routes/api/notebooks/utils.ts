import { V1ContainerStatus, V1Pod, V1PodList } from '@kubernetes/client-node';
import { FastifyRequest } from 'fastify';
import { isHttpError } from '../../../utils';
import { KubeFastifyInstance, Notebook, NotebookData } from '../../../types';
import { getUserInfo } from '../../../utils/userUtils';
import {
  createNotebook,
  generateNotebookNameFromUsername,
  getNamespaces,
  getNotebook,
  getRoute,
  updateNotebook,
} from '../../../utils/notebookUtils';

export const getNotebookStatus = async (
  fastify: KubeFastifyInstance,
  namespace: string,
  name: string,
): Promise<{ notebook: Notebook; isRunning: boolean; podUID: string; notebookLink: string }> => {
  const notebook = await getNotebook(fastify, namespace, name);
  const hasStopAnnotation = !!notebook.metadata.annotations?.['kubeflow-resource-stopped'];
  const [isRunning, podUID] = hasStopAnnotation
    ? [false, '']
    : await listNotebookStatus(fastify, namespace, name);
  const route = await getRoute(fastify, namespace, name).catch((e) => {
    fastify.log.warn(`Failed getting route ${notebook.metadata.name}: ${e.message}`);
    return undefined;
  });
  return {
    notebook,
    isRunning,
    podUID,
    notebookLink: route ? `https://${route.spec.host}/notebook/${namespace}/${name}` : '',
  };
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
  return [pods.some((pod) => checkPodContainersReady(pod)), pods[0]?.metadata?.uid || ''];
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

export const enableNotebook = async (
  fastify: KubeFastifyInstance,
  request: FastifyRequest<{
    Body: NotebookData;
  }>,
): Promise<Notebook> => {
  const notebookData = request.body;
  const { workbenchNamespace } = getNamespaces(fastify);
  const username = request.body.username || (await getUserInfo(fastify, request)).userName;
  const name = generateNotebookNameFromUsername(username);
  const url = request.headers.origin;

  try {
    const notebook = await getNotebook(fastify, workbenchNamespace, name);
    return await updateNotebook(fastify, username, url ?? '', notebookData, notebook);
  } catch (e) {
    if (isHttpError(e) && e.response.statusCode === 404) {
      return await createNotebook(fastify, username, url ?? '', notebookData);
    }
    throw e;
  }
};
