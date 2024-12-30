/**
 * @fileOverview
 * @deprecated see RHOAIENG-16988
 */
import { FastifyRequest } from 'fastify';
import { GroupsConfig, KubeFastifyInstance } from '../../../types';
import { getGroupsConfig, updateGroupsConfig } from './groupsConfigUtil';
import { secureAdminRoute } from '../../../utils/route-security';

export default async (fastify: KubeFastifyInstance): Promise<void> => {
  /** @deprecated - see RHOAIENG-16988 */
  fastify.get(
    '/',
    secureAdminRoute(fastify)(async (request, reply) => {
      return getGroupsConfig(fastify).catch((e) => {
        fastify.log.error(
          `Error retrieving group configuration, ${e.response?.body?.message || e.message}`,
        );
        reply.status(500).send({ message: e.response?.body?.message || e.message });
      });
    }),
  );

  /** @deprecated - see RHOAIENG-16988 */
  fastify.put(
    '/',
    secureAdminRoute(fastify)(async (request: FastifyRequest<{ Body: GroupsConfig }>, reply) => {
      return updateGroupsConfig(fastify, request).catch((e) => {
        fastify.log.error(
          `Failed to update groups configuration, ${e.response?.body?.message || e.message}`,
        );
        reply.status(500).send({ message: e.response?.body?.message || e.message });
      });
    }),
  );
};
