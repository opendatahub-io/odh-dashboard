import { KubeFastifyInstance } from '../../../types';
import { FastifyReply, FastifyRequest } from 'fastify';
import { V1RoleBinding } from '@kubernetes/client-node';

module.exports = async (fastify: KubeFastifyInstance) => {
  fastify.get(
    '/:namespace/:name',
    async (
      request: FastifyRequest<{ Params: { namespace: string; name: string } }>,
      reply: FastifyReply,
    ) => {
      const rbName = request.params.name;
      const rbNamespace = request.params.namespace;
      try {
        const rbResponse = await fastify.kube.customObjectsApi.getNamespacedCustomObject(
          'rbac.authorization.k8s.io',
          'v1',
          rbNamespace,
          'rolebindings',
          rbName,
        );
        return rbResponse.body;
      } catch (e) {
        fastify.log.error(`rolebinding ${rbName} could not be read, ${e}`);
        reply.send(e);
      }
    },
  );

  fastify.post(
    '/',
    async (request: FastifyRequest<{ Body: V1RoleBinding }>, reply: FastifyReply) => {
      const rbRequest = request.body;
      try {
        const rbResponse = await fastify.kube.customObjectsApi.createNamespacedCustomObject(
          'rbac.authorization.k8s.io',
          'v1',
          rbRequest.metadata.namespace,
          'rolebindings',
          rbRequest,
        );
        return rbResponse.body;
      } catch (e) {
        fastify.log.error(`rolebinding could not be created: ${e}`);
        reply.send(e);
      }
    },
  );
};
