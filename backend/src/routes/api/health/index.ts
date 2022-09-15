import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { health } from './healthUtils';

export default async (fastify: FastifyInstance): Promise<void> => {
  // Unsecured route for health check
  fastify.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    return health(fastify);
  });
};
