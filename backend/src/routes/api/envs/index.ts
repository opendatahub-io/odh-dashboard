import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { getConfigMap, getSecret } from '../../../utils/envUtils';
import { secureRoute } from '../../../utils/route-security';

export default async (fastify: FastifyInstance): Promise<void> => {
  fastify.get(
    '/secret/:namespace/:name',
    secureRoute(fastify)(
      async (
        request: FastifyRequest<{ Params: { namespace: string; name: string } }>,
        reply: FastifyReply,
      ) => {
        const { namespace, name } = request.params;

        return getSecret(fastify, namespace, name).catch((e) => {
          if (e.statusCode !== 404) {
            fastify.log.error(`Failed get env secret, ${e.response?.data?.message || e.message}}`);
          }
          reply.status(404).send(e.response?.data?.message || e.message);
        });
      },
    ),
  );

  fastify.get(
    '/configmap/:namespace/:name',
    secureRoute(fastify)(
      async (
        request: FastifyRequest<{ Params: { namespace: string; name: string } }>,
        reply: FastifyReply,
      ) => {
        const { namespace, name } = request.params;

        return getConfigMap(fastify, namespace, name).catch((e) => {
          if (e.statusCode !== 404) {
            fastify.log.error(
              `Failed get env configmap, ${e.response?.data?.message || e.message}}`,
            );
          }
          reply.status(404).send(e.response?.data?.message || e.message);
        });
      },
    ),
  );
};
