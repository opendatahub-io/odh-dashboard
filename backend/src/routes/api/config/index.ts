import { KubeFastifyInstance } from '../../../types';
import { FastifyReply, FastifyRequest } from 'fastify';
import { getDashboardConfig } from '../../../utils/resourceUtils';
import { setDashboardConfig } from './configUtils';
import { secureAdminRoute, secureRoute } from '../../../utils/route-security';

module.exports = async (fastify: KubeFastifyInstance) => {
  fastify.get(
    '/',
    secureRoute(fastify)(async (request: FastifyRequest, reply: FastifyReply) => {
      reply.send(getDashboardConfig());
    }),
  );

  fastify.patch(
    '/',
    secureAdminRoute(fastify)(async (request: FastifyRequest, reply: FastifyReply) => {
      reply.send(setDashboardConfig(fastify, request.body));
    }),
  );
};
