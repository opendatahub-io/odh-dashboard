import { FastifyReply, FastifyRequest } from 'fastify';
import { setDashboardConfig } from './configUtils';
import { KubeFastifyInstance } from '../../../types';
import { getDashboardConfig } from '../../../utils/resourceUtils';
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
      if ('body' in request && request.body && typeof request.body === 'object') {
        reply.send(setDashboardConfig(fastify, request.body));
      }
    }),
  );
};
