import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

export default async (fastify: FastifyInstance): Promise<void> => {
  fastify.get('/*', async (request: FastifyRequest, reply: FastifyReply) => {
    reply.sendFile('index.html');
    return reply;
  });
};
