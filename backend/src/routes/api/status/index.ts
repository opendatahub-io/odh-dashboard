import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { status } from './statusUtils';
import { getAllowedUsers } from './adminAllowedUsers';
import { secureAdminRoute, secureRoute } from '../../../utils/route-security';

export default async (fastify: FastifyInstance): Promise<void> => {
  fastify.get(
    '/',
    secureRoute(fastify)(async (request: FastifyRequest, reply: FastifyReply) => {
      return status(fastify, request)
        .then((res) => {
          return res;
        })
        .catch((e) => {
          fastify.log.error(`Failed to get status, ${e.response?.body?.message || e.message}}`);
          reply.send(e.response?.body?.message || e.message);
        });
    }),
  );

  fastify.get(
    '/:namespace/allowedUsers',
    secureAdminRoute(fastify)(
      async (request: FastifyRequest<{ Params: { namespace: string } }>, reply) => {
        return getAllowedUsers(fastify, request).catch((e) => {
          reply.status(500).send({ message: e.message });
        });
      },
    ),
  );
};
