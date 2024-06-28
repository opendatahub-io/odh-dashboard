import { FastifyReply, FastifyRequest } from 'fastify';
import { getClusterSettings, updateClusterSettings } from './clusterSettingsUtils';
import { ClusterSettings, KubeFastifyInstance } from '../../../types';
import { secureAdminRoute } from '../../../utils/route-security';

export default async (fastify: KubeFastifyInstance): Promise<void> => {
  fastify.get(
    '/',
    secureAdminRoute(fastify)(async (request: FastifyRequest, reply: FastifyReply) => {
      return getClusterSettings(fastify, request)
        .then((res) => {
          return res;
        })
        .catch((res) => {
          reply.send(res);
        });
    }),
  );

  fastify.put(
    '/',
    secureAdminRoute(fastify)(
      async (
        request: FastifyRequest<{
          Body: ClusterSettings;
        }>,
        reply: FastifyReply,
      ) => {
        return updateClusterSettings(fastify, request)
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
