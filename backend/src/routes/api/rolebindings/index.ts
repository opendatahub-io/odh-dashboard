import { KubeFastifyInstance } from '../../../types';
import { FastifyReply, FastifyRequest } from 'fastify';
import { secureRoute } from '../../../utils/route-security';
import { getNamespaces } from '../../../utils/notebookUtils';

export default async (fastify: KubeFastifyInstance): Promise<void> => {
  fastify.get(
    '/:namespace/:name',
    secureRoute(fastify)(
      async (
        request: FastifyRequest<{ Params: { namespace: string; name: string } }>,
        reply: FastifyReply,
      ) => {
        const rbName = request.params.name;
        const rbNamespace = request.params.namespace;
        try {
          return await fastify.kube.customObjectsApi.getNamespacedCustomObject({
            group: 'rbac.authorization.k8s.io',
            version: 'v1',
            namespace: rbNamespace,
            plural: 'rolebindings',
            name: rbName,
          });
        } catch (e) {
          fastify.log.error(
            `rolebinding ${rbName} could not be read, ${e.response?.body?.message || e.message}`,
          );
          reply.send(e);
        }
      },
    ),
  );

  fastify.post(
    '/',
    secureRoute(fastify)(async (_request: FastifyRequest, reply: FastifyReply) => {
      const { workbenchNamespace, dashboardNamespace } = getNamespaces(fastify);
      const roleBindingName = `${workbenchNamespace}-image-pullers`;
      const roleBindingObject = {
        apiVersion: 'rbac.authorization.k8s.io/v1',
        kind: 'RoleBinding',
        metadata: {
          name: roleBindingName,
          namespace: dashboardNamespace,
        },
        roleRef: {
          apiGroup: 'rbac.authorization.k8s.io',
          kind: 'ClusterRole',
          name: 'system:image-puller',
        },
        subjects: [
          {
            apiGroup: 'rbac.authorization.k8s.io',
            kind: 'Group',
            name: `system:serviceaccounts:${workbenchNamespace}`,
          },
        ],
      };
      try {
        return await fastify.kube.customObjectsApi.createNamespacedCustomObject({
          group: 'rbac.authorization.k8s.io',
          version: 'v1',
          namespace: dashboardNamespace,
          plural: 'rolebindings',
          body: roleBindingObject,
        });
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
    }),
  );
};
