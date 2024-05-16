import { FastifyReply, FastifyRequest } from 'fastify';
import { PatchUtils } from '@kubernetes/client-node';
import { secureAdminRoute } from '../../../utils/route-security';
import { KubeFastifyInstance, ModelRegistryKind, RecursivePartial } from '../../../types';
import { MODEL_REGISTRY_NAMESPACE } from '../../../utils/constants';

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
          const response = await fastify.kube.customObjectsApi.listNamespacedCustomObject(
            'modelregistry.opendatahub.io',
            'v1alpha1',
            MODEL_REGISTRY_NAMESPACE,
            'modelregistries',
            undefined,
            undefined,
            undefined,
            labelSelector,
          );
          return response.body;
        } catch (e) {
          fastify.log.error(
            `ModelRegistries could not be listed, ${e.response?.body?.message || e.message}`,
          );
          reply.send(e);
        }
      },
    ),
  );

  fastify.post(
    '/',
    secureAdminRoute(fastify)(
      async (
        request: FastifyRequest<{
          Querystring: { dryRun?: string };
          Body: ModelRegistryKind;
        }>,
        reply: FastifyReply,
      ) => {
        const { dryRun } = request.query;
        const modelRegistry = request.body;
        try {
          const response = await fastify.kube.customObjectsApi.createNamespacedCustomObject(
            'modelregistry.opendatahub.io',
            'v1alpha1',
            MODEL_REGISTRY_NAMESPACE,
            'modelregistries',
            request.body,
            undefined,
            dryRun,
          );
          return response.body;
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

  fastify.get(
    '/:modelRegistryName',
    secureAdminRoute(fastify)(
      async (
        request: FastifyRequest<{ Params: { modelRegistryName: string } }>,
        reply: FastifyReply,
      ) => {
        const { modelRegistryName } = request.params;
        try {
          const response = await fastify.kube.customObjectsApi.getNamespacedCustomObject(
            'modelregistry.opendatahub.io',
            'v1alpha1',
            MODEL_REGISTRY_NAMESPACE,
            'modelregistries',
            modelRegistryName,
          );
          return response.body;
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

  fastify.patch(
    '/:modelRegistryName',
    secureAdminRoute(fastify)(
      async (
        request: FastifyRequest<{
          Querystring: { dryRun?: string };
          Params: { modelRegistryName: string };
          Body: RecursivePartial<ModelRegistryKind>;
        }>,
        reply: FastifyReply,
      ) => {
        const options = {
          headers: { 'Content-type': PatchUtils.PATCH_FORMAT_JSON_PATCH },
        };
        const { dryRun } = request.query;
        const { modelRegistryName } = request.params;
        try {
          const response = await fastify.kube.customObjectsApi.patchNamespacedCustomObject(
            'modelregistry.opendatahub.io',
            'v1alpha1',
            MODEL_REGISTRY_NAMESPACE,
            'modelregistries',
            modelRegistryName,
            request.body,
            dryRun,
            undefined,
            undefined,
            options,
          );
          return response.body;
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
          const response = await fastify.kube.customObjectsApi.deleteNamespacedCustomObject(
            'modelregistry.opendatahub.io',
            'v1alpha1',
            MODEL_REGISTRY_NAMESPACE,
            'modelregistries',
            modelRegistryName,
            undefined,
            undefined,
            undefined,
            dryRun,
          );
          return response.body;
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
