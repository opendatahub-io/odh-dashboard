import { FastifyInstance, FastifyRequest } from 'fastify';
import { getNotebookEvents } from './eventUtils';

export default async (fastify: FastifyInstance): Promise<void> => {
  fastify.get(
    '/:namespace/:notebookName',
    async (
      request: FastifyRequest<{
        Params: {
          namespace: string;
          notebookName: string;
        };
        Querystring: {
          // TODO: Support server side filtering
          from?: string;
        };
      }>,
    ) => {
      const params = request.params;
      return getNotebookEvents(fastify, params.namespace, params.notebookName);
    },
  );
};
