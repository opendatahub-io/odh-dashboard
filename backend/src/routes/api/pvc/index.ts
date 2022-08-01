import { KubeFastifyInstance } from '../../../types';
import { FastifyReply, FastifyRequest } from 'fastify';
import { V1PersistentVolumeClaim } from '@kubernetes/client-node';

module.exports = async (fastify: KubeFastifyInstance) => {
  fastify.get(
    '/:namespace/:name',
    async (
      request: FastifyRequest<{ Params: { namespace: string; name: string } }>,
      reply: FastifyReply,
    ) => {
      const pvcName = request.params.name;
      const pvcNamespace = request.params.namespace;
      try {
        const pvcResponse = await fastify.kube.coreV1Api.readNamespacedPersistentVolumeClaim(
          pvcName,
          pvcNamespace,
        );
        return pvcResponse.body;
      } catch (e) {
        fastify.log.error(`PVC ${pvcName} could not be read, ${e}`);
        reply.send(e);
      }
    },
  );

  fastify.post(
    '/',
    async (request: FastifyRequest<{ Body: V1PersistentVolumeClaim }>, reply: FastifyReply) => {
      const pvcRequest = request.body;
      try {
        const pvcResponse = await fastify.kube.coreV1Api.createNamespacedPersistentVolumeClaim(
          pvcRequest.metadata.namespace,
          pvcRequest,
        );
        return pvcResponse.body;
      } catch (e) {
        fastify.log.error(`PVC could not be created: ${e}`);
        reply.send(e);
      }
    },
  );
};
