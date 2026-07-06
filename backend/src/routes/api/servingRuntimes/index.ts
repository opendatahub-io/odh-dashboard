import { FastifyReply, FastifyRequest } from 'fastify';
import { KubeFastifyInstance, ServingRuntimeKind } from '../../../types';
import { secureAdminRoute } from '../../../utils/route-security';

module.exports = async (fastify: KubeFastifyInstance) => {
  fastify.post(
    '/',
    secureAdminRoute(fastify)(
      async (
        request: FastifyRequest<{
          Querystring: { dryRun?: string };
          Body: ServingRuntimeKind;
        }>,
        reply: FastifyReply,
      ) => {
        const { dryRun } = request.query;
        const servingRuntime = request.body;
        try {
          const response = await fastify.kube.customObjectsApi.createNamespacedCustomObject(
            'serving.kserve.io',
            'v1alpha1',
            servingRuntime.metadata.namespace,
            'servingruntimes',
            servingRuntime,
            undefined,
            dryRun,
          );
          return response.body;
        } catch (e) {
          fastify.log.error(
            `Servingruntime ${servingRuntime.metadata.name} could not be created, ${
              e.response?.body?.message || e.message
            }`,
          );
          reply.send(e);
        }
      },
    ),
  );
};
