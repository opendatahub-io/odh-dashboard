import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { listDocs } from './list';
import { secureRoute } from '../../../utils/route-security';

export default async (fastify: FastifyInstance): Promise<void> => {
  fastify.get(
    '/',
    secureRoute(fastify)(async (request: FastifyRequest, reply: FastifyReply) => {
      return listDocs(fastify, request)
        .then((res) => {
          return res;
        })
        .catch((res) => {
          reply.send(res);
        });
    }),
  );
};
