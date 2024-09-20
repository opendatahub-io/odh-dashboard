import { KubeFastifyInstance, OauthFastifyRequest } from '../../../types';
import { createCustomError } from '../../../utils/requestUtils';
import { logRequestDetails } from '../../../utils/fileUtils';

const secretNames = ['nvidia-nim-access', 'nvidia-nim-image-pull'];

export default async (fastify: KubeFastifyInstance): Promise<void> => {
  fastify.get(
    '/:secretName',
    async (
      request: OauthFastifyRequest<{
        Params: { secretName: string };
      }>,
    ) => {
      logRequestDetails(fastify, request);
      const { secretName } = request.params;
      if (!secretNames.includes(secretName)) {
        throw createCustomError('Not found', 'Secret not found', 404);
      }
      const { coreV1Api, namespace } = fastify.kube;

      return coreV1Api.readNamespacedSecret(secretName, namespace);
    },
  );
};
