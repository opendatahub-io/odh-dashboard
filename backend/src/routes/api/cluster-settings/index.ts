import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { getClusterSettings, updateClusterSettings } from './clusterSettingsUtils';
import { ClusterSettings } from '../../../types';

export default async (fastify: FastifyInstance): Promise<void> => {
  fastify.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    return getClusterSettings(fastify)
      .then((res) => {
        return res;
      })
      .catch((res) => {
        reply.send(res);
      });
  });

  fastify.put(
    '/',
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
  );
};
