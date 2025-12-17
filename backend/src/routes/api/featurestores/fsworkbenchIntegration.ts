import { FastifyReply } from 'fastify';
import { KubeFastifyInstance, OauthFastifyRequest } from '../../../types';
import { getAccessToken, getDirectCallOptions } from '../../../utils/directCallUtils';
import { secureRoute } from '../../../utils/route-security';
import { getNamespaces } from '../../../utils/notebookUtils';
import {
  parseNamespacesData,
  getClientConfigs,
  fetchFromRegistry,
  fetchConfigMap,
  type ClientConfigInfo,
  handleError,
} from './featureStoreUtils';

interface WorkbenchResponse {
  namespaces: Array<{
    namespace: string;
    clientConfigs: Array<{
      configName: string;
      projectName: string;
      hasAccessToFeatureStore: boolean;
    }>;
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
    if (!projects || projects.length === 0) {
      return false;
    }
    const hasAccess = projects.some((p) => p.name === projectName || p.project === projectName);
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

        const allClientConfigsData = await getClientConfigs(
          fastify,
          Object.fromEntries(
            namespaces.map(({ namespace, clientConfigs }) => [namespace, clientConfigs]),
          ),
        );

        const accessResults = await checkMultipleFeatureStoreAccess(
          fastify,
          allClientConfigsData,
          token,
        );

        const namespaceResults = namespaces.map(({ namespace }) => {
          const namespaceConfigs = allClientConfigsData.filter(
            (config) => config.namespace === namespace,
          );
          const accessibleConfigs = namespaceConfigs
            .filter((config) => accessResults.get(config.projectName))
            .map((config) => ({
              configName: config.configName,
              projectName: config.projectName,
              hasAccessToFeatureStore: accessResults.get(config.projectName) ?? false,
            }));
          return {
            namespace,
            clientConfigs: accessibleConfigs,
          };
        });

        const response: WorkbenchResponse = {
          namespaces: namespaceResults.filter((ns) => ns.clientConfigs.length > 0),
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
