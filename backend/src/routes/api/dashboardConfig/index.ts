import { FastifyReply, FastifyRequest } from 'fastify';
import { KubeFastifyInstance } from '../../../types';

import { secureRoute } from '../../../utils/route-security';

module.exports = async (fastify: KubeFastifyInstance) => {
  fastify.get(
    '/:namespace/:name',
    secureRoute(fastify)(
      async (
        request: FastifyRequest<{ Params: { namespace: string; name: string } }>,
        reply: FastifyReply,
      ) => {
        const { namespace, name } = request.params;
        try {
          const rbResponse = await fastify.kube.customObjectsApi.getNamespacedCustomObject(
            'opendatahub.io',
            'v1alpha',
            namespace,
            'odhdashboardconfigs',
            name,
          );
          return rbResponse.body;
        } catch (e) {
          fastify.log.error(
            `Dashboard ${name} could not be read, ${e.response?.body?.message || e.message}`,
          );
          reply.send(e);
        }
      },
    ),
  );
};
