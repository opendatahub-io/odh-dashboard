import { FastifyReply, FastifyRequest } from 'fastify';
import { KubeFastifyInstance } from '../../../types';

import { secureRoute } from '../../../utils/route-security';

module.exports = async (fastify: KubeFastifyInstance) => {
  fastify.get(
    '/:namespace/:name',
    secureRoute(fastify)(
      async (
        request: FastifyRequest<{ Params: { namespace: string; name: string } }>,
        reply: FastifyReply,
      ) => {
        const { namespace, name } = request.params;
        try {
          const rbResponse = await fastify.kube.customObjectsApi.getNamespacedCustomObject(
            'template.openshift.io',
            'v1',
            namespace,
            'templates',
            name,
          );
          return rbResponse.body;
        } catch (e) {
          fastify.log.error(
            `Template ${name} could not be read, ${e.response?.body?.message || e.message}`,
          );
          reply.send(e);
        }
      },
    ),
  );

  fastify.get(
    '/:namespace',
    secureRoute(fastify)(
      async (
        request: FastifyRequest<{ Params: { namespace: string; labelSelector: string } }>,
        reply: FastifyReply,
      ) => {
        const { namespace, labelSelector } = request.params;
        try {
          const rbResponse = await fastify.kube.customObjectsApi.listNamespacedCustomObject(
            'template.openshift.io',
            'v1',
            namespace,
            'templates',
            undefined,
            undefined,
            undefined,
            labelSelector,
          );
          return rbResponse.body;
        } catch (e) {
          fastify.log.error(
            `Templates could not be listed, ${e.response?.body?.message || e.message}`,
          );
          reply.send(e);
        }
      },
    ),
  );
};
