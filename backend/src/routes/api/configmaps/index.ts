import { KubeFastifyInstance } from '../../../types';
import { FastifyReply, FastifyRequest } from 'fastify';
import { V1ConfigMap } from '@kubernetes/client-node';

module.exports = async (fastify: KubeFastifyInstance) => {
  fastify.get(
    '/:namespace/:name',
    async (
      request: FastifyRequest<{ Params: { namespace: string; name: string } }>,
      reply: FastifyReply,
    ) => {
      const cmName = request.params.name;
      const cmNamespace = request.params.namespace;
      try {
        const cmResponse = await fastify.kube.coreV1Api.readNamespacedConfigMap(
          cmName,
          cmNamespace,
        );
        return cmResponse.body;
      } catch (e) {
        fastify.log.error(`Configmap ${cmName} could not be read, ${e}`);
        reply.send(e);
      }
    },
  );

  fastify.post('/', async (request: FastifyRequest<{ Body: V1ConfigMap }>, reply: FastifyReply) => {
    const cmRequest = request.body;
    try {
      const cmResponse = await fastify.kube.coreV1Api.createNamespacedConfigMap(
        cmRequest.metadata.namespace,
        cmRequest,
      );
      return cmResponse.body;
    } catch (e) {
      fastify.log.error(`Configmap could not be created: ${e}`);
      reply.send(e);
    }
  });

  fastify.put('/', async (request: FastifyRequest<{ Body: V1ConfigMap }>, reply: FastifyReply) => {
    const cmRequest = request.body;
    try {
      const cmResponse = await fastify.kube.coreV1Api.replaceNamespacedConfigMap(
        cmRequest.metadata.name,
        cmRequest.metadata.namespace,
        cmRequest,
      );
      return cmResponse.body;
    } catch (e) {
      fastify.log.error(`Configmap ${cmRequest.metadata.name} could not be replaced: ${e}`);
      reply.send(e);
    }
  });

  fastify.delete(
    '/:namespace/:name',
    async (
      request: FastifyRequest<{ Params: { namespace: string; name: string } }>,
      reply: FastifyReply,
    ) => {
      const cmName = request.params.name;
      const cmNamespace = request.params.namespace;
      try {
        const cmResponse = await fastify.kube.coreV1Api.deleteNamespacedConfigMap(
          cmName,
          cmNamespace,
        );
        return cmResponse.body;
      } catch (e) {
        fastify.log.error(`Configmap ${cmName} could not be deleted, ${e}`);
        reply.send(e);
      }
    },
  );
};
