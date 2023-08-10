import { FastifyReply, FastifyRequest } from 'fastify';
import { PatchUtils } from '@kubernetes/client-node';
import { KubeFastifyInstance, DashboardConfig, RecursivePartial } from '../../../types';
import { secureAdminRoute } from '../../../utils/route-security';

module.exports = async (fastify: KubeFastifyInstance) => {
  fastify.get(
    '/:namespace/:name',
    secureAdminRoute(fastify)(
      async (
        request: FastifyRequest<{ Params: { namespace: string; name: string } }>,
        reply: FastifyReply,
      ) => {
        const { namespace, name } = request.params;
        try {
          const response = await fastify.kube.customObjectsApi.getNamespacedCustomObject(
            'opendatahub.io',
            'v1alpha',
            namespace,
            'odhdashboardconfigs',
            name,
          );
          return response.body;
        } catch (e) {
          fastify.log.error(
            `Dashboard ${name} could not be read, ${e.response?.body?.message || e.message}`,
          );
          reply.send(e);
        }
      },
    ),
  );

  fastify.patch(
    '/:namespace/:name',
    secureAdminRoute(fastify)(
      async (
        request: FastifyRequest<{
          Params: { namespace: string; name: string };
          Body: RecursivePartial<DashboardConfig>;
        }>,
        reply: FastifyReply,
      ) => {
        const options = {
          headers: { 'Content-type': PatchUtils.PATCH_FORMAT_JSON_PATCH },
        };
        const { namespace, name } = request.params;
        try {
          const response = await fastify.kube.customObjectsApi.patchNamespacedCustomObject(
            'opendatahub.io',
            'v1alpha',
            namespace,
            'odhdashboardconfigs',
            name,
            request.body,
            undefined,
            undefined,
            undefined,
            options,
          );
          return response.body;
        } catch (e) {
          fastify.log.error(
            `Dashboard ${name} could not be patched, ${e.response?.body?.message || e.message}`,
          );
          reply.send(e);
        }
      },
    ),
  );
};
