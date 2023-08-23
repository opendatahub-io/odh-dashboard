import { KubeFastifyInstance } from '../../../types';
import { FastifyReply, FastifyRequest } from 'fastify';
import { V1RoleBinding } from '@kubernetes/client-node';
import { secureRoute } from '../../../utils/route-security';

module.exports = async (fastify: KubeFastifyInstance) => {
  fastify.get(
    '/:namespace/:name',
    secureRoute(fastify)(
      async (
        request: FastifyRequest<{ Params: { namespace: string; name: string } }>,
        reply: FastifyReply,
      ) => {
        const rbName = request.params.name;
        const rbNamespace = request.params.namespace;
        try {
          const response = await fastify.kube.customObjectsApi.getNamespacedCustomObject(
            'rbac.authorization.k8s.io',
            'v1',
            rbNamespace,
            'rolebindings',
            rbName,
          );
          return response.body;
        } catch (e) {
          fastify.log.error(
            `rolebinding ${rbName} could not be read, ${e.response?.body?.message || e.message}`,
          );
          reply.send(e);
        }
      },
    ),
  );

  fastify.post(
    '/',
    secureRoute(fastify)(
      async (request: FastifyRequest<{ Body: V1RoleBinding }>, reply: FastifyReply) => {
        const rbRequest = request.body;
        try {
          const response = await fastify.kube.customObjectsApi.createNamespacedCustomObject(
            'rbac.authorization.k8s.io',
            'v1',
            rbRequest.metadata.namespace,
            'rolebindings',
            rbRequest,
          );
          return response.body;
        } catch (e) {
          if (e.response?.statusCode === 409) {
            fastify.log.warn(`Rolebinding already present, skipping creation.`);
            return {};
          }

          fastify.log.error(
            `rolebinding could not be created: ${e.response?.body?.message || e.message}`,
          );
          reply.send(new Error(e.response?.body?.message));
        }
      },
    ),
  );
};
