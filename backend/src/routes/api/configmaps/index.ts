import { KubeFastifyInstance } from '../../../types';
import { FastifyReply, FastifyRequest } from 'fastify';
import { V1ConfigMap } from '@kubernetes/client-node';

module.exports = async (fastify: KubeFastifyInstance) => {
  fastify.get(
    '/:name',
    async (request: FastifyRequest<{ Params: { name: string } }>, reply: FastifyReply) => {
      const cmName = request.params.name;
      try {
        const cmResponse = await fastify.kube.coreV1Api.readNamespacedConfigMap(
          cmName,
          fastify.kube.namespace,
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
        fastify.kube.namespace,
        cmRequest,
      );
      return cmResponse.body;
    } catch (e) {
      fastify.log.error(`Configmap could not be created: ${e}`);
      reply.send(e);
    }
  });

  fastify.put(
    '/:name',
    async (
      request: FastifyRequest<{ Body: V1ConfigMap; Params: { name: string } }>,
      reply: FastifyReply,
    ) => {
      const params = request.params;
      const cmRequest = request.body;
      try {
        const cmResponse = await fastify.kube.coreV1Api.replaceNamespacedConfigMap(
          params.name,
          fastify.kube.namespace,
          cmRequest,
        );
        return cmResponse.body;
      } catch (e) {
        fastify.log.error(`Configmap ${params.name} could not be replaced: ${e}`);
        reply.send(e);
      }
    },
  );

  fastify.delete(
    '/:name',
    async (request: FastifyRequest<{ Params: { name: string } }>, reply: FastifyReply) => {
      const cmName = request.params.name;
      try {
        const cmResponse = await fastify.kube.coreV1Api.deleteNamespacedConfigMap(
          cmName,
          fastify.kube.namespace,
        );
        return cmResponse.body;
      } catch (e) {
        fastify.log.error(`Configmap ${cmName} could not be deleted, ${e}`);
        reply.send(e);
      }
    },
  );
};
