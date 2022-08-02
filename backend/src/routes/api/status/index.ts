import { FastifyInstance, FastifyRequest } from 'fastify';
import { mapUserPrivilege, status } from './statusUtils';

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

  fastify.post('/privilege', async (request: FastifyRequest<{ Body: { users: string[] } }>) => {
    return mapUserPrivilege(fastify, request.body.users);
  });
};
