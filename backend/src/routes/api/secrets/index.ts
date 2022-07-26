import { KubeFastifyInstance } from '../../../types';
import { FastifyReply, FastifyRequest } from 'fastify';
import { V1Secret } from '@kubernetes/client-node';

module.exports = async (fastify: KubeFastifyInstance) => {
  fastify.get(
    '/:name',
    async (request: FastifyRequest<{ Params: { name: string } }>, reply: FastifyReply) => {
      const secretName = request.params.name;
      try {
        const secretResponse = await fastify.kube.coreV1Api.readNamespacedSecret(
          secretName,
          fastify.kube.namespace,
        );
        return secretResponse.body;
      } catch (e) {
        fastify.log.error(`Secret ${secretName} could not be read, ${e}`);
        reply.send(e);
      }
    },
  );

  fastify.post('/', async (request: FastifyRequest<{ Body: V1Secret }>, reply: FastifyReply) => {
    const secretRequest = request.body;
    try {
      const secretResponse = await fastify.kube.coreV1Api.createNamespacedSecret(
        fastify.kube.namespace,
        secretRequest,
      );
      return secretResponse.body;
    } catch (e) {
      fastify.log.error(`Secret could not be created: ${e}`);
      reply.send(e);
    }
  });

  fastify.put(
    '/:name',
    async (
      request: FastifyRequest<{ Body: V1Secret; Params: { name: string } }>,
      reply: FastifyReply,
    ) => {
      const params = request.params;
      const secretRequest = request.body;
      try {
        const secretResponse = await fastify.kube.coreV1Api.replaceNamespacedSecret(
          params.name,
          fastify.kube.namespace,
          secretRequest,
        );
        return secretResponse.body;
      } catch (e) {
        fastify.log.error(`Secret ${params.name} could not be replaced: ${e}`);
        reply.send(e);
      }
    },
  );

  fastify.delete(
    '/:name',
    async (request: FastifyRequest<{ Params: { name: string } }>, reply: FastifyReply) => {
      const secretName = request.params.name;
      try {
        const secretResponse = await fastify.kube.coreV1Api.deleteNamespacedSecret(
          secretName,
          fastify.kube.namespace,
        );
        return secretResponse.body;
      } catch (e) {
        fastify.log.error(`Secret ${secretName} could not be deleted, ${e}`);
        reply.send(e);
      }
    },
  );
};
