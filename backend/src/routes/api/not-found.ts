import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

export default async (fastify: FastifyInstance): Promise<void> => {
  fastify.get('/*', (req: FastifyRequest, reply: FastifyReply) => {
    reply.notFound();
  });
};
