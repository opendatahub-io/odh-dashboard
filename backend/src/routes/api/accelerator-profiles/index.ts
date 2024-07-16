import { FastifyReply, FastifyRequest } from 'fastify';
import {
  deleteAcceleratorProfile,
  postAcceleratorProfile,
  updateAcceleratorProfile,
} from './acceleratorProfilesUtils';
import { secureAdminRoute } from '../../../utils/route-security';
import { KubeFastifyInstance } from '../../../types';

export default async (fastify: KubeFastifyInstance): Promise<void> => {
  fastify.delete(
    '/:acceleratorProfileName',
    secureAdminRoute(fastify)(async (request: FastifyRequest, reply: FastifyReply) =>
      deleteAcceleratorProfile(fastify, request)
        .then((res) => res)
        .catch((res) => {
          reply.send(res);
        }),
    ),
  );

  fastify.put(
    '/:acceleratorProfileName',
    secureAdminRoute(fastify)(async (request: FastifyRequest, reply: FastifyReply) =>
      updateAcceleratorProfile(fastify, request)
        .then((res) => res)
        .catch((res) => {
          reply.send(res);
        }),
    ),
  );

  fastify.post(
    '/',
    secureAdminRoute(fastify)(async (request: FastifyRequest, reply: FastifyReply) =>
      postAcceleratorProfile(fastify, request)
        .then((res) => res)
        .catch((res) => {
          reply.send(res);
        }),
    ),
  );
};
