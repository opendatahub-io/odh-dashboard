import { FastifyInstance } from 'fastify';
import { getNotebookEvents } from './eventUtils';

export default async (fastify: FastifyInstance): Promise<void> => {
  fastify.get('/:notebookName', async (request, reply) => {
    const params = request.params as {
        notebookName: string;
    }
    return getNotebookEvents(fastify, params.notebookName)
      .then((res) => {
        return res;
      })
      .catch((res) => {
        reply.send(res);
      });
  });
};