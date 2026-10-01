import { KubeFastifyInstance, OauthFastifyRequest } from '../../../types';
import { isHttpError } from '../../../utils';
import { createCustomError } from '../../../utils/requestUtils';
import { logRequestDetails } from '../../../utils/fileUtils';
import { getNIMAccount } from '../integrations/nim/nimUtils';
import { checkEditNamespacePermission, ensureLegacyNIMEnabled } from '../namespaces/namespaceUtils';
import { isK8sStatus } from '../k8s/pass-through';
import { get } from 'lodash';

export default async (fastify: KubeFastifyInstance): Promise<void> => {
  const resourceMap: Record<string, { type: 'Secret' | 'ConfigMap'; path: string[] }> = {
    apiKeySecret: { type: 'Secret', path: ['spec', 'apiKeySecret', 'name'] },
    nimPullSecret: { type: 'Secret', path: ['status', 'nimPullSecret', 'name'] },
    nimConfig: { type: 'ConfigMap', path: ['status', 'nimConfig', 'name'] },
  };

  fastify.get(
    '/:nimResource',
    async (
      request: OauthFastifyRequest<{
        Params: { nimResource: string };
        Querystring: { namespace?: string };
      }>,
    ) => {
      logRequestDetails(fastify, request);
      const { nimResource } = request.params;
      const { coreV1Api, namespace: dashboardNamespace } = fastify.kube;
      const isRequestingSecret = nimResource === 'apiKeySecret' || nimResource === 'nimPullSecret';

      if (isRequestingSecret) {
        const { namespace: requestNamespace } = request.query;
        if (!requestNamespace) {
          throw createCustomError('Invalid request', 'Project namespace is required', 400);
        }

        ensureLegacyNIMEnabled();

        const accessReview = await checkEditNamespacePermission(fastify, request, requestNamespace);
        if (isK8sStatus(accessReview)) {
          throw createCustomError(accessReview.reason, accessReview.message, accessReview.code);
        }
        if (!accessReview.status?.allowed) {
          fastify.log.error(
            `User does not have edit permission in project "${requestNamespace}": ${accessReview.status?.reason}`,
          );
          throw createCustomError(
            'Forbidden',
            `You don't have permission to access NIM credentials for this project.`,
            403,
          );
        }

        let namespaceResource;
        try {
          namespaceResource = (await coreV1Api.readNamespace(requestNamespace)).body;
        } catch (e) {
          if (isHttpError(e) && typeof e.response.statusCode === 'number') {
            throw createCustomError('Failed to read namespace', e.message, e.response.statusCode);
          }
          throw e;
        }
        if (namespaceResource.metadata?.annotations?.['opendatahub.io/nim-support'] !== 'true') {
          throw createCustomError(
            'Forbidden',
            'NIM model serving is not enabled for this project.',
            403,
          );
        }
      }

      // Fetch the Account CR to determine the actual resource name dynamically
      const account = await getNIMAccount(fastify);
      if (!account) {
        throw createCustomError('Not found', 'NIM account not found', 404);
      }

      const resourceInfo = resourceMap[nimResource];
      if (!resourceInfo) {
        throw createCustomError('Not found', `Invalid resource type: ${nimResource}`, 404);
      }

      const resourceName = get(account, resourceInfo.path);
      if (!resourceName) {
        fastify.log.error(`Resource name for '${nimResource}' not found in account CR.`);
        throw createCustomError('Not found', `${nimResource} name not found in account`, 404);
      }

      try {
        const result =
          resourceInfo.type === 'Secret'
            ? await coreV1Api.readNamespacedSecret(resourceName, dashboardNamespace)
            : await coreV1Api.readNamespacedConfigMap(resourceName, dashboardNamespace);
        return { body: result.body };
      } catch (e: any) {
        fastify.log.error(
          `Failed to fetch ${resourceInfo.type.toLowerCase()} ${resourceName}: ${e.message}`,
        );
        throw createCustomError('Not found', `${resourceInfo.type} not found`, 404);
      }
    },
  );
};
