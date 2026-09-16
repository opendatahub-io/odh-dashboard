import { AIHubKind, KubeFastifyInstance } from '../types';
import { createCustomError } from './requestUtils';

export const AIHUB_GROUP = 'components.platform.opendatahub.io';
export const AIHUB_VERSION = 'v1alpha1';
export const AIHUB_PLURAL = 'aihubs';
export const AIHUB_NAME = 'default-aihub';

type KubernetesApiError = {
  code?: unknown;
  statusCode?: unknown;
  response?: {
    status?: unknown;
    statusCode?: unknown;
  };
};

export const getAIHubErrorStatus = (error: unknown): number | undefined => {
  if (typeof error !== 'object' || error === null) {
    return undefined;
  }

  const { code, statusCode, response } = error as KubernetesApiError;
  return [response?.statusCode, response?.status, statusCode, code].find(
    (status): status is number => typeof status === 'number',
  );
};

export const getAIHubRouteError = (error?: unknown): ReturnType<typeof createCustomError> => {
  switch (getAIHubErrorStatus(error)) {
    case 404:
      return createCustomError(
        'AIHub unavailable',
        'AIHub configuration is not available on this cluster.',
        404,
      );
    case 403:
      return createCustomError(
        'AIHub access denied',
        'Dashboard is not permitted to read the AIHub configuration. Contact your cluster administrator.',
      );
    default:
      return createCustomError(
        'AIHub unavailable',
        'Unable to read the AIHub configuration. Please try again later.',
        503,
      );
  }
};

export const fetchAIHub = async (fastify: KubeFastifyInstance): Promise<AIHubKind> => {
  try {
    const response = await fastify.kube.customObjectsApi.getClusterCustomObject(
      AIHUB_GROUP,
      AIHUB_VERSION,
      AIHUB_PLURAL,
      AIHUB_NAME,
    );
    return response.body as AIHubKind;
  } catch (error) {
    fastify.log.error({ error, statusCode: getAIHubErrorStatus(error) }, 'Failure to fetch AIHub');
    throw error;
  }
};
