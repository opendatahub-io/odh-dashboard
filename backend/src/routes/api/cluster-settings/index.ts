import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { getClusterSettings, updateClusterSettings } from './clusterSettingsUtils';
import { ClusterSettings } from '../../../types';
import { secureAdminRoute } from '../../../utils/route-security';

export default async (fastify: FastifyInstance): Promise<void> => {
  fastify.get(
    '/',
    secureAdminRoute(fastify)(async (request: FastifyRequest, reply: FastifyReply) => {
      return getClusterSettings(fastify)
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
