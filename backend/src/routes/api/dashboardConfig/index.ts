import { FastifyReply, FastifyRequest } from 'fastify';
import type { RecursivePartial } from '@odh-dashboard/foundation';
import { KubeFastifyInstance, DashboardConfig } from '../../../types';
import { secureAdminRoute } from '../../../utils/route-security';
import { JSON_PATCH } from '../../../utils/k8sClient';

export default async (fastify: KubeFastifyInstance): Promise<void> => {
  fastify.get(
    '/:namespace/:name',
    secureAdminRoute(fastify)(
      async (
        request: FastifyRequest<{ Params: { namespace: string; name: string } }>,
        reply: FastifyReply,
      ) => {
        const { namespace, name } = request.params;
        try {
          return await fastify.kube.customObjectsApi.getNamespacedCustomObject({
            group: 'opendatahub.io',
            version: 'v1alpha',
            namespace,
            plural: 'odhdashboardconfigs',
            name,
          });
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
        const { namespace, name } = request.params;
        try {
          return await fastify.kube.customObjectsApi.patchNamespacedCustomObject(
            {
              group: 'opendatahub.io',
              version: 'v1alpha',
              namespace,
              plural: 'odhdashboardconfigs',
              name,
              body: request.body,
            },
            JSON_PATCH,
          );
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
