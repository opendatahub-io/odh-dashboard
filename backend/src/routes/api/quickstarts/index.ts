import { FastifyReply, FastifyRequest } from 'fastify';
import { KubeFastifyInstance } from '../../../types';
import { listQuickStarts } from './list';
import { secureRoute } from '../../../utils/route-security';

export default async (fastify: KubeFastifyInstance): Promise<void> => {
  fastify.get(
    '/',
    secureRoute(fastify)(async (request: FastifyRequest, reply: FastifyReply) => {
      return listQuickStarts()
        .then((res) => {
          return res;
        })
        .catch((res) => {
          reply.send(res);
        });
    }),
  );
};
