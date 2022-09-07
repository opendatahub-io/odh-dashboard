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
    secureAdminRoute(fastify)(async (request: FastifyRequest<{ Body: GroupsConfig }>) => {
      return updateGroupsConfig(fastify, request);
    }),
  );
};
