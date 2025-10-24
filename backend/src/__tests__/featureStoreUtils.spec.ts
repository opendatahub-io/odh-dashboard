import {
  parseNamespacesData,
  extractServiceInfo,
  constructRegistryProxyUrl,
  findRegistryUrlForFeatureStore,
  createFeatureStoreResponse,
  filterEnabledCRDs,
  handleError,
  FeatureStoreCRD,
  ClientConfigInfo,
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
  ENABLED_2: 'enabled-2',
  NO_LABELS: 'no-labels',
} as const;

const CONFIG_NAME = {
  BANKING: 'banking-config',
  RETAIL: 'retail-config',
} as const;

const SERVICE_NAME = {
  BANKING_REST: 'feast-banking-registry-rest',
  RETAIL_REST: 'feast-retail-registry-rest',
  TEST_REST: 'feast-test-registry-rest',
  COMPLEX_REST: 'feast-my-complex-name-registry-rest',
} as const;

const REGISTRY_URL = {
  BANKING_HTTPS: 'https://feast-banking-registry.viewer.svc.cluster.local',
  BANKING_HTTPS_WITH_PORT: 'https://feast-banking-registry.viewer.svc.cluster.local:8080',
  RETAIL_HTTP: 'http://feast-retail-registry.default.svc.cluster.local',
  RETAIL_HTTPS: 'https://feast-retail-registry.default.svc.cluster.local',
  TEST_NO_PROTOCOL: 'feast-test-registry.test-ns.svc.cluster.local',
  COMPLEX_NAME: 'feast-my-complex-name-registry.namespace-with-dash.svc.cluster.local',
  INVALID: 'invalid-url-format',
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
    },
  } as any);

const createClientConfigInfo = (overrides: Partial<ClientConfigInfo> = {}): ClientConfigInfo => ({
  configName: CONFIG_NAME.BANKING,
  namespace: NAMESPACE.VIEWER,
  registryUrl: REGISTRY_URL.BANKING_HTTPS,
  projectName: PROJECT.BANKING,
  ...overrides,
});

const createFeatureStoreCRD = (overrides: Partial<FeatureStoreCRD> = {}): FeatureStoreCRD => ({
  apiVersion: 'feast.dev/v1alpha1',
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

  describe('parseNamespacesData', () => {
    it('should parse valid namespaces data', () => {
      const configMapData = JSON.stringify({
        namespaces: {
          namespace1: ['config1', 'config2'],
          namespace2: ['config3'],
        },
      });

      const result = parseNamespacesData(configMapData);

      expect(result).toEqual({
        namespaces: {
          namespace1: ['config1', 'config2'],
          namespace2: ['config3'],
        },
      });
    });

    it('should handle empty namespaces object', () => {
      const configMapData = JSON.stringify({ namespaces: {} });

      const result = parseNamespacesData(configMapData);

      expect(result).toEqual({ namespaces: {} });
    });

    it('should handle missing namespaces key', () => {
      const configMapData = JSON.stringify({});

      const result = parseNamespacesData(configMapData);

      expect(result).toEqual({ namespaces: {} });
    });

    it('should throw error on invalid JSON', () => {
      const invalidJson = 'not valid json';

      expect(() => parseNamespacesData(invalidJson)).toThrow('Failed to parse namespaces data');
    });
  });

  describe('extractServiceInfo', () => {
    it('should extract service info from https URL with port', () => {
      const result = extractServiceInfo(REGISTRY_URL.BANKING_HTTPS_WITH_PORT);

      expect(result).toEqual({
        serviceName: SERVICE_NAME.BANKING_REST,
        serviceNamespace: NAMESPACE.VIEWER,
        originalUrl: REGISTRY_URL.BANKING_HTTPS_WITH_PORT,
        protocol: PROTOCOL.HTTPS,
        port: PORT.CUSTOM_8080,
      });
    });

    it('should extract service info from https URL without port', () => {
      const result = extractServiceInfo(REGISTRY_URL.BANKING_HTTPS);

      expect(result).toEqual({
        serviceName: SERVICE_NAME.BANKING_REST,
        serviceNamespace: NAMESPACE.VIEWER,
        originalUrl: REGISTRY_URL.BANKING_HTTPS,
        protocol: PROTOCOL.HTTPS,
        port: PORT.HTTPS_DEFAULT,
      });
    });

    it('should extract service info from http URL without port', () => {
      const result = extractServiceInfo(REGISTRY_URL.RETAIL_HTTP);

      expect(result).toEqual({
        serviceName: SERVICE_NAME.RETAIL_REST,
        serviceNamespace: NAMESPACE.DEFAULT,
        originalUrl: REGISTRY_URL.RETAIL_HTTP,
        protocol: PROTOCOL.HTTP,
        port: PORT.HTTP_DEFAULT,
      });
    });

    it('should default to https when no protocol specified', () => {
      const result = extractServiceInfo(REGISTRY_URL.TEST_NO_PROTOCOL);

      expect(result).toEqual({
        serviceName: SERVICE_NAME.TEST_REST,
        serviceNamespace: NAMESPACE.TEST_NS,
        originalUrl: REGISTRY_URL.TEST_NO_PROTOCOL,
        protocol: PROTOCOL.HTTPS,
        port: PORT.HTTPS_DEFAULT,
      });
    });

    it('should throw error for invalid URL format', () => {
      expect(() => extractServiceInfo(REGISTRY_URL.INVALID)).toThrow('Invalid registry URL format');
    });

    it('should handle service names with hyphens', () => {
      const result = extractServiceInfo(REGISTRY_URL.COMPLEX_NAME);

      expect(result).toEqual({
        serviceName: SERVICE_NAME.COMPLEX_REST,
        serviceNamespace: NAMESPACE.NAMESPACE_WITH_DASH,
        originalUrl: REGISTRY_URL.COMPLEX_NAME,
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

  describe('findRegistryUrlForFeatureStore', () => {
    const registryUrls: ClientConfigInfo[] = [
      createClientConfigInfo(),
      createClientConfigInfo({
        configName: CONFIG_NAME.RETAIL,
        namespace: NAMESPACE.DEFAULT,
        registryUrl: REGISTRY_URL.RETAIL_HTTPS,
        projectName: PROJECT.RETAIL,
      }),
    ];

    it('should find registry URL for existing feature store', () => {
      const result = findRegistryUrlForFeatureStore(PROJECT.BANKING, registryUrls);

      expect(result).toBe(REGISTRY_URL.BANKING_HTTPS);
    });

    it('should find registry URL for second feature store', () => {
      const result = findRegistryUrlForFeatureStore(PROJECT.RETAIL, registryUrls);

      expect(result).toBe(REGISTRY_URL.RETAIL_HTTPS);
    });

    it('should return null for non-existent feature store', () => {
      const result = findRegistryUrlForFeatureStore('non-existent', registryUrls);

      expect(result).toBeNull();
    });

    it('should return null for empty registry URLs array', () => {
      const result = findRegistryUrlForFeatureStore(PROJECT.BANKING, []);

      expect(result).toBeNull();
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

  describe('filterEnabledCRDs', () => {
    const crds: FeatureStoreCRD[] = [
      createFeatureStoreCRD({
        metadata: {
          name: PROJECT.BANKING,
          namespace: NAMESPACE.VIEWER,
          labels: {
            'feature-store-ui': 'enabled',
          },
        },
      }),
      createFeatureStoreCRD({
        metadata: {
          name: PROJECT.RETAIL,
          namespace: NAMESPACE.DEFAULT,
          labels: {
            'feature-store-ui': 'disabled',
          },
        },
      }),
      createFeatureStoreCRD({
        metadata: {
          name: PROJECT.TEST,
          namespace: NAMESPACE.TEST_NS,
        },
      }),
      createFeatureStoreCRD({
        metadata: {
          name: PROJECT.ENABLED_2,
          namespace: NAMESPACE.VIEWER,
          labels: {
            'feature-store-ui': 'enabled',
            'other-label': 'value',
          },
        },
      }),
    ];

    it('should filter CRDs with feature-store-ui label set to enabled', () => {
      const result = filterEnabledCRDs(crds);

      expect(result).toHaveLength(2);
      expect(result[0].metadata.name).toBe(PROJECT.BANKING);
      expect(result[1].metadata.name).toBe(PROJECT.ENABLED_2);
    });

    it('should return empty array when no CRDs are enabled', () => {
      const disabledCrds = crds.filter(
        (crd) => crd.metadata.name !== PROJECT.BANKING && crd.metadata.name !== PROJECT.ENABLED_2,
      );

      const result = filterEnabledCRDs(disabledCrds);

      expect(result).toHaveLength(0);
    });

    it('should return empty array for empty input', () => {
      const result = filterEnabledCRDs([]);

      expect(result).toHaveLength(0);
    });

    it('should handle CRDs with no labels', () => {
      const noLabelsCrd = createFeatureStoreCRD({
        metadata: {
          name: PROJECT.NO_LABELS,
          namespace: NAMESPACE.DEFAULT,
        },
      });

      const result = filterEnabledCRDs([noLabelsCrd]);

      expect(result).toHaveLength(0);
    });
  });
});
