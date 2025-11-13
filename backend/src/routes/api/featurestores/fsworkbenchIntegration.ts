import { FastifyReply } from 'fastify';
import { KubeFastifyInstance, OauthFastifyRequest } from '../../../types';
import { getAccessToken, getDirectCallOptions } from '../../../utils/directCallUtils';
import { secureRoute } from '../../../utils/route-security';
import { getNamespaces } from '../../../utils/notebookUtils';
import { orderBy } from 'lodash';
import {
  parseNamespacesData,
  getClientConfigs,
  fetchFromRegistry,
  fetchConfigMap,
  batchFetchConfigMapsByNamespace,
  type ClientConfigInfo,
  handleError,
} from './featureStoreUtils';
import { V1ConfigMap } from '@kubernetes/client-node';

interface WorkbenchFeatureStoreConfig {
  namespace: string;
  configName: string;
  configMap: V1ConfigMap | null;
  hasAccessToFeatureStore: boolean;
}

interface WorkbenchResponse {
  clientConfigs: WorkbenchFeatureStoreConfig[];
  namespaces: Array<{
    namespace: string;
    clientConfigs: string[];
  }>;
}

async function checkFeatureStoreAccess(
  fastify: KubeFastifyInstance,
  registryUrl: string,
  projectName: string,
  userToken?: string,
): Promise<boolean> {
  try {
    const projects = await fetchFromRegistry(fastify, registryUrl, userToken);
    const hasAccess = projects && projects.length > 0;
    return hasAccess;
  } catch (error) {
    fastify.log.info(
      `Access check for ${projectName}: DENIED (registry not accessible) - ${error.message}`,
    );
    return false;
  }
}

async function checkMultipleFeatureStoreAccess(
  fastify: KubeFastifyInstance,
  configs: ClientConfigInfo[],
  userToken?: string,
): Promise<Map<string, boolean>> {
  const accessResults = new Map<string, boolean>();

  const accessPromises = configs.map(async (config) => {
    const hasAccess = await checkFeatureStoreAccess(
      fastify,
      config.registryUrl,
      config.projectName,
      userToken,
    );
    return { name: config.projectName, hasAccess };
  });

  const results = await Promise.all(accessPromises);

  results.forEach(({ name, hasAccess }) => {
    accessResults.set(name, hasAccess);
  });

  return accessResults;
}

async function processNamespaceConfigs(
  fastify: KubeFastifyInstance,
  namespace: string,
  clientConfigs: string[],
  token?: string,
): Promise<WorkbenchFeatureStoreConfig[]> {
  const clientConfigsData = await getClientConfigs(fastify, { [namespace]: clientConfigs });

  if (clientConfigsData.length === 0) {
    return [];
  }

  const accessResults = await checkMultipleFeatureStoreAccess(fastify, clientConfigsData, token);

  const configMapMap = await batchFetchConfigMapsByNamespace(fastify, clientConfigsData);

  const configsWithAccess = clientConfigsData.map((config) => ({
    namespace: config.namespace,
    configName: config.configName,
    configMap: configMapMap.get(`${config.namespace}/${config.configName}`) || null,
    hasAccessToFeatureStore: accessResults.get(config.projectName) || false,
  }));

  return orderBy(configsWithAccess, ['hasAccessToFeatureStore'], ['desc']);
}

export default async (fastify: KubeFastifyInstance): Promise<void> => {
  fastify.get(
    '/workbench-integration',
    secureRoute(fastify)(async (req: OauthFastifyRequest, reply: FastifyReply) => {
      try {
        const { dashboardNamespace } = getNamespaces(fastify);
        const feastConfig = await fetchConfigMap(
          fastify,
          dashboardNamespace,
          'feast-configs-registry',
        );

        if (!feastConfig || !feastConfig.data?.namespaces) {
          return reply.send({
            clientConfigs: [],
            namespaces: [],
          });
        }

        const parsedData = parseNamespacesData(feastConfig.data.namespaces);
        const namespaces = Object.entries(parsedData.namespaces || {}).map(
          ([ns, clientConfigs]) => ({
            namespace: ns,
            clientConfigs: clientConfigs as string[],
          }),
        );

        const token = await getAccessToken(await getDirectCallOptions(fastify, req, ''));

        const namespacePromises = namespaces.map(({ namespace: ns, clientConfigs }) =>
          processNamespaceConfigs(fastify, ns, clientConfigs, token),
        );

        const namespaceResults = await Promise.all(namespacePromises);
        const allClientConfigs = orderBy(
          namespaceResults.flat(),
          ['hasAccessToFeatureStore'],
          ['desc'],
        );

        const response: WorkbenchResponse = {
          clientConfigs: allClientConfigs,
          namespaces,
        };

        return reply.send(response);
      } catch (error) {
        const errorMessage = handleError(fastify, error, 'workbench-integration');
        return reply.code(500).send({
          error: 'Failed to fetch workbench feature store configs',
          message: errorMessage,
          status_code: 500,
        });
      }
    }),
  );
};
