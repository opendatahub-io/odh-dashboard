import { FastifyReply } from 'fastify';
import * as https from 'https';
import { KubeFastifyInstance, OauthFastifyRequest } from '../../../types';
import { getAccessToken, getDirectCallOptions } from '../../../utils/directCallUtils';
import { createCustomError } from '../../../utils/requestUtils';
import { getNamespaces } from '../../../utils/notebookUtils';
import {
  parseNamespacesData,
  findRegistryUrlForFeatureStore,
  extractServiceInfo,
  constructRegistryProxyUrl,
  createFeatureStoreResponse,
  filterEnabledCRDs,
  getClientConfigsBatched,
  fetchFromRegistry,
  fetchConfigMap,
  handleError,
  makeAuthenticatedHttpRequest,
  type FeatureStoreCRD,
} from './featureStoreUtils';

interface FeatureStoreResponse {
  featureStores: FeatureStore[];
}

interface FeatureStore {
  name: string;
  project: string;
  registry: {
    path: string;
  };
  namespace?: string;
  status: {
    conditions: Array<{
      type: string;
      status: string;
      lastTransitionTime: string;
    }>;
  };
}

interface CustomObjectResponse {
  body: {
    items?: FeatureStoreCRD[];
  };
}

function buildFeatureStoreResponse(featureStores: FeatureStore[]): FeatureStoreResponse {
  return { featureStores };
}

async function fetchFeatureStoreCRDs(
  fastify: KubeFastifyInstance,
  namespace: string,
): Promise<FeatureStoreCRD[]> {
  try {
    const response = (await fastify.kube.customObjectsApi.listNamespacedCustomObject(
      'feast.dev',
      'v1alpha1',
      namespace,
      'featurestores',
    )) as CustomObjectResponse;

    const items = response.body.items || [];
    return items;
  } catch (error) {
    handleError(fastify, error, `Error fetching FeatureStore CRDs from namespace ${namespace}`);
    return [];
  }
}

async function getEnabledProjectNames(
  fastify: KubeFastifyInstance,
  namespace: string,
): Promise<string[]> {
  const allCrds = await fetchFeatureStoreCRDs(fastify, namespace);
  const enabledCrds = filterEnabledCRDs(allCrds as FeatureStoreCRD[]);

  return enabledCrds.map((crd) => crd.spec?.feastProject).filter(Boolean);
}

async function processFeatureStoreConfigs(
  fastify: KubeFastifyInstance,
  namespace: string,
  clientConfigs: string[],
  enabledProjectNames: string[],
  userToken?: string,
): Promise<FeatureStore[]> {
  const allClientConfigs = await getClientConfigsBatched(fastify, { [namespace]: clientConfigs });

  const filteredConfigs = allClientConfigs.filter((config) =>
    enabledProjectNames.includes(config.projectName),
  );

  const featureStores: FeatureStore[] = [];

  for (const clientConfig of filteredConfigs) {
    const projectName = clientConfig.projectName;
    const registryUrl = clientConfig.registryUrl;

    if (!projectName || !registryUrl) {
      fastify.log.warn(`Client config missing projectName or registryUrl`);
      continue;
    }

    try {
      const registryResponse = await fetchFromRegistry(fastify, registryUrl, userToken);

      featureStores.push(
        ...registryResponse.map((fs) => {
          const name =
            fs.name ||
            extractServiceInfo(registryUrl)
              .serviceName.replace('feast-', '')
              .replace('-registry-rest', '');
          return createFeatureStoreResponse(
            name,
            fs.project || name,
            registryUrl,
            'True',
            namespace,
          );
        }),
      );
    } catch (error) {
      fastify.log.warn(
        `Failed to process client config for project ${projectName} in namespace ${namespace}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  return featureStores;
}

async function handleFeatureStoreProxy(
  fastify: KubeFastifyInstance,
  req: OauthFastifyRequest<{
    Params: { namespace: string; projectName: string };
  }>,
  reply: FastifyReply,
): Promise<void> {
  const { namespace, projectName } = req.params;
  const urlParts = req.url.split('/');
  const namespaceIndex = urlParts.indexOf(namespace);
  const pathAfterProject = urlParts.slice(namespaceIndex + 2).join('/');
  const path = pathAfterProject || 'api/v1/projects';

  const { dashboardNamespace } = getNamespaces(fastify);
  const feastConfig = await fetchConfigMap(fastify, dashboardNamespace, 'feast-configs-registry');

  if (!feastConfig) {
    throw createCustomError(
      'ConfigMap not found',
      'feast-configs-registry ConfigMap not found',
      404,
    );
  }

  if (!feastConfig.data?.namespaces) {
    throw createCustomError(
      'No namespaces data found',
      'feast-configs-registry ConfigMap has no namespaces data',
      404,
    );
  }

  const namespacesData = parseNamespacesData(feastConfig.data.namespaces);
  const clientConfigs = await getClientConfigsBatched(fastify, namespacesData.namespaces);

  const namespaceConfigs = clientConfigs.filter((config) => config.namespace === namespace);
  const registryUrl = findRegistryUrlForFeatureStore(projectName, namespaceConfigs);

  if (!registryUrl) {
    throw createCustomError(
      'Registry URL not found',
      `Registry URL not found for feature store: ${projectName}`,
      404,
    );
  }

  const serviceInfo = extractServiceInfo(registryUrl);
  const proxyUrl = constructRegistryProxyUrl(
    serviceInfo.serviceName,
    serviceInfo.serviceNamespace,
    path,
    true,
    serviceInfo.protocol,
    serviceInfo.port,
  );

  const token = await getAccessToken(await getDirectCallOptions(fastify, req, ''));

  if (!token) {
    throw createCustomError('No access token', 'User authentication required', 401);
  }

  try {
    const { data, statusCode } = await makeAuthenticatedHttpRequest(fastify, proxyUrl, token, {
      timeout: 60000,
      rejectUnauthorized: false,
      agent: new https.Agent({
        rejectUnauthorized: false,
      }),
    });

    reply.code(statusCode).type('application/json').send(data);
  } catch (directError) {
    const errorMessage = handleError(fastify, directError, 'Direct request error');
    throw createCustomError('Registry request failed', errorMessage, 500);
  }
}

export default async (fastify: KubeFastifyInstance): Promise<void> => {
  fastify.get('/', async (req: OauthFastifyRequest<Record<string, never>>, reply: FastifyReply) => {
    try {
      const { dashboardNamespace } = getNamespaces(fastify);
      const feastConfig = await fetchConfigMap(
        fastify,
        dashboardNamespace,
        'feast-configs-registry',
      );

      if (!feastConfig) {
        reply.send({ featureStores: [] });
        return;
      }

      if (!feastConfig.data?.namespaces) {
        fastify.log.warn(`No namespaces data found in ConfigMap ${feastConfig.metadata?.name}`);
        reply.send({ featureStores: [] });
        return;
      }

      const namespacesData = parseNamespacesData(feastConfig.data.namespaces);
      const namespaces = namespacesData.namespaces;

      const token = await getAccessToken(await getDirectCallOptions(fastify, req, ''));

      const namespacePromises = Object.entries(namespaces)
        .filter(([, clientConfigs]) => Array.isArray(clientConfigs))
        .map(async ([ns, clientConfigs]) => {
          const enabledProjectNames = await getEnabledProjectNames(fastify, ns);
          return processFeatureStoreConfigs(fastify, ns, clientConfigs, enabledProjectNames, token);
        });

      const namespaceResults = await Promise.all(namespacePromises);
      const allFeatureStores = namespaceResults.flat();

      reply.send(buildFeatureStoreResponse(allFeatureStores));
    } catch (error) {
      const errorMessage = handleError(
        fastify,
        error,
        'Failed to fetch feature stores from registry',
      );
      throw createCustomError('Failed to fetch feature stores', errorMessage, 500);
    }
  });

  fastify.get(
    '/:namespace/:projectName/*',
    async (
      req: OauthFastifyRequest<{
        Params: { namespace: string; projectName: string };
      }>,
      reply: FastifyReply,
    ) => {
      return handleFeatureStoreProxy(fastify, req, reply);
    },
  );
};
