import { FastifyInstance, FastifyRequest } from 'fastify';
import { secureAdminRoute } from '../../../utils/route-security';
import { getTemplateOrder, updateTemplateOrder } from './templateOrderUtils';

export default async (fastify: FastifyInstance): Promise<void> => {
  fastify.get(
    '/',
    secureAdminRoute(fastify)(async () => {
      return getTemplateOrder();
    }),
  );

  fastify.put(
    '/',
    secureAdminRoute(fastify)(async (request: FastifyRequest<{ Body: string[] }>, reply) => {
      return updateTemplateOrder(fastify, request).catch((e) => {
        fastify.log.error(
          `Failed to update groups configuration, ${e.response?.body?.message || e.message}`,
        );
        reply.status(500).send({ message: e.response?.body?.message || e.message });
      });
    }),
  );
};
