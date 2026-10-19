import { FastifyReply, FastifyRequest } from 'fastify';
import type { RecursivePartial } from '@odh-dashboard/foundation';
import { KubeFastifyInstance, Template } from '../../../types';
import { secureAdminRoute } from '../../../utils/route-security';
import { JSON_PATCH } from '../../../utils/k8sClient';

export default async (fastify: KubeFastifyInstance): Promise<void> => {
  fastify.get(
    '/:namespace/:name',
    secureAdminRoute(fastify)(
      async (
        request: FastifyRequest<{ Params: { namespace: string; name: string } }>,
        reply: FastifyReply,
      ) => {
        const { namespace, name } = request.params;
        try {
          return await fastify.kube.customObjectsApi.getNamespacedCustomObject({
            group: 'template.openshift.io',
            version: 'v1',
            namespace,
            plural: 'templates',
            name,
          });
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
          return await fastify.kube.customObjectsApi.listNamespacedCustomObject({
            group: 'template.openshift.io',
            version: 'v1',
            namespace,
            plural: 'templates',
            labelSelector,
          });
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
          return await fastify.kube.customObjectsApi.createNamespacedCustomObject({
            group: 'template.openshift.io',
            version: 'v1',
            namespace: template.metadata.namespace,
            plural: 'templates',
            body: template,
            dryRun,
          });
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
        const { namespace, name } = request.params;
        try {
          return await fastify.kube.customObjectsApi.patchNamespacedCustomObject(
            {
              group: 'template.openshift.io',
              version: 'v1',
              namespace,
              plural: 'templates',
              name,
              body: request.body,
            },
            JSON_PATCH,
          );
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
          return await fastify.kube.customObjectsApi.deleteNamespacedCustomObject({
            group: 'template.openshift.io',
            version: 'v1',
            namespace,
            plural: 'templates',
            name,
          });
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
