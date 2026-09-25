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
    body?: unknown;
    status?: unknown;
    statusCode?: unknown;
  };
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

export const getAIHubErrorStatus = (error: unknown): number | undefined => {
  if (typeof error !== 'object' || error === null) {
    return undefined;
  }

  const { code, statusCode, response } = error as KubernetesApiError;
  return [response?.statusCode, response?.status, statusCode, code].find(
    (status): status is number => typeof status === 'number',
  );
};

export const isAIHubResourceNotFoundError = (error: unknown): boolean => {
  if (getAIHubErrorStatus(error) !== 404 || !isRecord(error)) {
    return false;
  }

  const body = (error as KubernetesApiError).response?.body;
  if (!isRecord(body) || body.reason !== 'NotFound' || !isRecord(body.details)) {
    return false;
  }

  return (
    body.details.name === AIHUB_NAME &&
    body.details.group === AIHUB_GROUP &&
    body.details.kind === AIHUB_PLURAL
  );
};

export const getAIHubRouteError = (error?: unknown): ReturnType<typeof createCustomError> => {
  switch (getAIHubErrorStatus(error)) {
    case 404:
      return createCustomError(
        'AIHub API unavailable',
        'Unable to access the AIHub API. Verify that AIHub is installed and configured correctly.',
        503,
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
