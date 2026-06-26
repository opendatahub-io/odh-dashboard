import { FastifyReply } from 'fastify';
import { KubeFastifyInstance, OauthFastifyRequest } from '../../../types';
import { createCustomError } from '../../../utils/requestUtils';
import { secureAdminRoute } from '../../../utils/route-security';
import { updateGlobalMLflowNamespaces } from './mlflowGlobalNamespaceUtils';

export default async (fastify: KubeFastifyInstance): Promise<void> => {
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
          throw createCustomError(
            'Validation error',
            'globalMLflowNamespaces must be an array of non-empty strings',
            400,
          );
        }
        const trimmed = globalMLflowNamespaces.map((ns) => ns.trim());
        const result = await updateGlobalMLflowNamespaces(fastify, request, trimmed);
        reply.send(result);
      },
    ),
  );
};
