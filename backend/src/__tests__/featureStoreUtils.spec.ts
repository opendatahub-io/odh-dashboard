import {
  constructRegistryProxyUrl,
  createFeatureStoreResponse,
  handleError,
  isRegistryReady,
  getServiceFromCRD,
  listFeastNamespaces,
  listFeastFeatureStoreCRDs,
  getFeastFeatureStoreCRD,
  type FeatureStoreCRD,
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
    },
  } as any);

const KUBE_HEADERS = { Authorization: 'Bearer test-token' } as Record<string, string>;

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

    beforeEach(() => {
      jest.clearAllMocks();
      mockApi = createMockApi();
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
        { headers: KUBE_HEADERS },
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
  });

  describe('listFeastFeatureStoreCRDs', () => {
    let mockFastify: ReturnType<typeof createMockKubeFastify>;
    let mockApi: ReturnType<typeof createMockApi>;

    beforeEach(() => {
      jest.clearAllMocks();
      mockApi = createMockApi();
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
        { headers: KUBE_HEADERS },
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

    beforeEach(() => {
      jest.clearAllMocks();
      mockApi = createMockApi();
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
        { headers: KUBE_HEADERS },
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
});
