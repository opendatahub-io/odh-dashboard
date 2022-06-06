import { FastifyInstance } from 'fastify';
import { status } from './statusUtils';

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
};
