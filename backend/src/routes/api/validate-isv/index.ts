import { FastifyReply, FastifyRequest } from 'fastify';
import { getValidateISVResults, validateISV } from './validateISV';
import { secureRoute } from '../../../utils/route-security';
import { KubeFastifyInstance } from '../../../types';

export default async (fastify: KubeFastifyInstance): Promise<void> => {
  fastify.get(
    '/',
    secureRoute(fastify)(async (request: FastifyRequest, reply: FastifyReply) => {
      return validateISV(fastify, request)
        .then((res) => {
          return res;
        })
        .catch((res) => {
          fastify.log.error(`Failed to create validation job: ${res.response?.body?.message}`);
          reply.send(res);
        });
    }),
  );

  fastify.get(
    '/results',
    secureRoute(fastify)(async (request: FastifyRequest, reply: FastifyReply) => {
      return getValidateISVResults(fastify, request)
        .then((res) => {
          return res;
        })
        .catch((res) => {
          fastify.log.error(`Failed to get validation job results: ${res.response?.body?.message}`);
          reply.send(res);
        });
    }),
  );
};
