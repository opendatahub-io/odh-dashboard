import { FastifyInstance, FastifyRequest } from 'fastify';
import { status } from './statusUtils';
import { getAllowedUsers } from './adminAllowedUsers';

export default async (fastify: FastifyInstance): Promise<void> => {
  fastify.get('/', async (request, reply) => {
    return status(fastify, request)
      .then((res) => {
        return res;
      })
      .catch((res) => {
        reply.send(res);
      });
  });

  fastify.post(
    '/:namespace/allowedUsers',
    async (request: FastifyRequest<{ Params: { namespace: string } }>) => {
      return getAllowedUsers(fastify, request);
    },
  );
};
