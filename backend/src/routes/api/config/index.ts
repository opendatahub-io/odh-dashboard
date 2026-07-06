import { FastifyReply, FastifyRequest } from 'fastify';
import { setDashboardConfig } from './configUtils';
import { KubeFastifyInstance } from '../../../types';
import { getDashboardConfig, updateDashboardConfig } from '../../../utils/resourceUtils';
import { secureAdminRoute, secureRoute } from '../../../utils/route-security';

module.exports = async (fastify: KubeFastifyInstance) => {
  fastify.get(
    '/',
    secureRoute(fastify)(async (request: FastifyRequest, reply: FastifyReply) => {
      const forceRefresh = request.headers['cache-control'] === 'no-cache';

      if (forceRefresh) {
        await updateDashboardConfig();
      }

      reply.header('Cache-Control', 'no-cache').send(getDashboardConfig(request));
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
