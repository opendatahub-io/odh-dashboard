import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { getGroupsConfig, updateGroupsConfig } from './groupsConfigUtil';

export default async (fastify: FastifyInstance): Promise<void> => {
  fastify.get('/', async (request, reply) => {
    return getGroupsConfig(fastify, request)
      .then((res) => {
        return res;
      })
      .catch((res) => {
        reply.send(res);
      });
  });
  fastify.post('/', async (request: FastifyRequest, reply: FastifyReply) => {
    return updateGroupsConfig(fastify, request)
      .then((res) => {
        return res;
      })
      .catch((res) => {
        reply.send(res);
      });
  });
};
