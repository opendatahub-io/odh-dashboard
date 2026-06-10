import { FastifyReply } from 'fastify';
import { KubeFastifyInstance, OauthFastifyRequest } from '../../../types';
import { getAccessToken, getDirectCallOptions } from '../../../utils/directCallUtils';
import createError from 'http-errors';
import { createCustomError } from '../../../utils/requestUtils';
import {
  listFeastNamespaces,
  listFeastFeatureStoreCRDs,
  getFeastFeatureStoreCRD,
  constructRegistryProxyUrl,
  createFeatureStoreResponse,
  makeAuthenticatedHttpRequest,
  handleError,
  isRegistryReady,
  getServiceFromCRD,
  type FeastProjectsResponse,
} from './featureStoreUtils';

interface FeatureStoreResponse {
  featureStores: FeatureStore[];
  enabledCRDCount: number;
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

function buildFeatureStoreResponse(
  featureStores: FeatureStore[],
  enabledCRDCount: number,
): FeatureStoreResponse {
  return { featureStores, enabledCRDCount };
}

export default async (fastify: KubeFastifyInstance): Promise<void> => {
  /**
   * GET /api/featurestores/
   *
   * Discovers Feature Stores the logged-in user has access to:
   *   1. Lists OpenShift projects with opendatahub.io/feast=true (user-scoped)
   *   2. Lists FeatureStore CRDs with feature-store-ui=enabled in each project (user-scoped)
   *   3. Derives the Feast registry service URL from the CRD name (no ConfigMap needed)
   *   4. Fetches project metadata from each ready registry
   *   5. Returns enabledCRDCount so the UI can warn when multiple CRDs have UI enabled
   */
  fastify.get('/', async (req: OauthFastifyRequest<Record<string, never>>, reply: FastifyReply) => {
    try {
      const kubeHeaders = (await getDirectCallOptions(fastify, req, '')).headers as Record<
        string,
        string
      >;
      const token = getAccessToken({ headers: kubeHeaders });

      if (!token) {
        throw createCustomError('No access token', 'User authentication required', 401);
      }

      const namespaces = await listFeastNamespaces(fastify, kubeHeaders);

      if (namespaces.length === 0) {
        reply.send(buildFeatureStoreResponse([], 0));
        return;
      }

      // allCRDs.length === enabledCRDCount: listFeastFeatureStoreCRDs filters by feature-store-ui=enabled.
      const crdsByNamespace = await Promise.all(
        namespaces.map((ns) => listFeastFeatureStoreCRDs(fastify, ns, kubeHeaders)),
      );
      const allCRDs = crdsByNamespace.flat();
      const enabledCRDCount = allCRDs.length;

      const featureStoreResults = await Promise.all(
        allCRDs.map(async (crd): Promise<FeatureStore[]> => {
          if (!isRegistryReady(crd)) {
            fastify.log.debug(
              `Skipping ${crd.metadata.namespace}/${crd.metadata.name} - Registry not ready`,
            );
            return [];
          }

          const {
            serviceName,
            namespace: registryNamespace,
            protocol,
            port,
          } = getServiceFromCRD(crd);
          const registryUrl = constructRegistryProxyUrl(
            serviceName,
            registryNamespace,
            'api/v1/projects',
            true,
            protocol,
            port,
          );
          const baseRegistryUrl = constructRegistryProxyUrl(
            serviceName,
            registryNamespace,
            '',
            true,
            protocol,
            port,
          ).replace(/\/$/, '');

          try {
            const { data, statusCode } = await makeAuthenticatedHttpRequest<FeastProjectsResponse>(
              fastify,
              registryUrl,
              token,
              {},
            );

            if (statusCode < 200 || statusCode >= 300) {
              throw new Error(`Registry returned ${statusCode}`);
            }

            const targetProject = crd.spec?.feastProject;
            const projects = data.projects || [];
            return projects
              .map((fs) => fs.spec?.name || fs.name)
              .filter((projectName): projectName is string => {
                if (!projectName) return false;
                if (targetProject) return projectName === targetProject;
                return true;
              })
              .map((projectName) =>
                // name = CRD name for proxy lookup; project = Feast project name.
                createFeatureStoreResponse(
                  crd.metadata.name,
                  projectName,
                  baseRegistryUrl,
                  'True',
                  crd.metadata.namespace,
                ),
              );
          } catch (error) {
            fastify.log.warn(
              `Failed to fetch from registry for ${crd.metadata.namespace}/${crd.metadata.name}: ${
                error instanceof Error ? error.message : String(error)
              }`,
            );
            return [];
          }
        }),
      );

      reply.send(buildFeatureStoreResponse(featureStoreResults.flat(), enabledCRDCount));
    } catch (error) {
      if (createError.isHttpError(error)) {
        throw error;
      }
      handleError(fastify, error, 'Failed to fetch feature stores');
      throw createCustomError(
        'Failed to fetch feature stores',
        'Unable to fetch feature stores at this time',
        500,
      );
    }
  });

  /**
   * GET /api/featurestores/:namespace/:name/*
   *
   * Proxies a request to the Feast registry REST API.
   * Looks up the FeatureStore CRD directly by namespace + name using the
   * user's token and derives the service URL — no ConfigMap lookup needed.
   */
  fastify.get(
    '/:namespace/:name/*',
    async (
      req: OauthFastifyRequest<{
        Params: { namespace: string; name: string };
      }>,
      reply: FastifyReply,
    ) => {
      const { namespace, name } = req.params;
      const wildcardPath = (req.params as Record<string, string>)['*'] || '';

      if (wildcardPath && (!wildcardPath.startsWith('api/v1/') || wildcardPath.includes('..'))) {
        throw createCustomError(
          'Invalid path',
          'Path must start with api/v1/ and must not contain traversal sequences',
          400,
        );
      }

      const query = req.query as Record<string, string>;
      const qs = Object.keys(query)
        .filter((k) => typeof query[k] === 'string')
        .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(query[k])}`)
        .join('&');
      const validatedPath = wildcardPath || 'api/v1/projects';
      const path = qs ? `${validatedPath}?${qs}` : validatedPath;

      const DNS1123_REGEX = /^[a-z0-9]([a-z0-9-]{0,251}[a-z0-9])?$/;
      if (!DNS1123_REGEX.test(namespace) || !DNS1123_REGEX.test(name)) {
        throw createCustomError(
          'Invalid parameters',
          'namespace and name must be valid DNS-1123 subdomains',
          400,
        );
      }

      const kubeHeaders = (await getDirectCallOptions(fastify, req, '')).headers as Record<
        string,
        string
      >;
      const token = getAccessToken({ headers: kubeHeaders });

      if (!token) {
        throw createCustomError('No access token', 'User authentication required', 401);
      }

      const crd = await getFeastFeatureStoreCRD(fastify, namespace, name, kubeHeaders);

      if (!crd) {
        throw createCustomError(
          'FeatureStore not found',
          `FeatureStore '${name}' not found in namespace '${namespace}' or access denied`,
          404,
        );
      }

      const { serviceName, namespace: svcNs, protocol, port } = getServiceFromCRD(crd);
      const proxyUrl = constructRegistryProxyUrl(serviceName, svcNs, path, true, protocol, port);

      try {
        const { data, statusCode } = await makeAuthenticatedHttpRequest(fastify, proxyUrl, token, {
          timeout: 60000,
        });

        reply.code(statusCode).type('application/json').send(data);
      } catch (directError) {
        handleError(fastify, directError, 'Direct request error');
        throw createCustomError(
          'Registry request failed',
          'Unable to contact the feature store registry',
          500,
        );
      }
    },
  );
};
