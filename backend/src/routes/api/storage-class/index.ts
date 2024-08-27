import { FastifyReply, FastifyRequest } from 'fastify';
import { StorageClassConfig, KubeFastifyInstance } from '../../../types';
import { secureAdminRoute } from '../../../utils/route-security';
import { updateStorageClassConfig } from './utils';

export default async (fastify: KubeFastifyInstance): Promise<void> => {
  fastify.put(
    '/:storageClassName/config',
    secureAdminRoute(fastify)(
      async (
        request: FastifyRequest<{
          Body: StorageClassConfig;
          Params: { storageClassName: string };
        }>,
        reply: FastifyReply,
      ) => {
        return updateStorageClassConfig(fastify, request)
          .then((res) => {
            return res;
          })
          .catch((res) => {
            reply.send(res);
          });
      },
    ),
  );
};
