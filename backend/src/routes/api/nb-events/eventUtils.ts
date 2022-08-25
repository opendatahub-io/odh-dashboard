import { V1Event, V1EventList } from '@kubernetes/client-node';
import { KubeFastifyInstance } from '../../../types';

export const getNotebookEvents = async (
  fastify: KubeFastifyInstance,
  namespace: string,
  nbName: string,
): Promise<V1Event[]> => {
  const eventList = await fastify.kube.coreV1Api
    .listNamespacedEvent(namespace, undefined, undefined, undefined, 'involvedObject.kind=Pod')
    .then((res) => {
      return res.body as V1EventList;
    });

  // Filter the events by pods that have the same name as the notebook
  return eventList.items.filter((event) => event.involvedObject.name.startsWith(nbName));
};
