import { KubeFastifyInstance, ImageStreamList } from '../../../types';
import { FastifyReply, FastifyRequest } from 'fastify';

module.exports = async (fastify: KubeFastifyInstance) => {
  fastify.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    const kubeResponse = await fastify.kube.customObjectsApi.listNamespacedCustomObject(
      'image.openshift.io',
      'v1',
      fastify.kube.namespace,
      'imagestreams',
      undefined,
      undefined,
      undefined,
      'opendatahub.io/notebook-image=true',
    );

    return kubeResponse.body as ImageStreamList;
  });
};
