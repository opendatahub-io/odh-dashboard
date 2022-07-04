import { KubeFastifyInstance } from '../../../types';
import { FastifyReply, FastifyRequest } from 'fastify';
import { getDashboardConfig } from '../../../utils/resourceUtils';
import { setDashboardConfig } from './configUtils';

module.exports = async (fastify: KubeFastifyInstance) => {
  fastify.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    reply.send(getDashboardConfig());
  });

  fastify.patch('/', async (request: FastifyRequest, reply: FastifyReply) => {
    reply.send(setDashboardConfig(fastify, request.body));
  });
};
