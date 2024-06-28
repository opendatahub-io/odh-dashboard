import { FastifyRequest } from 'fastify';
import { getNotebookEvents } from './eventUtils';
import { secureRoute } from '../../../utils/route-security';
import { KubeFastifyInstance } from '../../../types';

export default async (fastify: KubeFastifyInstance): Promise<void> => {
  const routeHandler = secureRoute(fastify)(
    async (
      request: FastifyRequest<{
        Params: {
          namespace: string;
          notebookName: string;
          podUID: string | undefined;
        };
      }>,
    ) => {
      const { namespace, notebookName, podUID } = request.params;
      return getNotebookEvents(fastify, namespace, notebookName, podUID);
    },
  );

  fastify.get('/:namespace/:notebookName', routeHandler);
  fastify.get('/:namespace/:notebookName/:podUID', routeHandler);
};
