import { secureAdminRoute } from '../../../utils/route-security';
import { KubeFastifyInstance } from '../../../types';
import { getModelRegistryNamespace } from '../modelRegistries/modelRegistryUtils';
import { listModelRegistryCertificateNames } from './modelRegistryCertificatesUtils';
import { FastifyReply, FastifyRequest } from 'fastify';

export default async (fastify: KubeFastifyInstance): Promise<void> => {
  fastify.get(
    '/',
    secureAdminRoute(fastify)(async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const modelRegistryNamespace = getModelRegistryNamespace(fastify);
        return listModelRegistryCertificateNames(fastify, modelRegistryNamespace);
      } catch (e) {
        fastify.log.error(
          `Model registry certificate names could not be listed, ${
            e.response?.body?.message || e.message
          }`,
        );
        reply.send(e);
      }
    }),
  );
};
