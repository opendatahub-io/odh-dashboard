import { KubeFastifyInstance } from '../../../types';
import { FastifyReply, FastifyRequest } from 'fastify';
import { V1Secret } from '@kubernetes/client-node';

module.exports = async (fastify: KubeFastifyInstance) => {
  fastify.get(
    '/:namespace/:name',
    async (
      request: FastifyRequest<{ Params: { namespace: string; name: string } }>,
      reply: FastifyReply,
    ) => {
      const secretName = request.params.name;
      const secretNamespace = request.params.namespace;
      try {
        const secretResponse = await fastify.kube.coreV1Api.readNamespacedSecret(
          secretName,
          secretNamespace,
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
        secretRequest.metadata.namespace,
        secretRequest,
      );
      return secretResponse.body;
    } catch (e) {
      fastify.log.error(`Secret could not be created: ${e}`);
      reply.send(e);
    }
  });

  fastify.put('/', async (request: FastifyRequest<{ Body: V1Secret }>, reply: FastifyReply) => {
    const secretRequest = request.body;
    try {
      const secretResponse = await fastify.kube.coreV1Api.replaceNamespacedSecret(
        secretRequest.metadata.name,
        secretRequest.metadata.namespace,
        secretRequest,
      );
      return secretResponse.body;
    } catch (e) {
      fastify.log.error(`Secret ${secretRequest.metadata.name} could not be replaced: ${e}`);
      reply.send(e);
    }
  });

  fastify.delete(
    '/:namespace/:name',
    async (
      request: FastifyRequest<{ Params: { namespace: string; name: string } }>,
      reply: FastifyReply,
    ) => {
      const secretName = request.params.name;
      const secretNamespace = request.params.namespace;
      try {
        const secretResponse = await fastify.kube.coreV1Api.deleteNamespacedSecret(
          secretName,
          secretNamespace,
        );
        return secretResponse.body;
      } catch (e) {
        fastify.log.error(`Secret ${secretName} could not be deleted, ${e}`);
        reply.send(e);
      }
    },
  );
};
