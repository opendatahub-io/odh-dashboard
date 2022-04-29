import { KubeFastifyInstance, OdhConfig } from '../../../types';
import { FastifyReply, FastifyRequest } from 'fastify';

module.exports = async (fastify: KubeFastifyInstance) => {
  fastify.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    const kubeResponse = await fastify.kube.customObjectsApi.getNamespacedCustomObject(
      'core.opendatahub.io',
      'v1alpha',
      fastify.kube.namespace,
      'odhconfigs',
      'odhconfig',
    );
    return kubeResponse.body as OdhConfig;
  });
};
