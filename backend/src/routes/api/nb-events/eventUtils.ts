import { V1Event, V1SelfSubjectAccessReview } from '@kubernetes/client-node';
import { K8sStatus, KubeFastifyInstance, OauthFastifyRequest } from '../../../types';
import { createSelfSubjectAccessReview } from '../namespaces/namespaceUtils';
import { createCustomError } from '../../../utils/requestUtils';

export const getNotebookEvents = async (
  fastify: KubeFastifyInstance,
  namespace: string,
  notebookName: string,
  podUID: string | undefined,
): Promise<V1Event[]> => {
  if (podUID) {
    const response = await fastify.kube.coreV1Api.listNamespacedPod(
      namespace,
      undefined,
      undefined,
      undefined,
      undefined,
      `notebook-name=${notebookName}`,
    );
    for (const pod of response.body.items) {
      if (pod.metadata.uid === podUID) {
        return fastify.kube.coreV1Api
          .listNamespacedEvent(
            namespace,
            undefined,
            undefined,
            undefined,
            `involvedObject.kind=Pod,involvedObject.uid=${podUID}`,
          )
          .then((res) => res.body.items);
      }
    }
    throw createCustomError(
      '404 Referenced pod not found for the notebook',
      'Referenced pod not found for the notebook',
      404,
    );
  } else {
    return fastify.kube.coreV1Api
      .listNamespacedEvent(
        namespace,
        undefined,
        undefined,
        undefined,
        `involvedObject.kind=StatefulSet,involvedObject.name=${notebookName}`,
      )
      .then((res) => res.body.items);
  }
};

export const checkUserNotebookPermissions = (
  fastify: KubeFastifyInstance,
  request: OauthFastifyRequest,
  name: string,
  namespace: string,
): Promise<V1SelfSubjectAccessReview | K8sStatus> =>
  createSelfSubjectAccessReview(fastify, request, {
    group: 'kubeflow.org',
    resource: 'notebooks',
    subresource: '',
    verb: 'get',
    name,
    namespace,
  });
