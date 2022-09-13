import { FastifyInstance, FastifyRequest } from 'fastify';
import { GroupsConfig } from '../../../types';
import { getGroupsConfig, updateGroupsConfig } from './groupsConfigUtil';
import { secureAdminRoute } from '../../../utils/route-security';

export default async (fastify: FastifyInstance): Promise<void> => {
  fastify.get(
    '/',
    secureAdminRoute(fastify)(async () => {
      return getGroupsConfig(fastify);
    }),
  );

  fastify.put(
    '/',
    secureAdminRoute(fastify)(async (request: FastifyRequest<{ Body: GroupsConfig }>, reply) => {
      return updateGroupsConfig(fastify, request).catch((e) => {
        fastify.log.error(
          `Failed to update groups configuration, ${e.response?.data?.message || e.message}`,
        );
        reply.status(500).send({ message: e.response?.data?.message || e.message });
      });
    }),
  );
};
