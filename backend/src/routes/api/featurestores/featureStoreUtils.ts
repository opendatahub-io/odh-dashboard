import * as https from 'https';
import * as http from 'http';
import * as k8s from '@kubernetes/client-node';
import { KubeFastifyInstance } from '../../../types';
import { DEV_MODE } from '../../../utils/constants';
import { isImpersonating, getImpersonateAccessToken } from '../../../devFlags';
import { getAccessToken } from '../../../utils/directCallUtils';

const REGISTRY_CONDITION_TYPE = 'Registry';

export interface FeatureStoreCRD {
  apiVersion: string;
  kind: string;
  metadata: {
    name: string;
    namespace: string;
    labels?: { [key: string]: string };
  };
  spec?: {
    feastProject?: string;
    services?: {
      registry?: {
        local?: {
          server?: {
            tls?: {
              disable?: boolean;
            };
          };
        };
      };
    };
  };
  status?: {
    conditions?: Array<{
      type: string;
      status: string;
      lastTransitionTime: string;
    }>;
  };
}

export interface FeastProject {
  name?: string;
  description?: string;
  spec?: {
    name?: string;
    description?: string;
  };
}

export interface FeastProjectsResponse {
  projects?: FeastProject[];
}

export interface FeastIntegrationNotebook {
  metadata: {
    name: string;
    namespace: string;
    annotations?: Record<string, string>;
  };
}

export interface FeastPermission {
  spec?: {
    actions?: string[];
  };
}

export interface FeastPermissionsResponse {
  permissions?: FeastPermission[];
}

export interface ConnectedWorkbenchEntry {
  workbenchName: string;
  workbenchNamespace: string;
  projectName: string;
}

export function handleError(fastify: KubeFastifyInstance, error: unknown, context: string): string {
  const errorMessage = error instanceof Error ? error.message : String(error);
  fastify.log.error(`${context}: ${errorMessage}`);
  return errorMessage;
}

/**
 * Build a CustomObjectsApi that authenticates as the requesting user rather than the dashboard service-account. This is required so that K8s RBAC is enforced per-user.
 */
function getUserScopedCustomObjectsApi(
  fastify: KubeFastifyInstance,
  kubeHeaders: Record<string, string>,
) {
  const baseKc = fastify.kube.config;
  const cluster = baseKc.getCurrentCluster();

  if (!cluster) {
    throw new Error('No current cluster configured');
  }

  let token: string;
  if (DEV_MODE) {
    token = isImpersonating() ? getImpersonateAccessToken() : baseKc.getCurrentUser()?.token ?? '';
  } else {
    const accessToken = getAccessToken({ headers: kubeHeaders });
    if (!accessToken) {
      throw new Error('No access token provided by oauth. Cannot make user-scoped API calls.');
    }
    token = accessToken;
  }

  const userKc = new k8s.KubeConfig();
  userKc.loadFromClusterAndUser(cluster, { name: 'current-user', token });

  return {
    api: userKc.makeApiClient(k8s.CustomObjectsApi),
    opts: { headers: {} },
  };
}

/** Lists custom objects cluster-wide or namespace-scoped using the user's token. Returns [] on 403. */
async function listCustomObjects<T>(
  fastify: KubeFastifyInstance,
  kubeHeaders: Record<string, string>,
  params: {
    group: string;
    version: string;
    plural: string;
    namespace?: string;
    labelSelector?: string;
    errorContext: string;
  },
): Promise<T[]> {
  try {
    const { api, opts } = getUserScopedCustomObjectsApi(fastify, kubeHeaders);
    const { group, version, plural, namespace, labelSelector } = params;

    const response = namespace
      ? ((await api.listNamespacedCustomObject(
          group,
          version,
          namespace,
          plural,
          undefined,
          undefined,
          undefined,
          labelSelector,
          undefined,
          undefined,
          undefined,
          undefined,
          opts,
        )) as { body: { items?: T[] } })
      : ((await api.listClusterCustomObject(
          group,
          version,
          plural,
          undefined,
          undefined,
          undefined,
          labelSelector,
          undefined,
          undefined,
          undefined,
          undefined,
          opts,
        )) as { body: { items?: T[] } });

    return response.body.items || [];
  } catch (error) {
    const statusCode =
      error && typeof error === 'object' && 'statusCode' in error
        ? (error as { statusCode: number }).statusCode
        : undefined;

    if (statusCode === 403) {
      fastify.log.debug(`Access denied (403): ${params.errorContext} - skipping`);
      return [];
    }

    handleError(fastify, error, params.errorContext);
    return [];
  }
}

/**
 * Lists OpenShift projects accessible to the user with the `opendatahub.io/feast=true` label.
 * DEV_MODE impersonation headers (Impersonate-User) are forwarded via kubeHeaders.
 */
export async function listFeastNamespaces(
  fastify: KubeFastifyInstance,
  kubeHeaders: Record<string, string>,
): Promise<string[]> {
  const items = await listCustomObjects<{ metadata: { name: string } }>(fastify, kubeHeaders, {
    group: 'project.openshift.io',
    version: 'v1',
    plural: 'projects',
    labelSelector: 'opendatahub.io/feast=true',
    errorContext: 'Failed to list Feast namespaces for user',
  });
  return items.map((p) => p.metadata.name).filter(Boolean);
}

/**
 * Lists all OpenShift projects accessible to the user (no label filter).
 * Used to discover feast-integrated workbenches across namespaces the user can see.
 */
export async function listUserOpenShiftProjects(
  fastify: KubeFastifyInstance,
  kubeHeaders: Record<string, string>,
): Promise<string[]> {
  const items = await listCustomObjects<{ metadata: { name: string } }>(fastify, kubeHeaders, {
    group: 'project.openshift.io',
    version: 'v1',
    plural: 'projects',
    errorContext: 'Failed to list OpenShift projects for user',
  });
  return items.map((p) => p.metadata.name).filter(Boolean);
}

/**
 * Lists Notebook CRs with `opendatahub.io/feast-integration=true` in a namespace.
 * Returns [] on 403.
 */
export async function listFeastIntegrationNotebooks(
  fastify: KubeFastifyInstance,
  namespace: string,
  kubeHeaders: Record<string, string>,
): Promise<FeastIntegrationNotebook[]> {
  return listCustomObjects<FeastIntegrationNotebook>(fastify, kubeHeaders, {
    group: 'kubeflow.org',
    version: 'v1',
    plural: 'notebooks',
    namespace,
    labelSelector: 'opendatahub.io/feast-integration=true',
    errorContext: `Failed to list feast-integrated notebooks in ${namespace}`,
  });
}

/**
 * Lists Feast projects from the registry for a FeatureStore CRD. Returns null on failure.
 */
export async function fetchFeastProjectsFromRegistry(
  fastify: KubeFastifyInstance,
  crd: FeatureStoreCRD,
  token: string,
): Promise<FeastProjectsResponse | null> {
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

    return data;
  } catch (error) {
    fastify.log.info(
      `Projects list for ${crd.metadata.namespace}/${crd.metadata.name}: unavailable ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
    return null;
  }
}

/**
 * Returns whether the user can see the Feast project and its description (one registry call).
 */
export async function getFeastProjectRegistryInfo(
  fastify: KubeFastifyInstance,
  crd: FeatureStoreCRD,
  feastProjectName: string,
  token: string,
): Promise<{ hasAccess: boolean; description?: string }> {
  const data = await fetchFeastProjectsFromRegistry(fastify, crd, token);
  if (!data) {
    return { hasAccess: false };
  }

  const project = (data.projects ?? []).find((p) => (p.spec?.name || p.name) === feastProjectName);
  const rawDescription = project?.spec?.description ?? project?.description;
  const description = rawDescription?.trim() || undefined;

  return {
    hasAccess: !!project,
    description,
  };
}

export function extractPermissionLevel(data: FeastPermissionsResponse): string[] {
  const actions = new Set<string>();
  for (const permission of data.permissions ?? []) {
    for (const action of permission.spec?.actions ?? []) {
      actions.add(action);
    }
  }
  return [...actions];
}

/**
 * Maps feast project name → workbenches that reference it via the feast-config annotation.
 */
export function buildWorkbenchesByFeastProjectMap(
  notebooks: FeastIntegrationNotebook[],
): Map<string, ConnectedWorkbenchEntry[]> {
  const map = new Map<string, ConnectedWorkbenchEntry[]>();

  for (const notebook of notebooks) {
    const feastConfig = notebook.metadata.annotations?.['opendatahub.io/feast-config'];
    if (!feastConfig) {
      continue;
    }

    const workbenchNamespace = notebook.metadata.namespace;
    const entry: ConnectedWorkbenchEntry = {
      workbenchName: notebook.metadata.name,
      workbenchNamespace,
      projectName: workbenchNamespace,
    };

    feastConfig
      .split(',')
      .map((name) => name.trim())
      .filter(Boolean)
      .forEach((feastProjectName) => {
        const existing = map.get(feastProjectName) ?? [];
        existing.push(entry);
        map.set(feastProjectName, existing);
      });
  }

  return map;
}

/**
 * Lists FeatureStore CRDs with the `feature-store-ui=enabled` label in a namespace.
 * Returns [] on 403 so inaccessible namespaces don't break the full listing.
 */
export async function listFeastFeatureStoreCRDs(
  fastify: KubeFastifyInstance,
  namespace: string,
  kubeHeaders: Record<string, string>,
): Promise<FeatureStoreCRD[]> {
  return listCustomObjects<FeatureStoreCRD>(fastify, kubeHeaders, {
    group: 'feast.dev',
    version: 'v1',
    plural: 'featurestores',
    namespace,
    labelSelector: 'feature-store-ui=enabled',
    errorContext: `Failed to list FeatureStore CRDs in ${namespace}`,
  });
}

/**
 * Fetches a single FeatureStore CRD by name.
 * Accepts the full kubeHeaders so impersonation headers are forwarded.
 * Returns null on 403/404.
 */
export async function getFeastFeatureStoreCRD(
  fastify: KubeFastifyInstance,
  namespace: string,
  name: string,
  kubeHeaders: Record<string, string>,
): Promise<FeatureStoreCRD | null> {
  try {
    const { api, opts } = getUserScopedCustomObjectsApi(fastify, kubeHeaders);

    const response = (await api.getNamespacedCustomObject(
      'feast.dev',
      'v1',
      namespace,
      'featurestores',
      name,
      opts,
    )) as { body: FeatureStoreCRD };

    return response.body;
  } catch (error) {
    const statusCode =
      error && typeof error === 'object' && 'statusCode' in error
        ? (error as { statusCode: number }).statusCode
        : undefined;

    if (statusCode === 403 || statusCode === 404) {
      return null;
    }

    handleError(fastify, error, `Failed to get FeatureStore CRD ${namespace}/${name}`);
    return null;
  }
}

/**
 * Returns true if the FeatureStore CRD has a ready Registry condition.
 */
export function isRegistryReady(crd: FeatureStoreCRD): boolean {
  return !!crd.status?.conditions?.find((c) => c.type === 'Registry' && c.status === 'True');
}

/**
 * Derives the Feast registry REST service name and namespace from a CRD.
 * Convention: service name = `feast-{crd.metadata.name}-registry-rest`
 */
export function getServiceFromCRD(crd: FeatureStoreCRD): {
  serviceName: string;
  namespace: string;
  protocol: 'http' | 'https';
  port: string;
} {
  const tlsDisabled = crd.spec?.services?.registry?.local?.server?.tls?.disable === true;
  return {
    serviceName: `feast-${crd.metadata.name}-registry-rest`,
    namespace: crd.metadata.namespace,
    protocol: tlsDisabled ? 'http' : 'https',
    port: tlsDisabled ? '80' : '443',
  };
}

export function constructRegistryProxyUrl(
  serviceName: string,
  serviceNamespace: string,
  path: string,
  useEnvironmentVariables = false,
  protocol = 'https',
  port = '443',
): string {
  const isLocalDevelopment =
    process.env.NODE_ENV === 'development' ||
    process.env.DEV_MODE === 'true' ||
    !process.env.KUBERNETES_SERVICE_HOST;

  if (isLocalDevelopment) {
    const localPort =
      process.env[`FEAST_${serviceName.toUpperCase().replace(/-/g, '_')}_PORT`] ||
      process.env.FEAST_REGISTRY_SERVICE_PORT ||
      port;
    return `${protocol}://localhost:${localPort}/${path}`;
  }

  if (useEnvironmentVariables) {
    const host =
      process.env.FEAST_REGISTRY_SERVICE_HOST ||
      `${serviceName}.${serviceNamespace}.svc.cluster.local`;
    const envPort = process.env.FEAST_REGISTRY_SERVICE_PORT || port;
    return `${protocol}://${host}:${envPort}/${path}`;
  }

  return `${protocol}://${serviceName}.${serviceNamespace}.svc.cluster.local:${port}/${path}`;
}

export function createFeatureStoreResponse(
  name: string,
  project: string,
  registryUrl: string,
  status: 'True' | 'False' = 'True',
  namespace?: string,
): {
  name: string;
  project: string;
  registry: { path: string };
  namespace?: string;
  status: {
    conditions: Array<{
      type: string;
      status: string;
      lastTransitionTime: string;
    }>;
  };
} {
  return {
    name,
    project,
    registry: {
      path: registryUrl,
    },
    ...(namespace && { namespace }),
    status: {
      conditions: [
        {
          type: REGISTRY_CONDITION_TYPE,
          status,
          lastTransitionTime: new Date().toISOString(),
        },
      ],
    },
  };
}

export async function makeAuthenticatedHttpRequest<T = unknown>(
  fastify: KubeFastifyInstance,
  url: string,
  token?: string,
  options: {
    timeout?: number;
    rejectUnauthorized?: boolean;
    agent?: import('https').Agent;
  } = {},
): Promise<{ data: T; statusCode: number }> {
  const { timeout = 60000, rejectUnauthorized = false, agent } = options;

  const urlObj = new URL(url);

  const isHttps = urlObj.protocol === 'https:';
  const defaultPort = isHttps ? 443 : 80;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const requestOptions = {
    hostname: urlObj.hostname,
    port: urlObj.port || defaultPort,
    path: urlObj.pathname + urlObj.search,
    method: 'GET',
    headers,
    rejectUnauthorized,
    ...(agent && { agent }),
  };

  return new Promise((resolve, reject) => {
    const requestModule = isHttps ? https : http;
    const req = requestModule.request(requestOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({ data: jsonData, statusCode: res.statusCode });
        } catch (parseError) {
          const errorMessage = handleError(fastify, parseError, 'JSON parsing failed');
          reject(new Error(`Failed to parse JSON response: ${errorMessage}`));
        }
      });
    });

    req.on('error', (err) => {
      const errorMessage = handleError(fastify, err, 'HTTP request failed');
      reject(new Error(`HTTP request error: ${errorMessage}`));
    });

    req.setTimeout(timeout, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.end();
  });
}
