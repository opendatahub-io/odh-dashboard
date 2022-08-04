import { V1Event, V1EventList } from '@kubernetes/client-node';
import { KubeFastifyInstance } from '../../../types';

export const getNotebookEvents = async (
  fastify: KubeFastifyInstance,
  namespace: string,
  nbName: string,
): Promise<V1Event[]> => {
  const response = await fastify.kube.coreV1Api
    .listNamespacedEvent(
      namespace,
      undefined,
      undefined,
      undefined,
      `involvedObject.kind=Notebook,involvedObject.name=${nbName}`,
    )
    .then((res) => {
      return res.body as V1EventList;
    });

  return response.items;
};
