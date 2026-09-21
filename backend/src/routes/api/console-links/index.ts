import { FastifyReply, FastifyRequest } from 'fastify';
import { listConsoleLinks } from './list';
import { KubeFastifyInstance } from '../../../types';
import { secureRoute } from '../../../utils/route-security';

export default async (fastify: KubeFastifyInstance): Promise<void> => {
  fastify.get(
    '/',
    secureRoute(fastify)(async (request: FastifyRequest, reply: FastifyReply) =>
      listConsoleLinks()
        .then((res) => res)
        .catch((res) => {
          reply.send(res);
        }),
    ),
  );
};
