import { KubeFastifyInstance, OauthFastifyRequest } from '../../../types';
import { createCustomError } from '../../../utils/requestUtils';
import { logRequestDetails } from '../../../utils/fileUtils';
import { getNIMAccount } from '../integrations/nim/nimUtils';
import { get } from 'lodash';

export default async (fastify: KubeFastifyInstance): Promise<void> => {
  const resourceMap: Record<string, { type: 'Secret' | 'ConfigMap'; path: string[] }> = {
    apiKeySecret: { type: 'Secret', path: ['spec', 'apiKeySecret', 'name'] },
    nimPullSecret: { type: 'Secret', path: ['status', 'nimPullSecret', 'name'] },
    nimConfig: { type: 'ConfigMap', path: ['status', 'nimConfig', 'name'] },
  };

  fastify.get(
    '/:nimResource',
    async (request: OauthFastifyRequest<{ Params: { nimResource: string } }>) => {
      logRequestDetails(fastify, request);
      const { nimResource } = request.params;
      const { coreV1Api, namespace } = fastify.kube;

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
        // Fetch the resource from Kubernetes using the dynamically retrieved name
        if (resourceInfo.type === 'Secret') {
          return await coreV1Api.readNamespacedSecret(resourceName, namespace);
        } else {
          return await coreV1Api.readNamespacedConfigMap(resourceName, namespace);
        }
      } catch (e: any) {
        fastify.log.error(
          `Failed to fetch ${resourceInfo.type.toLowerCase()} ${resourceName}: ${e.message}`,
        );
        throw createCustomError('Not found', `${resourceInfo.type} not found`, 404);
      }
    },
  );
};
