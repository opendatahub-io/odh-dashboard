import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { secureAdminRoute } from '../../../utils/route-security';
import {
  deleteAcceleratorProfile,
  postAcceleratorProfile,
  updateAcceleratorProfile,
} from './acceleratorProfilesUtils';

export default async (fastify: FastifyInstance): Promise<void> => {
  fastify.delete(
    '/:acceleratorProfileName',
    secureAdminRoute(fastify)(async (request: FastifyRequest, reply: FastifyReply) => {
      return deleteAcceleratorProfile(fastify, request)
        .then((res) => {
          return res;
        })
        .catch((res) => {
          reply.send(res);
        });
    }),
  );

  fastify.put(
    '/:acceleratorProfileName',
    secureAdminRoute(fastify)(async (request: FastifyRequest, reply: FastifyReply) => {
      return updateAcceleratorProfile(fastify, request)
        .then((res) => {
          return res;
        })
        .catch((res) => {
          reply.send(res);
        });
    }),
  );

  fastify.post(
    '/',
    secureAdminRoute(fastify)(async (request: FastifyRequest, reply: FastifyReply) => {
      return postAcceleratorProfile(fastify, request)
        .then((res) => {
          return res;
        })
        .catch((res) => {
          reply.send(res);
        });
    }),
  );
};
