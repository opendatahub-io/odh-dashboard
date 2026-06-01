import { FastifyReply } from 'fastify';
import { KubeFastifyInstance, OauthFastifyRequest } from '../../../types';
import { getAccessToken, getDirectCallOptions } from '../../../utils/directCallUtils';
import { secureRoute } from '../../../utils/route-security';
import {
  listFeastNamespaces,
  listFeastFeatureStoreCRDs,
  constructRegistryProxyUrl,
  makeAuthenticatedHttpRequest,
  handleError,
  isRegistryReady,
  getServiceFromCRD,
  type FeatureStoreCRD,
  type FeastProjectsResponse,
} from './featureStoreUtils';

interface WorkbenchFeatureStoreConfig {
  configName: string;
  projectName: string;
  hasAccessToFeatureStore: boolean;
}

interface WorkbenchResponse {
  namespaces: Array<{
    namespace: string;
    clientConfigs: WorkbenchFeatureStoreConfig[];
  }>;
}

async function hasAccessToProject(
  fastify: KubeFastifyInstance,
  crd: FeatureStoreCRD,
  token: string,
): Promise<boolean> {
  try {
    const { serviceName, namespace, protocol, port } = getServiceFromCRD(crd);
    const registryUrl = constructRegistryProxyUrl(
      serviceName,
      namespace,
      'api/v1/projects',
      true,
      protocol,
      port,
    );
    const { data, statusCode } = await makeAuthenticatedHttpRequest<FeastProjectsResponse>(
      fastify,
      registryUrl,
      token,
      {},
    );
    if (statusCode < 200 || statusCode >= 300) {
      throw new Error(`Registry returned ${statusCode}`);
    }
    const projectName = crd.spec?.feastProject ?? crd.metadata.name;
    const projects = data.projects || [];
    return projects.some((p) => (p.spec?.name || p.name) === projectName);
  } catch (error) {
    fastify.log.info(
      `Access check for ${crd.metadata.namespace}/${crd.metadata.name}: DENIED ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
    return false;
  }
}

export default async (fastify: KubeFastifyInstance): Promise<void> => {
  fastify.get(
    '/workbench-integration',
    secureRoute(fastify)(async (req: OauthFastifyRequest, reply: FastifyReply) => {
      try {
        const kubeHeaders = (await getDirectCallOptions(fastify, req, '')).headers as Record<
          string,
          string
        >;
        const token = getAccessToken({ headers: kubeHeaders });

        if (!token) {
          return reply.code(401).send({ error: 'User authentication required' });
        }

        const namespaces = await listFeastNamespaces(fastify, kubeHeaders);

        if (namespaces.length === 0) {
          return reply.send({ namespaces: [] });
        }

        // Collect all enabled FeatureStore CRDs across user-accessible namespaces
        const crdsByNamespace = await Promise.all(
          namespaces.map(async (ns) => ({
            ns,
            crds: await listFeastFeatureStoreCRDs(fastify, ns, kubeHeaders),
          })),
        );

        const namespaceResults = await Promise.all(
          crdsByNamespace.map(async ({ ns, crds }) => {
            const availableFeatureStores = crds.filter(isRegistryReady);

            const configResults = await Promise.all(
              availableFeatureStores.map(async (crd) => {
                const projectName = crd.spec?.feastProject ?? crd.metadata.name;
                const hasAccess = await hasAccessToProject(fastify, crd, token);
                return {
                  configName: crd.metadata.name,
                  projectName,
                  hasAccessToFeatureStore: hasAccess,
                };
              }),
            );

            return {
              namespace: ns,
              clientConfigs: configResults.filter((c) => c.hasAccessToFeatureStore),
            };
          }),
        );

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
