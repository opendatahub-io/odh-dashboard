import { EventEmitter } from 'events';
import * as https from 'https';
import * as k8s from '@kubernetes/client-node';
import * as constants from '../utils/constants';
import * as devFlags from '../devFlags';

jest.mock('https', () => {
  const actual = jest.requireActual<typeof import('https')>('https');
  return {
    ...actual,
    request: jest.fn(),
  };
});
import {
  constructRegistryProxyUrl,
  createFeatureStoreResponse,
  handleError,
  isRegistryReady,
  getServiceFromCRD,
  listFeastNamespaces,
  listUserOpenShiftProjects,
  listFeastIntegrationNotebooks,
  listFeastFeatureStoreCRDs,
  getFeastFeatureStoreCRD,
  fetchFeastProjectsFromRegistry,
  getFeastProjectRegistryInfo,
  extractPermissionLevel,
  buildWorkbenchesByFeastProjectMap,
  type FeatureStoreCRD,
  type FeastIntegrationNotebook,
} from '../routes/api/featurestores/featureStoreUtils';

const NAMESPACE = {
  VIEWER: 'viewer',
  DEFAULT: 'default',
  TEST_NS: 'test-ns',
  NAMESPACE_WITH_DASH: 'namespace-with-dash',
} as const;

const PROJECT = {
  BANKING: 'banking',
  RETAIL: 'retail',
  TEST: 'test',
} as const;

const SERVICE_NAME = {
  BANKING_REST: 'feast-banking-registry-rest',
  RETAIL_REST: 'feast-retail-registry-rest',
  TEST_REST: 'feast-test-registry-rest',
} as const;

const REGISTRY_URL = {
  BANKING_HTTPS: 'https://feast-banking-registry.viewer.svc.cluster.local',
  RETAIL_HTTPS: 'https://feast-retail-registry.default.svc.cluster.local',
} as const;

const API_PATH = {
  PROJECTS: 'api/v1/projects',
  FEATURES: 'api/v1/features',
} as const;

const PROTOCOL = {
  HTTPS: 'https',
  HTTP: 'http',
} as const;

const PORT = {
  HTTPS_DEFAULT: '443',
  HTTP_DEFAULT: '80',
  CUSTOM_8080: '8080',
  CUSTOM_8888: '8888',
  CUSTOM_9090: '9090',
} as const;

const createMockFastify = () =>
  ({
    log: {
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
      info: jest.fn(),
    },
  } as any);

const createMockApi = () => ({
  setApiKey: jest.fn(),
  listClusterCustomObject: jest.fn(),
  listNamespacedCustomObject: jest.fn(),
  getNamespacedCustomObject: jest.fn(),
});

const createMockKubeFastify = (mockApi = createMockApi()) =>
  ({
    log: {
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
      info: jest.fn(),
    },
    kube: {
      customObjectsApi: mockApi,
      config: {
        getCurrentCluster: jest
          .fn()
          .mockReturnValue({ name: 'test-cluster', server: 'https://test' }),
        getCurrentUser: jest.fn().mockReturnValue({ name: 'test-user', token: 'kube-token' }),
      },
    },
  } as any);

/**
 * Wire `new k8s.KubeConfig()` → mockApi for describe blocks that test K8s API calls.
 * Call this in beforeEach after mockApi is assigned so the spy captures the right instance.
 */
const spyKubeConfigForMockApi = (getMockApi: () => ReturnType<typeof createMockApi>) => {
  const loadFromClusterAndUser = jest.fn();
  jest.spyOn(k8s, 'KubeConfig').mockImplementation(
    () =>
      ({
        loadFromClusterAndUser,
        makeApiClient: jest.fn().mockReturnValue(getMockApi()),
      } as any),
  );
  return { loadFromClusterAndUser };
};

const KUBE_HEADERS = { Authorization: 'Bearer test-token' } as Record<string, string>;

const USER_TOKEN = 'user-registry-token';

const mockHttpsRequest = https.request as jest.Mock;

const mockHttpsJsonResponse = (
  statusCode: number,
  body: unknown,
  options: { requestError?: Error } = {},
) => {
  mockHttpsRequest.mockImplementation((_options, callback) => {
    const req = new EventEmitter() as any;
    req.end = jest.fn();
    req.setTimeout = jest.fn();
    req.destroy = jest.fn();

    if (options.requestError) {
      process.nextTick(() => req.emit('error', options.requestError));
      return req;
    }

    const res = new EventEmitter() as any;
    res.statusCode = statusCode;
    process.nextTick(() => {
      callback?.(res);
      res.emit('data', JSON.stringify(body));
      res.emit('end');
    });

    return req;
  });
};

const createFeatureStoreCRD = (overrides: Partial<FeatureStoreCRD> = {}): FeatureStoreCRD => ({
  apiVersion: 'feast.dev/v1',
  kind: 'FeatureStore',
  metadata: {
    name: PROJECT.BANKING,
    namespace: NAMESPACE.VIEWER,
    ...overrides.metadata,
  },
  ...overrides,
});

describe('featureStoreUtils', () => {
  describe('handleError', () => {
    const mockFastify = createMockFastify();

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should handle Error instances', () => {
      const error = new Error('Test error message');
      const result = handleError(mockFastify, error, 'Test context');

      expect(result).toBe('Test error message');
      expect(mockFastify.log.error).toHaveBeenCalledWith('Test context: Test error message');
    });

    it('should handle non-Error values', () => {
      const error = 'String error';
      const result = handleError(mockFastify, error, 'Test context');

      expect(result).toBe('String error');
      expect(mockFastify.log.error).toHaveBeenCalledWith('Test context: String error');
    });
  });

  describe('isRegistryReady', () => {
    it('should return true when Registry condition is True', () => {
      const crd = createFeatureStoreCRD({
        status: {
          conditions: [
            { type: 'Registry', status: 'True', lastTransitionTime: '2024-01-01T00:00:00Z' },
          ],
        },
      });

      expect(isRegistryReady(crd)).toBe(true);
    });

    it('should return false when Registry condition is False', () => {
      const crd = createFeatureStoreCRD({
        status: {
          conditions: [
            { type: 'Registry', status: 'False', lastTransitionTime: '2024-01-01T00:00:00Z' },
          ],
        },
      });

      expect(isRegistryReady(crd)).toBe(false);
    });

    it('should return false when no conditions exist', () => {
      const crd = createFeatureStoreCRD({ status: { conditions: [] } });

      expect(isRegistryReady(crd)).toBe(false);
    });

    it('should return false when status is missing', () => {
      const crd = createFeatureStoreCRD();

      expect(isRegistryReady(crd)).toBe(false);
    });

    it('should return false when Registry condition is absent but other conditions exist', () => {
      const crd = createFeatureStoreCRD({
        status: {
          conditions: [
            { type: 'Ready', status: 'True', lastTransitionTime: '2024-01-01T00:00:00Z' },
          ],
        },
      });

      expect(isRegistryReady(crd)).toBe(false);
    });
  });

  describe('getServiceFromCRD', () => {
    it('should derive service name, namespace, and default to https/443 when TLS is not configured', () => {
      const crd = createFeatureStoreCRD();

      const result = getServiceFromCRD(crd);

      expect(result).toEqual({
        serviceName: SERVICE_NAME.BANKING_REST,
        namespace: NAMESPACE.VIEWER,
        protocol: PROTOCOL.HTTPS,
        port: PORT.HTTPS_DEFAULT,
      });
    });

    it('should handle CRD names with hyphens and default to https/443', () => {
      const crd = createFeatureStoreCRD({
        metadata: { name: 'my-complex-name', namespace: NAMESPACE.DEFAULT },
      });

      const result = getServiceFromCRD(crd);

      expect(result).toEqual({
        serviceName: 'feast-my-complex-name-registry-rest',
        namespace: NAMESPACE.DEFAULT,
        protocol: PROTOCOL.HTTPS,
        port: PORT.HTTPS_DEFAULT,
      });
    });

    it('should handle CRD names with underscores and default to https/443', () => {
      const crd = createFeatureStoreCRD({
        metadata: { name: 'feast_rbac', namespace: NAMESPACE.TEST_NS },
      });

      const result = getServiceFromCRD(crd);

      expect(result).toEqual({
        serviceName: 'feast-feast_rbac-registry-rest',
        namespace: NAMESPACE.TEST_NS,
        protocol: PROTOCOL.HTTPS,
        port: PORT.HTTPS_DEFAULT,
      });
    });

    it('should return http/80 when tls.disable is true', () => {
      const crd = createFeatureStoreCRD({
        spec: {
          services: {
            registry: {
              local: {
                server: {
                  tls: { disable: true },
                },
              },
            },
          },
        },
      });

      const result = getServiceFromCRD(crd);

      expect(result).toEqual({
        serviceName: SERVICE_NAME.BANKING_REST,
        namespace: NAMESPACE.VIEWER,
        protocol: PROTOCOL.HTTP,
        port: PORT.HTTP_DEFAULT,
      });
    });

    it('should return https/443 when tls.disable is false', () => {
      const crd = createFeatureStoreCRD({
        spec: {
          services: {
            registry: {
              local: {
                server: {
                  tls: { disable: false },
                },
              },
            },
          },
        },
      });

      const result = getServiceFromCRD(crd);

      expect(result).toEqual({
        serviceName: SERVICE_NAME.BANKING_REST,
        namespace: NAMESPACE.VIEWER,
        protocol: PROTOCOL.HTTPS,
        port: PORT.HTTPS_DEFAULT,
      });
    });
  });

  describe('constructRegistryProxyUrl', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      jest.resetModules();
      process.env = { ...originalEnv };
    });

    afterAll(() => {
      process.env = originalEnv;
    });

    it('should construct URL for production environment', () => {
      process.env.KUBERNETES_SERVICE_HOST = 'kubernetes.default.svc';
      process.env.NODE_ENV = 'production';

      const result = constructRegistryProxyUrl(
        SERVICE_NAME.BANKING_REST,
        NAMESPACE.VIEWER,
        API_PATH.PROJECTS,
      );

      expect(result).toBe(
        `${PROTOCOL.HTTPS}://${SERVICE_NAME.BANKING_REST}.${NAMESPACE.VIEWER}.svc.cluster.local:${PORT.HTTPS_DEFAULT}/${API_PATH.PROJECTS}`,
      );
    });

    it('should construct URL with custom protocol and port', () => {
      process.env.KUBERNETES_SERVICE_HOST = 'kubernetes.default.svc';

      const result = constructRegistryProxyUrl(
        SERVICE_NAME.TEST_REST,
        NAMESPACE.TEST_NS,
        API_PATH.FEATURES,
        false,
        PROTOCOL.HTTP,
        PORT.CUSTOM_8080,
      );

      expect(result).toBe(
        `${PROTOCOL.HTTP}://${SERVICE_NAME.TEST_REST}.${NAMESPACE.TEST_NS}.svc.cluster.local:${PORT.CUSTOM_8080}/${API_PATH.FEATURES}`,
      );
    });

    it('should use localhost for local development', () => {
      process.env.NODE_ENV = 'development';
      delete process.env.KUBERNETES_SERVICE_HOST;

      const result = constructRegistryProxyUrl(
        SERVICE_NAME.BANKING_REST,
        NAMESPACE.VIEWER,
        API_PATH.PROJECTS,
        false,
        PROTOCOL.HTTPS,
        PORT.HTTPS_DEFAULT,
      );

      expect(result).toMatch(/^https:\/\/localhost:\d+\/api\/v1\/projects$/);
    });

    it('should use environment variables when useEnvironmentVariables is true', () => {
      process.env.FEAST_REGISTRY_SERVICE_HOST = 'custom-host.example.com';
      process.env.FEAST_REGISTRY_SERVICE_PORT = PORT.CUSTOM_9090;
      process.env.KUBERNETES_SERVICE_HOST = 'kubernetes.default.svc';

      const result = constructRegistryProxyUrl(
        SERVICE_NAME.BANKING_REST,
        NAMESPACE.VIEWER,
        API_PATH.PROJECTS,
        true,
        PROTOCOL.HTTPS,
        PORT.HTTPS_DEFAULT,
      );

      expect(result).toBe(
        `${PROTOCOL.HTTPS}://custom-host.example.com:${PORT.CUSTOM_9090}/${API_PATH.PROJECTS}`,
      );
    });

    it('should use service-specific environment variable in dev mode', () => {
      process.env.NODE_ENV = 'development';
      process.env.FEAST_FEAST_BANKING_REGISTRY_REST_PORT = PORT.CUSTOM_8888;
      delete process.env.KUBERNETES_SERVICE_HOST;

      const result = constructRegistryProxyUrl(
        SERVICE_NAME.BANKING_REST,
        NAMESPACE.VIEWER,
        API_PATH.PROJECTS,
      );

      expect(result).toBe(`${PROTOCOL.HTTPS}://localhost:${PORT.CUSTOM_8888}/${API_PATH.PROJECTS}`);
    });
  });

  describe('listFeastNamespaces', () => {
    let mockFastify: ReturnType<typeof createMockKubeFastify>;
    let mockApi: ReturnType<typeof createMockApi>;

    let loadFromClusterAndUser: jest.Mock;

    beforeEach(() => {
      jest.clearAllMocks();
      mockApi = createMockApi();
      ({ loadFromClusterAndUser } = spyKubeConfigForMockApi(() => mockApi));
      mockFastify = createMockKubeFastify(mockApi);
    });

    it('should return project names for accessible namespaces', async () => {
      mockApi.listClusterCustomObject.mockResolvedValue({
        body: {
          items: [{ metadata: { name: 'feast-ns-1' } }, { metadata: { name: 'feast-ns-2' } }],
        },
      });

      const result = await listFeastNamespaces(mockFastify, KUBE_HEADERS);

      expect(result).toEqual(['feast-ns-1', 'feast-ns-2']);
      expect(mockApi.listClusterCustomObject).toHaveBeenCalledWith(
        'project.openshift.io',
        'v1',
        'projects',
        undefined,
        undefined,
        undefined,
        'opendatahub.io/feast=true',
        undefined,
        undefined,
        undefined,
        undefined,
        { headers: {} },
      );
      expect(loadFromClusterAndUser).toHaveBeenCalledWith(
        { name: 'test-cluster', server: 'https://test' },
        { name: 'current-user', token: 'test-token' },
      );
    });

    it('should filter out items with falsy names', async () => {
      mockApi.listClusterCustomObject.mockResolvedValue({
        body: {
          items: [
            { metadata: { name: 'feast-ns-1' } },
            { metadata: { name: '' } },
            { metadata: { name: 'feast-ns-2' } },
          ],
        },
      });

      const result = await listFeastNamespaces(mockFastify, KUBE_HEADERS);

      expect(result).toEqual(['feast-ns-1', 'feast-ns-2']);
    });

    it('should return empty array when no projects exist', async () => {
      mockApi.listClusterCustomObject.mockResolvedValue({
        body: { items: [] },
      });

      const result = await listFeastNamespaces(mockFastify, KUBE_HEADERS);

      expect(result).toEqual([]);
    });

    it('should return empty array on 403 without throwing', async () => {
      mockApi.listClusterCustomObject.mockRejectedValue({ statusCode: 403 });

      const result = await listFeastNamespaces(mockFastify, KUBE_HEADERS);

      expect(result).toEqual([]);
      expect(mockFastify.log.error).not.toHaveBeenCalled();
    });

    it('should return empty array and log on non-403 errors', async () => {
      mockApi.listClusterCustomObject.mockRejectedValue(new Error('network failure'));

      const result = await listFeastNamespaces(mockFastify, KUBE_HEADERS);

      expect(result).toEqual([]);
      expect(mockFastify.log.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to list Feast namespaces for user'),
      );
    });

    it('should return empty array and log when cluster is not configured', async () => {
      mockFastify.kube.config.getCurrentCluster.mockReturnValue(null);

      const result = await listFeastNamespaces(mockFastify, KUBE_HEADERS);

      expect(result).toEqual([]);
      expect(mockFastify.log.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to list Feast namespaces for user'),
      );
      expect(loadFromClusterAndUser).not.toHaveBeenCalled();
    });

    it('should return empty array and log when no access token is provided', async () => {
      const result = await listFeastNamespaces(mockFastify, {});

      expect(result).toEqual([]);
      expect(mockFastify.log.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to list Feast namespaces for user'),
      );
      expect(loadFromClusterAndUser).not.toHaveBeenCalled();
    });

    describe('DEV_MODE token selection', () => {
      afterEach(() => {
        jest.restoreAllMocks();
      });

      it('should use impersonation token in DEV_MODE when impersonating', async () => {
        jest.replaceProperty(constants, 'DEV_MODE', true);
        jest.spyOn(devFlags, 'isImpersonating').mockReturnValue(true);
        jest.spyOn(devFlags, 'getImpersonateAccessToken').mockReturnValue('impersonate-token');
        mockApi.listClusterCustomObject.mockResolvedValue({ body: { items: [] } });

        await listFeastNamespaces(mockFastify, KUBE_HEADERS);

        expect(loadFromClusterAndUser).toHaveBeenCalledWith(
          { name: 'test-cluster', server: 'https://test' },
          { name: 'current-user', token: 'impersonate-token' },
        );
      });

      it('should use kube config user token in DEV_MODE when not impersonating', async () => {
        jest.replaceProperty(constants, 'DEV_MODE', true);
        jest.spyOn(devFlags, 'isImpersonating').mockReturnValue(false);
        mockApi.listClusterCustomObject.mockResolvedValue({ body: { items: [] } });

        await listFeastNamespaces(mockFastify, KUBE_HEADERS);

        expect(loadFromClusterAndUser).toHaveBeenCalledWith(
          { name: 'test-cluster', server: 'https://test' },
          { name: 'current-user', token: 'kube-token' },
        );
      });
    });
  });

  describe('listUserOpenShiftProjects', () => {
    let mockFastify: ReturnType<typeof createMockKubeFastify>;
    let mockApi: ReturnType<typeof createMockApi>;

    let loadFromClusterAndUser: jest.Mock;

    beforeEach(() => {
      jest.clearAllMocks();
      mockApi = createMockApi();
      ({ loadFromClusterAndUser } = spyKubeConfigForMockApi(() => mockApi));
      mockFastify = createMockKubeFastify(mockApi);
    });

    it('should return all user-accessible project names without a label filter', async () => {
      mockApi.listClusterCustomObject.mockResolvedValue({
        body: {
          items: [{ metadata: { name: 'ds-project' } }, { metadata: { name: 'other-ns' } }],
        },
      });

      const result = await listUserOpenShiftProjects(mockFastify, KUBE_HEADERS);

      expect(result).toEqual(['ds-project', 'other-ns']);
      expect(mockApi.listClusterCustomObject).toHaveBeenCalledWith(
        'project.openshift.io',
        'v1',
        'projects',
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        { headers: {} },
      );
      expect(loadFromClusterAndUser).toHaveBeenCalledWith(
        { name: 'test-cluster', server: 'https://test' },
        { name: 'current-user', token: 'test-token' },
      );
    });

    it('should return empty array on 403 without throwing', async () => {
      mockApi.listClusterCustomObject.mockRejectedValue({ statusCode: 403 });

      const result = await listUserOpenShiftProjects(mockFastify, KUBE_HEADERS);

      expect(result).toEqual([]);
      expect(mockFastify.log.error).not.toHaveBeenCalled();
    });

    it('should return empty array and log on non-403 errors', async () => {
      mockApi.listClusterCustomObject.mockRejectedValue(new Error('network failure'));

      const result = await listUserOpenShiftProjects(mockFastify, KUBE_HEADERS);

      expect(result).toEqual([]);
      expect(mockFastify.log.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to list OpenShift projects for user'),
      );
    });
  });

  describe('listFeastIntegrationNotebooks', () => {
    let mockFastify: ReturnType<typeof createMockKubeFastify>;
    let mockApi: ReturnType<typeof createMockApi>;

    let loadFromClusterAndUser: jest.Mock;

    beforeEach(() => {
      jest.clearAllMocks();
      mockApi = createMockApi();
      ({ loadFromClusterAndUser } = spyKubeConfigForMockApi(() => mockApi));
      mockFastify = createMockKubeFastify(mockApi);
    });

    it('should list notebooks with feast-integration label in namespace', async () => {
      const notebook = {
        metadata: {
          name: 'test-notebook',
          namespace: NAMESPACE.VIEWER,
          annotations: { 'opendatahub.io/feast-config': 'banking' },
        },
      };

      mockApi.listNamespacedCustomObject.mockResolvedValue({
        body: { items: [notebook] },
      });

      const result = await listFeastIntegrationNotebooks(
        mockFastify,
        NAMESPACE.VIEWER,
        KUBE_HEADERS,
      );

      expect(result).toEqual([notebook]);
      expect(mockApi.listNamespacedCustomObject).toHaveBeenCalledWith(
        'kubeflow.org',
        'v1',
        NAMESPACE.VIEWER,
        'notebooks',
        undefined,
        undefined,
        undefined,
        'opendatahub.io/feast-integration=true',
        undefined,
        undefined,
        undefined,
        undefined,
        { headers: {} },
      );
      expect(loadFromClusterAndUser).toHaveBeenCalledWith(
        { name: 'test-cluster', server: 'https://test' },
        { name: 'current-user', token: 'test-token' },
      );
    });

    it('should return empty array on 403 without throwing', async () => {
      mockApi.listNamespacedCustomObject.mockRejectedValue({ statusCode: 403 });

      const result = await listFeastIntegrationNotebooks(
        mockFastify,
        NAMESPACE.VIEWER,
        KUBE_HEADERS,
      );

      expect(result).toEqual([]);
      expect(mockFastify.log.error).not.toHaveBeenCalled();
    });

    it('should return empty array and log on non-403 errors', async () => {
      mockApi.listNamespacedCustomObject.mockRejectedValue(new Error('network failure'));

      const result = await listFeastIntegrationNotebooks(
        mockFastify,
        NAMESPACE.VIEWER,
        KUBE_HEADERS,
      );

      expect(result).toEqual([]);
      expect(mockFastify.log.error).toHaveBeenCalledWith(
        expect.stringContaining(`Failed to list feast-integrated notebooks in ${NAMESPACE.VIEWER}`),
      );
    });
  });

  describe('listFeastFeatureStoreCRDs', () => {
    let mockFastify: ReturnType<typeof createMockKubeFastify>;
    let mockApi: ReturnType<typeof createMockApi>;

    let loadFromClusterAndUser: jest.Mock;

    beforeEach(() => {
      jest.clearAllMocks();
      mockApi = createMockApi();
      ({ loadFromClusterAndUser } = spyKubeConfigForMockApi(() => mockApi));
      mockFastify = createMockKubeFastify(mockApi);
    });

    it('should return enabled FeatureStore CRDs for the namespace', async () => {
      const crd1 = createFeatureStoreCRD({
        metadata: { name: 'banking', namespace: NAMESPACE.VIEWER },
      });
      const crd2 = createFeatureStoreCRD({
        metadata: { name: 'retail', namespace: NAMESPACE.VIEWER },
      });

      mockApi.listNamespacedCustomObject.mockResolvedValue({
        body: { items: [crd1, crd2] },
      });

      const result = await listFeastFeatureStoreCRDs(mockFastify, NAMESPACE.VIEWER, KUBE_HEADERS);

      expect(result).toEqual([crd1, crd2]);
      expect(mockApi.listNamespacedCustomObject).toHaveBeenCalledWith(
        'feast.dev',
        'v1',
        NAMESPACE.VIEWER,
        'featurestores',
        undefined,
        undefined,
        undefined,
        'feature-store-ui=enabled',
        undefined,
        undefined,
        undefined,
        undefined,
        { headers: {} },
      );
      expect(loadFromClusterAndUser).toHaveBeenCalledWith(
        { name: 'test-cluster', server: 'https://test' },
        { name: 'current-user', token: 'test-token' },
      );
    });

    it('should return empty array when no enabled CRDs exist', async () => {
      mockApi.listNamespacedCustomObject.mockResolvedValue({
        body: { items: [] },
      });

      const result = await listFeastFeatureStoreCRDs(mockFastify, NAMESPACE.DEFAULT, KUBE_HEADERS);

      expect(result).toEqual([]);
    });

    it('should return empty array on 403 without throwing', async () => {
      mockApi.listNamespacedCustomObject.mockRejectedValue({ statusCode: 403 });

      const result = await listFeastFeatureStoreCRDs(mockFastify, NAMESPACE.VIEWER, KUBE_HEADERS);

      expect(result).toEqual([]);
      expect(mockFastify.log.error).not.toHaveBeenCalled();
    });

    it('should return empty array and log on non-403 errors', async () => {
      mockApi.listNamespacedCustomObject.mockRejectedValue(new Error('timeout'));

      const result = await listFeastFeatureStoreCRDs(mockFastify, NAMESPACE.VIEWER, KUBE_HEADERS);

      expect(result).toEqual([]);
      expect(mockFastify.log.error).toHaveBeenCalledWith(
        expect.stringContaining(`Failed to list FeatureStore CRDs in ${NAMESPACE.VIEWER}`),
      );
    });
  });

  describe('getFeastFeatureStoreCRD', () => {
    let mockFastify: ReturnType<typeof createMockKubeFastify>;
    let mockApi: ReturnType<typeof createMockApi>;

    let loadFromClusterAndUser: jest.Mock;

    beforeEach(() => {
      jest.clearAllMocks();
      mockApi = createMockApi();
      ({ loadFromClusterAndUser } = spyKubeConfigForMockApi(() => mockApi));
      mockFastify = createMockKubeFastify(mockApi);
    });

    it('should return the CRD when found', async () => {
      const crd = createFeatureStoreCRD();
      mockApi.getNamespacedCustomObject.mockResolvedValue({ body: crd });

      const result = await getFeastFeatureStoreCRD(
        mockFastify,
        NAMESPACE.VIEWER,
        PROJECT.BANKING,
        KUBE_HEADERS,
      );

      expect(result).toEqual(crd);
      expect(mockApi.getNamespacedCustomObject).toHaveBeenCalledWith(
        'feast.dev',
        'v1',
        NAMESPACE.VIEWER,
        'featurestores',
        PROJECT.BANKING,
        { headers: {} },
      );
      expect(loadFromClusterAndUser).toHaveBeenCalledWith(
        { name: 'test-cluster', server: 'https://test' },
        { name: 'current-user', token: 'test-token' },
      );
    });

    it('should return null on 404', async () => {
      mockApi.getNamespacedCustomObject.mockRejectedValue({ statusCode: 404 });

      const result = await getFeastFeatureStoreCRD(
        mockFastify,
        NAMESPACE.VIEWER,
        PROJECT.BANKING,
        KUBE_HEADERS,
      );

      expect(result).toBeNull();
      expect(mockFastify.log.error).not.toHaveBeenCalled();
    });

    it('should return null on 403', async () => {
      mockApi.getNamespacedCustomObject.mockRejectedValue({ statusCode: 403 });

      const result = await getFeastFeatureStoreCRD(
        mockFastify,
        NAMESPACE.VIEWER,
        PROJECT.BANKING,
        KUBE_HEADERS,
      );

      expect(result).toBeNull();
      expect(mockFastify.log.error).not.toHaveBeenCalled();
    });

    it('should return null and log on unexpected errors', async () => {
      mockApi.getNamespacedCustomObject.mockRejectedValue(new Error('cluster unreachable'));

      const result = await getFeastFeatureStoreCRD(
        mockFastify,
        NAMESPACE.VIEWER,
        PROJECT.BANKING,
        KUBE_HEADERS,
      );

      expect(result).toBeNull();
      expect(mockFastify.log.error).toHaveBeenCalledWith(
        expect.stringContaining(
          `Failed to get FeatureStore CRD ${NAMESPACE.VIEWER}/${PROJECT.BANKING}`,
        ),
      );
    });
  });

  describe('createFeatureStoreResponse', () => {
    it('should create response with default status', () => {
      const result = createFeatureStoreResponse(
        PROJECT.BANKING,
        `${PROJECT.BANKING}-project`,
        REGISTRY_URL.BANKING_HTTPS,
      );

      expect(result).toMatchObject({
        name: PROJECT.BANKING,
        project: `${PROJECT.BANKING}-project`,
        registry: {
          path: REGISTRY_URL.BANKING_HTTPS,
        },
        status: {
          conditions: [
            expect.objectContaining({
              type: 'Registry',
              status: 'True',
            }),
          ],
        },
      });
      expect(result.status.conditions[0].lastTransitionTime).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
      );
    });

    it('should create response with False status', () => {
      const result = createFeatureStoreResponse(
        PROJECT.RETAIL,
        `${PROJECT.RETAIL}-project`,
        REGISTRY_URL.RETAIL_HTTPS,
        'False',
      );

      expect(result.status.conditions[0].status).toBe('False');
    });

    it('should include namespace when provided', () => {
      const result = createFeatureStoreResponse(
        PROJECT.BANKING,
        `${PROJECT.BANKING}-project`,
        REGISTRY_URL.BANKING_HTTPS,
        'True',
        NAMESPACE.VIEWER,
      );

      expect(result.namespace).toBe(NAMESPACE.VIEWER);
    });

    it('should not include namespace when not provided', () => {
      const result = createFeatureStoreResponse(
        PROJECT.BANKING,
        `${PROJECT.BANKING}-project`,
        REGISTRY_URL.BANKING_HTTPS,
      );

      expect(result.namespace).toBeUndefined();
    });
  });

  describe('fetchFeastProjectsFromRegistry', () => {
    let mockFastify: ReturnType<typeof createMockKubeFastify>;
    const originalEnv = process.env;

    beforeEach(() => {
      jest.clearAllMocks();
      mockFastify = createMockKubeFastify();
      process.env = { ...originalEnv, NODE_ENV: 'development' };
      delete process.env.KUBERNETES_SERVICE_HOST;
    });

    afterEach(() => {
      process.env = originalEnv;
      mockHttpsRequest.mockReset();
    });

    it('should return projects from registry on success', async () => {
      const projectsResponse = {
        projects: [{ spec: { name: PROJECT.BANKING, description: 'Banking project' } }],
      };
      mockHttpsJsonResponse(200, projectsResponse);

      const result = await fetchFeastProjectsFromRegistry(
        mockFastify,
        createFeatureStoreCRD({ spec: { feastProject: PROJECT.BANKING } }),
        USER_TOKEN,
      );

      expect(result).toEqual(projectsResponse);
    });

    it('should return null when registry returns non-2xx status', async () => {
      mockHttpsJsonResponse(503, { error: 'unavailable' });

      const result = await fetchFeastProjectsFromRegistry(
        mockFastify,
        createFeatureStoreCRD(),
        USER_TOKEN,
      );

      expect(result).toBeNull();
      expect(mockFastify.log.info).toHaveBeenCalledWith(
        expect.stringContaining(
          `Projects list for ${NAMESPACE.VIEWER}/${PROJECT.BANKING}: unavailable`,
        ),
      );
    });

    it('should return null and log when registry request fails', async () => {
      mockHttpsJsonResponse(200, {}, { requestError: new Error('network failure') });

      const result = await fetchFeastProjectsFromRegistry(
        mockFastify,
        createFeatureStoreCRD(),
        USER_TOKEN,
      );

      expect(result).toBeNull();
      expect(mockFastify.log.info).toHaveBeenCalledWith(
        expect.stringContaining(
          `Projects list for ${NAMESPACE.VIEWER}/${PROJECT.BANKING}: unavailable`,
        ),
      );
    });
  });

  describe('getFeastProjectRegistryInfo', () => {
    let mockFastify: ReturnType<typeof createMockKubeFastify>;
    const originalEnv = process.env;

    beforeEach(() => {
      jest.clearAllMocks();
      mockFastify = createMockKubeFastify();
      process.env = { ...originalEnv, NODE_ENV: 'development' };
      delete process.env.KUBERNETES_SERVICE_HOST;
    });

    afterEach(() => {
      process.env = originalEnv;
      mockHttpsRequest.mockReset();
    });

    it('should return access and trimmed description when project is listed', async () => {
      mockHttpsJsonResponse(200, {
        projects: [{ spec: { name: PROJECT.BANKING, description: '  Banking DS  ' } }],
      });

      const result = await getFeastProjectRegistryInfo(
        mockFastify,
        createFeatureStoreCRD({ spec: { feastProject: PROJECT.BANKING } }),
        PROJECT.BANKING,
        USER_TOKEN,
      );

      expect(result).toEqual({ hasAccess: true, description: 'Banking DS' });
    });

    it('should use top-level description when spec description is missing', async () => {
      mockHttpsJsonResponse(200, {
        projects: [{ name: PROJECT.RETAIL, description: 'Retail project' }],
      });

      const result = await getFeastProjectRegistryInfo(
        mockFastify,
        createFeatureStoreCRD({ metadata: { name: PROJECT.RETAIL, namespace: NAMESPACE.VIEWER } }),
        PROJECT.RETAIL,
        USER_TOKEN,
      );

      expect(result).toEqual({ hasAccess: true, description: 'Retail project' });
    });

    it('should return hasAccess false when project is not in registry list', async () => {
      mockHttpsJsonResponse(200, {
        projects: [{ spec: { name: PROJECT.RETAIL } }],
      });

      const result = await getFeastProjectRegistryInfo(
        mockFastify,
        createFeatureStoreCRD({ spec: { feastProject: PROJECT.BANKING } }),
        PROJECT.BANKING,
        USER_TOKEN,
      );

      expect(result).toEqual({ hasAccess: false });
    });

    it('should return hasAccess false when registry fetch fails', async () => {
      mockHttpsJsonResponse(500, { error: 'unavailable' });

      const result = await getFeastProjectRegistryInfo(
        mockFastify,
        createFeatureStoreCRD(),
        PROJECT.BANKING,
        USER_TOKEN,
      );

      expect(result).toEqual({ hasAccess: false });
    });
  });

  describe('extractPermissionLevel', () => {
    it('should union spec.actions across all permissions', () => {
      const result = extractPermissionLevel({
        permissions: [
          { spec: { actions: ['read', 'describe'] } },
          { spec: { actions: ['read', 'write'] } },
        ],
      });

      expect(result).toEqual(expect.arrayContaining(['read', 'describe', 'write']));
      expect(result).toHaveLength(3);
    });

    it('should return empty array when permissions are missing', () => {
      expect(extractPermissionLevel({})).toEqual([]);
      expect(extractPermissionLevel({ permissions: [] })).toEqual([]);
    });

    it('should skip permissions without actions', () => {
      const result = extractPermissionLevel({
        permissions: [{ spec: {} }, { spec: { actions: ['read'] } }],
      });

      expect(result).toEqual(['read']);
    });
  });

  describe('buildWorkbenchesByFeastProjectMap', () => {
    const createNotebook = (
      overrides: Partial<FeastIntegrationNotebook> & {
        name: string;
        namespace: string;
        feastConfig?: string;
      },
    ): FeastIntegrationNotebook => ({
      metadata: {
        name: overrides.name,
        namespace: overrides.namespace,
        annotations: overrides.feastConfig
          ? { 'opendatahub.io/feast-config': overrides.feastConfig }
          : overrides.metadata?.annotations,
        ...overrides.metadata,
      },
    });

    it('should map feast project names to connected workbenches', () => {
      const notebooks = [
        createNotebook({
          name: 'wb-1',
          namespace: 'ds-project',
          feastConfig: 'banking, retail',
        }),
        createNotebook({
          name: 'wb-2',
          namespace: 'other-project',
          feastConfig: 'banking',
        }),
      ];

      const map = buildWorkbenchesByFeastProjectMap(notebooks);

      expect(map.get('banking')).toEqual([
        {
          workbenchName: 'wb-1',
          workbenchNamespace: 'ds-project',
          projectName: 'ds-project',
        },
        {
          workbenchName: 'wb-2',
          workbenchNamespace: 'other-project',
          projectName: 'other-project',
        },
      ]);
      expect(map.get('retail')).toEqual([
        {
          workbenchName: 'wb-1',
          workbenchNamespace: 'ds-project',
          projectName: 'ds-project',
        },
      ]);
    });

    it('should trim whitespace in feast-config project names', () => {
      const map = buildWorkbenchesByFeastProjectMap([
        createNotebook({
          name: 'wb-1',
          namespace: 'ds-project',
          feastConfig: ' banking , retail ',
        }),
      ]);

      expect(map.has('banking')).toBe(true);
      expect(map.has('retail')).toBe(true);
      expect(map.has(' banking ')).toBe(false);
    });

    it('should skip notebooks without feast-config annotation', () => {
      const map = buildWorkbenchesByFeastProjectMap([
        createNotebook({ name: 'wb-1', namespace: 'ds-project' }),
      ]);

      expect(map.size).toBe(0);
    });
  });
});
