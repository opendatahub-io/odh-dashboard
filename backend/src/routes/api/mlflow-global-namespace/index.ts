import { FastifyReply } from 'fastify';
import { KubeFastifyInstance, OauthFastifyRequest } from '../../../types';
import { secureAdminRoute } from '../../../utils/route-security';
import { updateGlobalMLflowNamespaces } from './mlflowGlobalNamespaceUtils';

module.exports = async (fastify: KubeFastifyInstance) => {
  fastify.put(
    '/',
    secureAdminRoute(fastify)(
      async (
        request: OauthFastifyRequest<{
          Body: { globalMLflowNamespaces: string[] };
        }>,
        reply: FastifyReply,
      ) => {
        const { globalMLflowNamespaces } = request.body;
        if (
          !Array.isArray(globalMLflowNamespaces) ||
          !globalMLflowNamespaces.every((ns) => typeof ns === 'string' && ns.trim().length > 0)
        ) {
          reply.code(400).send({
            success: false,
            error: 'globalMLflowNamespaces must be an array of non-empty strings',
          });
          return;
        }
        const trimmed = globalMLflowNamespaces.map((ns) => ns.trim());
        const result = await updateGlobalMLflowNamespaces(fastify, request, trimmed);
        reply.send(result);
      },
    ),
  );
};
