import { FastifyReply, FastifyRequest } from 'fastify';
import { secureAdminRoute } from '../../../utils/route-security';
import { KubeFastifyInstance, ModelRegistryKind, RecursivePartial } from '../../../types';
import createError from 'http-errors';
import {
  createModelRegistryAndCredentials,
  deleteModelRegistryAndSecret,
  getDatabasePassword,
  getModelRegistry,
  getModelRegistryNamespace,
  listModelRegistries,
  patchModelRegistryAndUpdateCredentials,
} from './modelRegistryUtils';

type ModelRegistryAndCredentials = {
  modelRegistry: ModelRegistryKind;
  databasePassword?: string;
  newDatabaseCACertificate?: string;
};

// Lists ModelRegistries directly (does not look up passwords from associated Secrets, you must make a direct request to '/:modelRegistryName' for that)
export default async (fastify: KubeFastifyInstance): Promise<void> => {
  fastify.get(
    '/',
    secureAdminRoute(fastify)(
      async (
        request: FastifyRequest<{ Querystring: { labelSelector: string } }>,
        reply: FastifyReply,
      ) => {
        const { labelSelector } = request.query;
        try {
          const modelRegistryNamespace = getModelRegistryNamespace(fastify);
          return listModelRegistries(fastify, modelRegistryNamespace, labelSelector);
        } catch (e) {
          fastify.log.error(
            `ModelRegistries could not be listed, ${e.response?.body?.message || e.message}`,
          );
          reply.send(e);
        }
      },
    ),
  );

  // Accepts a ModelRegistry and a password, creates the MR and an associated Secret
  // Returns the ModelRegistry only
  fastify.post(
    '/',
    secureAdminRoute(fastify)(
      async (
        request: FastifyRequest<{
          Querystring: { dryRun?: string };
          Body: ModelRegistryAndCredentials;
        }>,
        reply: FastifyReply,
      ) => {
        const { dryRun } = request.query;
        const { modelRegistry, databasePassword, newDatabaseCACertificate } = request.body;
        try {
          const modelRegistryNamespace = getModelRegistryNamespace(fastify);
          return createModelRegistryAndCredentials(
            fastify,
            modelRegistry,
            modelRegistryNamespace,
            databasePassword,
            newDatabaseCACertificate,
            !!dryRun,
          ).catch((e) => {
            throw createError(e.statusCode, e?.body?.message);
          });
        } catch (e) {
          fastify.log.error(
            `ModelRegistry ${modelRegistry.metadata.name} could not be created, ${
              e.response?.body?.message || e.message
            }`,
          );
          reply.send(e);
        }
      },
    ),
  );

  // Returns both the ModelRegistry and the password decoded from its associated Secret
  fastify.get(
    '/:modelRegistryName',
    secureAdminRoute(fastify)(
      async (
        request: FastifyRequest<{ Params: { modelRegistryName: string } }>,
        reply: FastifyReply,
      ) => {
        const { modelRegistryName } = request.params;
        try {
          const modelRegistryNamespace = getModelRegistryNamespace(fastify);
          const modelRegistry = await getModelRegistry(
            fastify,
            modelRegistryName,
            modelRegistryNamespace,
          );
          const databasePassword = await getDatabasePassword(
            fastify,
            modelRegistry,
            modelRegistryNamespace,
          );
          return { modelRegistry, databasePassword } satisfies ModelRegistryAndCredentials;
        } catch (e) {
          fastify.log.error(
            `ModelRegistry ${modelRegistryName} could not be read, ${
              e.response?.body?.message || e.message
            }`,
          );
          reply.send(e);
        }
      },
    ),
  );

  // Accepts both a patch for the ModelRegistry and (optionally) a password to replace on the associated Secret
  // Returns the patched ModelRegistry only
  fastify.patch(
    '/:modelRegistryName',
    secureAdminRoute(fastify)(
      async (
        request: FastifyRequest<{
          Querystring: { dryRun?: string };
          Params: { modelRegistryName: string };
          Body: RecursivePartial<ModelRegistryAndCredentials>;
        }>,
        reply: FastifyReply,
      ) => {
        const { dryRun } = request.query;
        const { modelRegistryName } = request.params;
        const {
          modelRegistry: patchBody,
          databasePassword,
          newDatabaseCACertificate,
        } = request.body;
        try {
          const modelRegistryNamespace = getModelRegistryNamespace(fastify);
          const modelRegistry = await patchModelRegistryAndUpdateCredentials(
            fastify,
            modelRegistryName,
            modelRegistryNamespace,
            patchBody,
            databasePassword,
            newDatabaseCACertificate,
            !!dryRun,
          );
          return { modelRegistry, databasePassword };
        } catch (e) {
          fastify.log.error(
            `ModelRegistry ${modelRegistryName} could not be modified, ${
              e.response?.body?.message || e.message
            }`,
          );
          reply.send(e);
        }
      },
    ),
  );

  // Deletes both the ModelRegistry and its associated Secret
  fastify.delete(
    '/:modelRegistryName',
    secureAdminRoute(fastify)(
      async (
        request: FastifyRequest<{
          Querystring: { dryRun?: string };
          Params: { modelRegistryName: string };
        }>,
        reply: FastifyReply,
      ) => {
        const { dryRun } = request.query;
        const { modelRegistryName } = request.params;
        try {
          const modelRegistryNamespace = getModelRegistryNamespace(fastify);
          return deleteModelRegistryAndSecret(
            fastify,
            modelRegistryName,
            modelRegistryNamespace,
            !!dryRun,
          );
        } catch (e) {
          fastify.log.error(
            `ModelRegistry ${modelRegistryName} could not be deleted, ${
              e.response?.body?.message || e.message
            }`,
          );
          reply.send(e);
        }
      },
    ),
  );
};
