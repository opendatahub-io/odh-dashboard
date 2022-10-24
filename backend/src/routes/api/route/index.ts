import { FastifyRequest } from 'fastify';
import { KubeFastifyInstance } from '../../../types';
import { secureRoute } from '../../../utils/route-security';
import { getRoute } from '../../../utils/notebookUtils';

module.exports = async (fastify: KubeFastifyInstance) => {
  fastify.get(
    '/:namespace/:name',
    secureRoute(fastify)(
      async (request: FastifyRequest<{ Params: { namespace: string; name: string } }>) => {
        const routeName = request.params.name;
        const namespace = request.params.namespace;
        return getRoute(fastify, namespace, routeName);
      },
    ),
  );
};
