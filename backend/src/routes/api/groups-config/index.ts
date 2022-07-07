import { FastifyInstance, FastifyRequest } from 'fastify';
import { GroupsConfig } from '../../../types';
import { getGroupsConfig, updateGroupsConfig } from './groupsConfigUtil';

export default async (fastify: FastifyInstance): Promise<void> => {
  fastify.get('/', async () => {
    return getGroupsConfig(fastify);
  });
  fastify.put('/', async (request: FastifyRequest<{ Body: GroupsConfig }>) => {
    return updateGroupsConfig(fastify, request);
  });
};
