import { FastifyRequest } from 'fastify';
import { movePVC } from '../../../utils/volumeUtils';
import { KubeFastifyInstance } from '../../../types';
import { secureAdminRoute } from '../../../utils/route-security';

module.exports = async (fastify: KubeFastifyInstance) => {
  fastify.patch(
    '/',
    secureAdminRoute(fastify)(
      async (
        request: FastifyRequest<{
          Body: { name: string; tgtNamespace: string; srcNamespace?: string };
        }>,
      ) => {
        return movePVC(
          fastify,
          request.body.name,
          request.body.tgtNamespace,
          request.body.srcNamespace,
        );
      },
    ),
  );
};
