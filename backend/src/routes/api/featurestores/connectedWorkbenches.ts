import { FastifyReply } from 'fastify';
import { KubeFastifyInstance, OauthFastifyRequest } from '../../../types';
import { getAccessToken, getDirectCallOptions } from '../../../utils/directCallUtils';
import { secureRoute } from '../../../utils/route-security';
import {
  listFeastNamespaces,
  listFeastFeatureStoreCRDs,
  listUserOpenShiftProjects,
  listFeastIntegrationNotebooks,
  constructRegistryProxyUrl,
  makeAuthenticatedHttpRequest,
  handleError,
  isRegistryReady,
  getServiceFromCRD,
  extractPermissionLevel,
  buildWorkbenchesByFeastProjectMap,
  getFeastProjectRegistryInfo,
  type FeatureStoreCRD,
  type FeastPermissionsResponse,
  type ConnectedWorkbenchEntry,
} from './featureStoreUtils';

interface FeastProjectWithWorkbenches {
  feastProjectName: string;
  namespace: string;
  description?: string;
  permissionLevel: string[];
  connectedWorkbenches: ConnectedWorkbenchEntry[];
}

interface ConnectedWorkbenchesResponse {
  connectedWorkbenches: FeastProjectWithWorkbenches[];
}

async function fetchPermissionLevel(
  fastify: KubeFastifyInstance,
  crd: FeatureStoreCRD,
  feastProjectName: string,
  token: string,
): Promise<string[]> {
  try {
    const { serviceName, namespace, protocol, port } = getServiceFromCRD(crd);
    const permissionsPath = `api/v1/permissions?project=${encodeURIComponent(feastProjectName)}`;
    const registryUrl = constructRegistryProxyUrl(
      serviceName,
      namespace,
      permissionsPath,
      true,
      protocol,
      port,
    );
    const { data, statusCode } = await makeAuthenticatedHttpRequest<FeastPermissionsResponse>(
      fastify,
      registryUrl,
      token,
      {},
    );

    if (statusCode < 200 || statusCode >= 300) {
      throw new Error(`Registry permissions returned ${statusCode}`);
    }

    return extractPermissionLevel(data);
  } catch (error) {
    fastify.log.info(
      `Permissions check for ${crd.metadata.namespace}/${feastProjectName}: unavailable ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
    return [];
  }
}

export default async (fastify: KubeFastifyInstance): Promise<void> => {
  fastify.get(
    '/projects-with-workbenches',
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

        const feastNamespaces = await listFeastNamespaces(fastify, kubeHeaders);

        if (feastNamespaces.length === 0) {
          return reply.send({ connectedWorkbenches: [] });
        }

        const crdsByNamespace = await Promise.all(
          feastNamespaces.map((ns) => listFeastFeatureStoreCRDs(fastify, ns, kubeHeaders)),
        );

        const userProjectNamespaces = await listUserOpenShiftProjects(fastify, kubeHeaders);
        const notebooksByNamespace = await Promise.all(
          userProjectNamespaces.map((ns) =>
            listFeastIntegrationNotebooks(fastify, ns, kubeHeaders),
          ),
        );
        const workbenchMap = buildWorkbenchesByFeastProjectMap(notebooksByNamespace.flat());

        const projectResults = await Promise.all(
          crdsByNamespace.map(async (crds) => {
            const availableFeatureStores = crds.filter(isRegistryReady);

            const projectRows = await Promise.all(
              availableFeatureStores.map(async (crd) => {
                const feastProjectName = crd.spec?.feastProject ?? crd.metadata.name;
                const { hasAccess, description } = await getFeastProjectRegistryInfo(
                  fastify,
                  crd,
                  feastProjectName,
                  token,
                );

                if (!hasAccess) {
                  return null;
                }

                const permissionLevel = await fetchPermissionLevel(
                  fastify,
                  crd,
                  feastProjectName,
                  token,
                );
                const row: FeastProjectWithWorkbenches = {
                  feastProjectName,
                  namespace: crd.metadata.namespace,
                  permissionLevel,
                  connectedWorkbenches: workbenchMap.get(feastProjectName) ?? [],
                };
                if (description) {
                  row.description = description;
                }
                return row;
              }),
            );

            return projectRows.filter((row) => row !== null);
          }),
        );

        const response: ConnectedWorkbenchesResponse = {
          connectedWorkbenches: projectResults.flat(),
        };

        return reply.send(response);
      } catch (error) {
        const errorMessage = handleError(fastify, error, 'projects-with-workbenches');
        return reply.code(500).send({
          error: 'Failed to fetch projects with connected workbenches',
          message: errorMessage,
          status_code: 500,
        });
      }
    }),
  );
};
