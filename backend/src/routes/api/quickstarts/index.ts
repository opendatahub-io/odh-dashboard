import { FastifyReply, FastifyRequest } from 'fastify';
import { listQuickStarts } from './list';
import { KubeFastifyInstance } from '../../../types';
import { secureRoute } from '../../../utils/route-security';

export default async (fastify: KubeFastifyInstance): Promise<void> => {
  fastify.get(
    '/',
    secureRoute(fastify)(async (request: FastifyRequest, reply: FastifyReply) =>
      listQuickStarts()
        .then((res) => res)
        .catch((res) => {
          reply.send(res);
        }),
    ),
  );
};
