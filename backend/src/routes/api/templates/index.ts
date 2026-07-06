import { FastifyReply, FastifyRequest } from 'fastify';
import { PatchUtils } from '@kubernetes/client-node';
import { KubeFastifyInstance, RecursivePartial, Template } from '../../../types';
import { secureAdminRoute } from '../../../utils/route-security';

module.exports = async (fastify: KubeFastifyInstance) => {
  fastify.get(
    '/:namespace/:name',
    secureAdminRoute(fastify)(
      async (
        request: FastifyRequest<{ Params: { namespace: string; name: string } }>,
        reply: FastifyReply,
      ) => {
        const { namespace, name } = request.params;
        try {
          const response = await fastify.kube.customObjectsApi.getNamespacedCustomObject(
            'template.openshift.io',
            'v1',
            namespace,
            'templates',
            name,
          );
          return response.body;
        } catch (e) {
          fastify.log.error(
            `Template ${name} could not be read, ${e.response?.body?.message || e.message}`,
          );
          reply.send(e);
        }
      },
    ),
  );

  fastify.get(
    '/:namespace',
    secureAdminRoute(fastify)(
      async (
        request: FastifyRequest<{
          Params: { namespace: string };
          Querystring: { labelSelector: string };
        }>,
        reply: FastifyReply,
      ) => {
        const { namespace } = request.params;
        const { labelSelector } = request.query;
        try {
          const response = await fastify.kube.customObjectsApi.listNamespacedCustomObject(
            'template.openshift.io',
            'v1',
            namespace,
            'templates',
            undefined,
            undefined,
            undefined,
            labelSelector,
          );
          return response.body;
        } catch (e) {
          fastify.log.error(
            `Templates could not be listed, ${e.response?.body?.message || e.message}`,
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
          Body: Template;
        }>,
        reply: FastifyReply,
      ) => {
        const { dryRun } = request.query;
        const template = request.body;
        try {
          const response = await fastify.kube.customObjectsApi.createNamespacedCustomObject(
            'template.openshift.io',
            'v1',
            template.metadata.namespace,
            'templates',
            template,
            undefined,
            dryRun,
          );
          return response.body;
        } catch (e) {
          fastify.log.error(
            `Template ${template.metadata.name} could not be created, ${
              e.response?.body?.message || e.message
            }`,
          );
          reply.send(e);
        }
      },
    ),
  );

  fastify.patch(
    '/:namespace/:name',
    secureAdminRoute(fastify)(
      async (
        request: FastifyRequest<{
          Params: { namespace: string; name: string };
          Body: RecursivePartial<Template>;
        }>,
        reply: FastifyReply,
      ) => {
        const options = {
          headers: { 'Content-type': PatchUtils.PATCH_FORMAT_JSON_PATCH },
        };
        const { namespace, name } = request.params;
        try {
          const response = await fastify.kube.customObjectsApi.patchNamespacedCustomObject(
            'template.openshift.io',
            'v1',
            namespace,
            'templates',
            name,
            request.body,
            undefined,
            undefined,
            undefined,
            options,
          );
          return response.body;
        } catch (e) {
          fastify.log.error(
            `Template ${name} could not be modified, ${e.response?.body?.message || e.message}`,
          );
          reply.send(e);
        }
      },
    ),
  );

  fastify.delete(
    '/:namespace/:name',
    secureAdminRoute(fastify)(
      async (
        request: FastifyRequest<{ Params: { namespace: string; name: string } }>,
        reply: FastifyReply,
      ) => {
        const { namespace, name } = request.params;
        try {
          const response = await fastify.kube.customObjectsApi.deleteNamespacedCustomObject(
            'template.openshift.io',
            'v1',
            namespace,
            'templates',
            name,
          );
          return response.body;
        } catch (e) {
          fastify.log.error(
            `Template ${name} could not be deleted, ${e.response?.body?.message || e.message}`,
          );
          reply.send(e);
        }
      },
    ),
  );
};
