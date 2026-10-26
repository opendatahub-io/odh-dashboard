import type { AIHubKind } from '@odh-dashboard/k8s-core/aihub';
import type { KubeFastifyInstance } from '../types';
import { createCustomError } from './requestUtils';

export const AIHUB_GROUP = 'components.platform.opendatahub.io';
export const AIHUB_VERSION = 'v1alpha1';
export const AIHUB_PLURAL = 'aihubs';
export const AIHUB_NAME = 'default-aihub';

const DSC_GROUP = 'datasciencecluster.opendatahub.io';
const DSC_VERSION = 'v2';
const DSC_PLURAL = 'datascienceclusters';
const DSC_NAME = 'default-dsc';

type DataScienceClusterResource = {
  spec?: {
    components?: {
      modelregistry?: {
        registriesNamespace?: string;
      };
    };
  };
  status?: {
    components?: {
      modelregistry?: {
        registriesNamespace?: string;
      };
    };
  };
};

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
    // RHOAI releases before the AIHub CRD was introduced expose the same
    // model-registry namespace through the DataScienceCluster. Keep the
    // upstream AIHub contract when it exists, but allow the dashboard to run
    // against those installations without requiring a synthetic CRD.
    if (getAIHubErrorStatus(error) === 404) {
      try {
        const response = await fastify.kube.customObjectsApi.getClusterCustomObject(
          DSC_GROUP,
          DSC_VERSION,
          DSC_PLURAL,
          DSC_NAME,
        );
        const dsc = response.body as DataScienceClusterResource;
        const instancesNamespace =
          dsc.status?.components?.modelregistry?.registriesNamespace ??
          dsc.spec?.components?.modelregistry?.registriesNamespace;

        if (instancesNamespace) {
          fastify.log.info(
            { instancesNamespace },
            'AIHub CR is unavailable; using the DataScienceCluster model-registry namespace',
          );
          return {
            apiVersion: 'components.platform.opendatahub.io/v1alpha1',
            kind: 'AIHub',
            metadata: { name: AIHUB_NAME },
            spec: { instancesNamespace },
          };
        }
      } catch (fallbackError) {
        fastify.log.debug(
          { statusCode: getAIHubErrorStatus(fallbackError) },
          'DataScienceCluster AIHub compatibility fallback was unavailable',
        );
      }
    }
    fastify.log.error({ statusCode: getAIHubErrorStatus(error) }, 'Failure to fetch AIHub');
    throw error;
  }
};
