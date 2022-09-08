import { KubeFastifyInstance } from '../../../types';
import { FastifyReply, FastifyRequest } from 'fastify';
import { listComponents, removeComponent } from './list';
import { secureRoute, secureAdminRoute } from '../../../utils/route-security';

module.exports = async (fastify: KubeFastifyInstance) => {
  fastify.get(
    '/',
    secureRoute(fastify)(async (request: FastifyRequest, reply: FastifyReply) => {
      return listComponents(fastify, request)
        .then((res) => {
          return res;
        })
        .catch((res) => {
          reply.send(res);
        });
    }),
  );

  fastify.get(
    '/remove',
    secureAdminRoute(fastify)(async (request: FastifyRequest, reply: FastifyReply) => {
      return removeComponent(fastify, request)
        .then((res) => {
          return res;
        })
        .catch((res) => {
          reply.send(res);
        });
    }),
  );
};
