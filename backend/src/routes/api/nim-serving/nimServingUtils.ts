import { KubeFastifyInstance, OauthFastifyRequest } from '../../../types';
import { createSelfSubjectAccessReview } from '../../../utils/authUtils';
import { isK8sStatus } from '../../../utils/pass-through';
import { createCustomError } from '../../../utils/requestUtils';
import { getDashboardConfig } from '../../../utils/resourceUtils';

/** Security checks must not honor client-supplied feature flag overrides. */
export const ensureLegacyNIMEnabled = (): void => {
  const { disableNIMModelServing } = getDashboardConfig().spec.dashboardConfig;
  if (disableNIMModelServing !== undefined && disableNIMModelServing !== false) {
    throw createCustomError('Forbidden', 'Legacy NVIDIA NIM model serving is disabled.', 403);
  }
};

export const ensureLegacyNIMSecretAccess = async (
  fastify: KubeFastifyInstance,
  request: OauthFastifyRequest,
  namespace?: string | string[],
): Promise<void> => {
  if (
    typeof namespace !== 'string' ||
    namespace.length > 63 ||
    !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(namespace)
  ) {
    throw createCustomError('Bad Request', 'A valid target project namespace is required.', 400);
  }

  ensureLegacyNIMEnabled();
  const review = await createSelfSubjectAccessReview(fastify, request, {
    group: '',
    resource: 'secrets',
    verb: 'create',
    namespace,
  });
  if (isK8sStatus(review)) {
    throw createCustomError('Forbidden', 'Unable to authorize NIM credential access.', 403);
  }
  if (review.status?.allowed !== true) {
    throw createCustomError('Forbidden', 'You cannot create Secrets in this project.', 403);
  }

  const result = await fastify.kube.coreV1Api.readNamespace(namespace);
  if (result.body.metadata?.annotations?.['opendatahub.io/nim-support'] !== 'true') {
    throw createCustomError('Forbidden', 'Legacy NVIDIA NIM is not enabled for this project.', 403);
  }
};
