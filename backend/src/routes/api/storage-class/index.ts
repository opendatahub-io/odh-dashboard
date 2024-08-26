import { FastifyReply, FastifyRequest } from 'fastify';
import { StorageClassConfig, KubeFastifyInstance } from '../../../types';
import { secureAdminRoute } from '../../../utils/route-security';
import { updateStorageClassMetadata } from './utils';

export default async (fastify: KubeFastifyInstance): Promise<void> => {
  fastify.put(
    '/:storageClassName/metadata',
    secureAdminRoute(fastify)(
      async (
        request: FastifyRequest<{
          Body: StorageClassConfig;
        }>,
        reply: FastifyReply,
      ) => {
        return updateStorageClassMetadata(fastify, request)
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
