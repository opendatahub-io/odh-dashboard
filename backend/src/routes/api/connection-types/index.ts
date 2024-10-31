import { V1ConfigMap } from '@kubernetes/client-node';
import { FastifyReply, FastifyRequest } from 'fastify';
import { KubeFastifyInstance, RecursivePartial } from '../../../types';
import { secureAdminRoute, secureRoute } from '../../../utils/route-security';
import {
  getConnectionType,
  listConnectionTypes,
  createConnectionType,
  updateConnectionType,
  patchConnectionType,
  deleteConnectionType,
} from './connectionTypeUtils';

module.exports = async (fastify: KubeFastifyInstance) => {
  fastify.get(
    '/',
    secureRoute(fastify)(async (request: FastifyRequest, reply: FastifyReply) =>
      listConnectionTypes(fastify)
        .then((res) => res)
        .catch((res) => {
          reply.send(res);
        }),
    ),
  );

  fastify.get(
    '/:name',
    secureRoute(fastify)(
      async (request: FastifyRequest<{ Params: { name: string } }>, reply: FastifyReply) =>
        getConnectionType(fastify, request.params.name)
          .then((res) => res)
          .catch((res) => {
            reply.send(res);
          }),
    ),
  );

  fastify.post(
    '/',
    secureAdminRoute(fastify)(
      async (request: FastifyRequest<{ Body: V1ConfigMap }>, reply: FastifyReply) =>
        createConnectionType(fastify, request.body)
          .then((res) => res)
          .catch((res) => {
            reply.send(res);
          }),
    ),
  );

  fastify.put(
    '/:name',
    secureAdminRoute(fastify)(
      async (
        request: FastifyRequest<{ Params: { name: string }; Body: V1ConfigMap }>,
        reply: FastifyReply,
      ) =>
        updateConnectionType(fastify, request.params.name, request.body)
          .then((res) => res)
          .catch((res) => {
            reply.send(res);
          }),
    ),
  );

  fastify.patch(
    '/:name',
    secureAdminRoute(fastify)(
      async (
        request: FastifyRequest<{ Params: { name: string }; Body: RecursivePartial<V1ConfigMap> }>,
        reply: FastifyReply,
      ) =>
        patchConnectionType(fastify, request.params.name, request.body)
          .then((res) => res)
          .catch((res) => {
            reply.send(res);
          }),
    ),
  );

  fastify.delete(
    '/:name',
    secureAdminRoute(fastify)(
      async (request: FastifyRequest<{ Params: { name: string } }>, reply: FastifyReply) =>
        deleteConnectionType(fastify, request.params.name)
          .then((res) => res)
          .catch((res) => {
            reply.send(res);
          }),
    ),
  );
};
