import { FastifyReply, FastifyRequest } from 'fastify';
import { listBuilds } from './list';
import { KubeFastifyInstance } from '../../../types';
import { secureRoute } from '../../../utils/route-security';

module.exports = async (fastify: KubeFastifyInstance) => {
  fastify.get(
    '/',
    secureRoute(fastify)(async (request: FastifyRequest, reply: FastifyReply) =>
      listBuilds()
        .then((res) => res)
        .catch((res) => {
          reply.send(res);
        }),
    ),
  );
};
