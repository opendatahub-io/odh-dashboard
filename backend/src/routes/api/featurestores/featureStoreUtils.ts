import { KubeFastifyInstance } from '../../../types';
import { getConfigMap } from '../../../utils/envUtils';
import { V1ConfigMap } from '@kubernetes/client-node';
import { groupBy } from 'lodash';

const DEFAULT_HTTPS_PORT = '443';
const DEFAULT_HTTP_PORT = '80';
const FEATURE_STORE_YAML_KEY = 'feature_store.yaml';
const REGISTRY_CONDITION_TYPE = 'Registry';

export interface NamespacesData {
  namespaces: Record<string, string[]>;
}

export interface RegistryUrlInfo {
  serviceName: string;
  serviceNamespace: string;
  originalUrl: string;
  protocol: string;
  port: string;
}

export interface ClientConfigInfo {
  configName: string;
  namespace: string;
  registryUrl: string;
  projectName: string;
}

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
  };
}

export interface FeastProject {
  name?: string;
  spec?: {
    name?: string;
  };
}

export interface FeastProjectsResponse {
  projects?: FeastProject[];
}

export function handleError(fastify: KubeFastifyInstance, error: unknown, context: string): string {
  const errorMessage = error instanceof Error ? error.message : String(error);
  fastify.log.error(`${context}: ${errorMessage}`);
  return errorMessage;
}

export const fetchConfigMap = async (
  fastify: KubeFastifyInstance,
  namespace: string,
  name: string,
): Promise<V1ConfigMap | null> => {
  try {
    const configMap = await getConfigMap(fastify, namespace, name);
    return configMap;
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'statusCode' in error && error.statusCode === 404) {
      fastify.log.warn(`ConfigMap '${name}' not found in namespace '${namespace}'`);
      return null;
    }
    throw error;
  }
};

export function parseNamespacesData(configMapData: string): NamespacesData {
  try {
    const parsed = JSON.parse(configMapData);
    return {
      namespaces: parsed.namespaces || {},
    };
  } catch (error) {
    throw new Error(
      `Failed to parse namespaces data: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

export function extractServiceInfo(registryUrl: string): RegistryUrlInfo {
  // Extract protocol if present, default to https
  const protocolMatch = registryUrl.match(/^(https?):\/\//);
  const protocol = protocolMatch ? protocolMatch[1] : 'https';

  // Remove protocol for service name extraction
  const urlWithoutProtocol = registryUrl.replace(/^https?:\/\//, '');

  const serviceMatch = urlWithoutProtocol.match(
    /feast-(.+)-registry\.(.+)\.svc\.cluster\.local(:\d+)?/,
  );

  if (!serviceMatch) {
    throw new Error(`Invalid registry URL format: ${registryUrl}`);
  }

  const extractedName = serviceMatch[1];
  const extractedNamespace = serviceMatch[2];
  const portMatch = serviceMatch[3];

  const serviceName = `feast-${extractedName}-registry-rest`;
  // Extract port number, default based on protocol
  const defaultPort = protocol === 'https' ? DEFAULT_HTTPS_PORT : DEFAULT_HTTP_PORT;
  const port = portMatch ? portMatch.substring(1) : defaultPort;

  return {
    serviceName,
    serviceNamespace: extractedNamespace,
    originalUrl: registryUrl,
    protocol,
    port,
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

export function findRegistryUrlForFeatureStore(
  featureStoreName: string,
  registryUrls: ClientConfigInfo[],
): string | null {
  for (const registryInfo of registryUrls) {
    if (registryInfo.projectName === featureStoreName) {
      return registryInfo.registryUrl;
    }
  }
  return null;
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

export function filterEnabledCRDs(crds: FeatureStoreCRD[]): FeatureStoreCRD[] {
  return crds.filter((crd) => crd.metadata?.labels?.['feature-store-ui'] === 'enabled');
}

function parseFeatureStoreConfigMap(
  configMap: V1ConfigMap,
): { registryUrl: string; projectName: string } | null {
  if (!configMap.data?.[FEATURE_STORE_YAML_KEY]) {
    return null;
  }

  const yamlContent = configMap.data[FEATURE_STORE_YAML_KEY];

  const registryMatch = yamlContent.match(/registry:\s*\n\s*path:\s*(.+)/);
  if (!registryMatch) {
    return null;
  }

  const registryUrl = registryMatch[1].trim();
  const projectMatch = yamlContent.match(/^project:\s*(.+)$/m);
  const projectName = projectMatch ? projectMatch[1].trim() : 'unknown';

  return { registryUrl, projectName };
}

export async function getClientConfigs(
  fastify: KubeFastifyInstance,
  namespaces: Record<string, string[]>,
  labelSelector?: string,
): Promise<ClientConfigInfo[]> {
  const clientConfigs: ClientConfigInfo[] = [];

  for (const [ns, configNames] of Object.entries(namespaces)) {
    if (!Array.isArray(configNames)) continue;

    for (const configName of configNames) {
      try {
        const clientConfig = await getConfigMap(fastify, ns, configName);

        if (labelSelector) {
          const labels = clientConfig.metadata?.labels || {};
          const [key, value] = labelSelector.split('=');
          if (labels[key] !== value) {
            continue;
          }
        }

        const parsed = parseFeatureStoreConfigMap(clientConfig);
        if (!parsed) {
          continue;
        }

        clientConfigs.push({
          configName,
          namespace: ns,
          registryUrl: parsed.registryUrl,
          projectName: parsed.projectName,
        });
      } catch (error) {
        fastify.log.warn(
          `Failed to process config ${configName} in namespace ${ns}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }
  }

  return clientConfigs;
}

export async function fetchFromRegistry(
  fastify: KubeFastifyInstance,
  registryUrl: string,
  userToken?: string,
): Promise<Array<{ name: string; project?: string }>> {
  try {
    const serviceInfo = extractServiceInfo(registryUrl);
    const { protocol, port } = serviceInfo;

    const directUrl = constructRegistryProxyUrl(
      serviceInfo.serviceName,
      serviceInfo.serviceNamespace,
      'api/v1/projects',
      false,
      protocol,
      port,
    );

    const { data } = await makeAuthenticatedHttpRequest<FeastProjectsResponse>(
      fastify,
      directUrl,
      userToken,
      {
        rejectUnauthorized: false, // Skip TLS verification for internal services
      },
    );

    const result =
      data.projects?.map((project: FeastProject) => ({
        name: project.name || project.spec?.name || 'unknown',
        project: project.name || project.spec?.name || 'unknown',
      })) || [];

    return result;
  } catch (error) {
    fastify.log.warn(
      `Failed to fetch from registry ${registryUrl}: ${
        error instanceof Error ? error.message : String(error)
      }. This is expected when running locally or when feast registry is not configured.`,
    );
    throw error;
  }
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
  const { timeout = 10000, rejectUnauthorized = false, agent } = options;

  const https = require('https');
  const http = require('http');
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

export async function batchFetchConfigMapsByNamespace(
  fastify: KubeFastifyInstance,
  clientConfigsData: ClientConfigInfo[],
): Promise<Map<string, V1ConfigMap>> {
  const configMapMap = new Map<string, V1ConfigMap>();

  const configsByNamespace = groupBy(clientConfigsData, 'namespace');

  const namespacePromises = Object.entries(configsByNamespace).map(async ([namespace]) => {
    try {
      const response = await fastify.kube.coreV1Api.listNamespacedConfigMap(namespace);
      const configMaps = response.body.items || [];

      configMaps.forEach((configMap) => {
        const name = configMap.metadata?.name;
        if (name) {
          configMapMap.set(`${namespace}/${name}`, configMap);
        }
      });
    } catch (error) {
      fastify.log.warn(`Failed to list ConfigMaps in namespace ${namespace}: ${error.message}`);
    }
  });

  await Promise.all(namespacePromises);
  return configMapMap;
}

export async function getClientConfigsBatched(
  fastify: KubeFastifyInstance,
  namespaces: Record<string, string[]>,
  labelSelector?: string,
): Promise<ClientConfigInfo[]> {
  const clientConfigs: ClientConfigInfo[] = [];

  const allConfigs: ClientConfigInfo[] = [];
  for (const [ns, configNames] of Object.entries(namespaces)) {
    if (!Array.isArray(configNames)) continue;
    for (const configName of configNames) {
      allConfigs.push({
        configName,
        namespace: ns,
        registryUrl: '',
        projectName: '',
      });
    }
  }

  const configMapMap = await batchFetchConfigMapsByNamespace(fastify, allConfigs);

  for (const config of allConfigs) {
    try {
      const clientConfig = configMapMap.get(`${config.namespace}/${config.configName}`);

      if (!clientConfig) {
        fastify.log.warn(
          `ConfigMap ${config.configName} not found in namespace ${config.namespace}`,
        );
        continue;
      }

      if (labelSelector) {
        const labels = clientConfig.metadata?.labels || {};
        const [key, value] = labelSelector.split('=');
        if (labels[key] !== value) {
          continue;
        }
      }

      const parsed = parseFeatureStoreConfigMap(clientConfig);
      if (!parsed) {
        continue;
      }

      clientConfigs.push({
        configName: config.configName,
        namespace: config.namespace,
        registryUrl: parsed.registryUrl,
        projectName: parsed.projectName,
      });
    } catch (error) {
      fastify.log.warn(
        `Failed to process config ${config.configName} in namespace ${config.namespace}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  return clientConfigs;
}
