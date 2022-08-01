import { FastifyInstance, FastifyRequest } from 'fastify';
import { getNotebookEvents } from './eventUtils';

export default async (fastify: FastifyInstance): Promise<void> => {
  fastify.get(
    '/:notebookName',
    async (
      request: FastifyRequest<{
        Params: {
          notebookName: string;
        };
      }>,
    ) => {
      const params = request.params;
      return getNotebookEvents(fastify, params.notebookName);
    },
  );
};
