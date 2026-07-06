import { FastifyReply, FastifyRequest } from 'fastify';
import { listComponents, removeComponent } from './list';
import { KubeFastifyInstance } from '../../../types';
import { secureRoute, secureAdminRoute } from '../../../utils/route-security';

module.exports = async (fastify: KubeFastifyInstance) => {
  fastify.get(
    '/',
    secureRoute(fastify)(async (request: FastifyRequest, reply: FastifyReply) =>
      listComponents(fastify, request)
        .then((res) => res)
        .catch((res) => {
          reply.send(res);
        }),
    ),
  );

  fastify.get(
    '/remove',
    secureAdminRoute(fastify)(async (request: FastifyRequest, reply: FastifyReply) =>
      removeComponent(fastify, request)
        .then((res) => res)
        .catch((res) => {
          reply.send(res);
        }),
    ),
  );
};
