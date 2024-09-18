import { FastifyReply, FastifyRequest } from 'fastify';
import { secureAdminRoute } from '../../../utils/route-security';
import { KubeFastifyInstance } from '../../../types';
import {
  createModelRegistryRoleBinding,
  deleteModelRegistriesRolebinding,
  listModelRegistryRoleBindings,
} from './modelRegistryRolebindingsUtils';
import { V1RoleBinding } from '@kubernetes/client-node';
import { getModelRegistryNamespace } from '../modelRegistries/modelRegistryUtils';

export default async (fastify: KubeFastifyInstance): Promise<void> => {
  fastify.get(
    `/`,
    secureAdminRoute(fastify)(async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const mrNamespace = getModelRegistryNamespace(fastify);
        return listModelRegistryRoleBindings(fastify, mrNamespace);
      } catch (e) {
        fastify.log.error(
          `ModelRegistry RoleBindings could not be listed, ${
            e.response?.body?.message || e.message
          }`,
        );
        reply.send(e);
      }
    }),
  );

  fastify.post(
    '/',
    secureAdminRoute(fastify)(
      async (request: FastifyRequest<{ Body: V1RoleBinding }>, reply: FastifyReply) => {
        const rbRequest = request.body;
        try {
          const mrNamespace = getModelRegistryNamespace(fastify);
          return createModelRegistryRoleBinding(fastify, rbRequest, mrNamespace);
        } catch (e) {
          if (e.response?.statusCode === 409) {
            fastify.log.warn(`Rolebinding already present, skipping creation.`);
            return {};
          }

          fastify.log.error(
            `rolebinding could not be created: ${e.response?.body?.message || e.message}`,
          );
          reply.send(new Error(e.response?.body?.message));
        }
      },
    ),
  );

  fastify.delete(
    '/:name',
    secureAdminRoute(fastify)(
      async (request: FastifyRequest<{ Params: { name: string } }>, reply: FastifyReply) => {
        const modelRegistryNamespace = await getModelRegistryNamespace(fastify);
        const { name } = request.params;
        try {
          const mrNamespace = getModelRegistryNamespace(fastify);
          return deleteModelRegistriesRolebinding(fastify, name, mrNamespace);
        } catch (e) {
          fastify.log.error(
            `RoleBinding ${name} could not be deleted from ${modelRegistryNamespace}, ${
              e.response?.body?.message || e.message
            }`,
          );
          reply.send(e);
        }
      },
    ),
  );
};
