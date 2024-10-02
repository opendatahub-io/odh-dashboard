import { KubeFastifyInstance, OauthFastifyRequest } from '../../../types';
import { createCustomError } from '../../../utils/requestUtils';
import { logRequestDetails } from '../../../utils/fileUtils';

const secretNames = ['nvidia-nim-access', 'nvidia-nim-image-pull'];
const configMapName = 'nvidia-nim-images-data';

export default async (fastify: KubeFastifyInstance): Promise<void> => {
  fastify.get(
    '/:nimResource',
    async (
      request: OauthFastifyRequest<{
        Params: { nimResource: string };
      }>,
    ) => {
      logRequestDetails(fastify, request);
      const { nimResource } = request.params;
      const { coreV1Api, namespace } = fastify.kube;

      if (secretNames.includes(nimResource)) {
        try {
          return await coreV1Api.readNamespacedSecret(nimResource, namespace);
        } catch (e) {
          fastify.log.error(`Failed to fetch secret ${nimResource}: ${e.message}`);
          throw createCustomError('Not found', 'Secret not found', 404);
        }
      }

      if (nimResource === configMapName) {
        try {
          return await coreV1Api.readNamespacedConfigMap(configMapName, namespace);
        } catch (e) {
          fastify.log.error(`Failed to fetch configMap ${nimResource}: ${e.message}`);
          throw createCustomError('Not found', 'ConfigMap not found', 404);
        }
      }
      throw createCustomError('Not found', 'Resource not found', 404);
    },
  );
};
