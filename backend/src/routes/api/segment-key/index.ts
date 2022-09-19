import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { getSegmentKey } from './segmentKeyUtils';
import { secureRoute } from '../../../utils/route-security';

export default async (fastify: FastifyInstance): Promise<void> => {
  fastify.get(
    '/',
    secureRoute(fastify)(async (request: FastifyRequest, reply: FastifyReply) => {
      return getSegmentKey(fastify)
        .then((res) => {
          return res;
        })
        .catch((res) => {
          reply.send(res);
        });
    }),
  );
};
