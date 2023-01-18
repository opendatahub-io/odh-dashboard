import { V1Event, V1EventList } from '@kubernetes/client-node';
import { KubeFastifyInstance } from '../../../types';

export const getNotebookEvents = async (
  fastify: KubeFastifyInstance,
  namespace: string,
  podUID: string,
): Promise<V1Event[]> => {
  return fastify.kube.coreV1Api
    .listNamespacedEvent(
      namespace,
      undefined,
      undefined,
      undefined,
      `involvedObject.kind=Pod,involvedObject.uid=${podUID}`,
    )
    .then((res) => {
      const body = res.body as V1EventList;
      return body.items;
    });
};
