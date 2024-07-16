import { FastifyReply, FastifyRequest } from 'fastify';
import { getConfigMap, getSecret } from '../../../utils/envUtils';
import { secureRoute } from '../../../utils/route-security';
import { KubeFastifyInstance } from '../../../types';

export default async (fastify: KubeFastifyInstance): Promise<void> => {
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
            fastify.log.error(`Failed get env secret, ${e.response?.body?.message || e.message}}`);
          }
          reply.status(404).send(e.response?.body?.message || e.message);
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
              `Failed get env configmap, ${e.response?.body?.message || e.message}}`,
            );
          }
          reply.status(404).send(e.response?.body?.message || e.message);
        });
      },
    ),
  );
};
