import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { getSegmentKey } from './segmentKeyUtils';

export default async (fastify: FastifyInstance): Promise<void> => {
  fastify.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    return getSegmentKey(fastify)
      .then((res) => {
        return res;
      })
      .catch((res) => {
        reply.send(res);
      });
  });
};
