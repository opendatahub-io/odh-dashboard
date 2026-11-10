import type { FastifyRequest } from 'fastify';
import type { AIHubNamespaceResponse } from '@odh-dashboard/k8s-core/aihub';
import { KubeFastifyInstance } from '../../../types';
import { getAIHub, getAIHubFetchError } from '../../../utils/resourceUtils';
import { isAIHubResourceNotFoundError, getAIHubRouteError } from '../../../utils/aihub';
import { getUserInfo } from '../../../utils/userUtils';
import { isUserAdmin, isUserAllowed } from '../../../utils/adminUtils';
import { createCustomError } from '../../../utils/requestUtils';

export default async (fastify: KubeFastifyInstance): Promise<void> => {
  fastify.get('/', async (request: FastifyRequest): Promise<AIHubNamespaceResponse | null> => {
    await getUserInfo(fastify, request);
    const canAccessDashboard =
      (await isUserAdmin(fastify, request)) || (await isUserAllowed(fastify, request));
    if (!canAccessDashboard) {
      throw createCustomError('Forbidden', 'You are not permitted to access the dashboard.', 403);
    }

    const aiHub = getAIHub(fastify);
    const fetchError = getAIHubFetchError();
    if (fetchError) {
      if (isAIHubResourceNotFoundError(fetchError)) {
        return null;
      }
      throw getAIHubRouteError(fetchError);
    }

    if (!aiHub) {
      throw getAIHubRouteError();
    }
    // The watcher uses dashboard credentials; expose only the namespace needed by the UI.
    return { instancesNamespace: aiHub.spec.instancesNamespace };
  });
};
