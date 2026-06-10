import featureStoresRoute from '../routes/api/featurestores/featureStores';
import { getDirectCallOptions, getAccessToken } from '../utils/directCallUtils';
import {
  listFeastNamespaces,
  listFeastFeatureStoreCRDs,
  getFeastFeatureStoreCRD,
  makeAuthenticatedHttpRequest,
  handleError,
  isRegistryReady,
  getServiceFromCRD,
  constructRegistryProxyUrl,
  createFeatureStoreResponse,
  type FeatureStoreCRD,
} from '../routes/api/featurestores/featureStoreUtils';

jest.mock('../utils/directCallUtils');
jest.mock('../routes/api/featurestores/featureStoreUtils');

const mockGetDirectCallOptions = jest.mocked(getDirectCallOptions);
const mockGetAccessToken = jest.mocked(getAccessToken);
const mockListFeastNamespaces = jest.mocked(listFeastNamespaces);
const mockListFeastFeatureStoreCRDs = jest.mocked(listFeastFeatureStoreCRDs);
const mockGetFeastFeatureStoreCRD = jest.mocked(getFeastFeatureStoreCRD);
const mockMakeAuthenticatedHttpRequest = jest.mocked(makeAuthenticatedHttpRequest);
const mockHandleError = jest.mocked(handleError);
const mockIsRegistryReady = jest.mocked(isRegistryReady);
const mockGetServiceFromCRD = jest.mocked(getServiceFromCRD);
const mockConstructRegistryProxyUrl = jest.mocked(constructRegistryProxyUrl);
const mockCreateFeatureStoreResponse = jest.mocked(createFeatureStoreResponse);

const TOKEN = 'test-token';
const NAMESPACE = 'test-namespace';
const CRD_NAME = 'banking';
const PROJECT = 'my_project';

const FEAST_API = {
  FEATURES: 'api/v1/features',
  LINEAGE: 'api/v1/lineage/complete',
  PROJECTS: 'api/v1/projects',
} as const;

const REGISTRY_URL = {
  FEATURES: `https://registry.local/${FEAST_API.FEATURES}`,
  PROJECTS: `https://registry.local/${FEAST_API.PROJECTS}`,
  BASE: 'https://registry.local',
} as const;

const MOCK_SERVICE = {
  serviceName: `feast-${CRD_NAME}-registry-rest`,
  namespace: NAMESPACE,
  protocol: 'https' as const,
  port: '443',
};

const MOCK_FEATURE_STORE = {
  name: CRD_NAME,
  project: CRD_NAME,
  registry: { path: `https://feast-${CRD_NAME}-registry-rest.${NAMESPACE}.svc.cluster.local` },
  namespace: NAMESPACE,
  status: { conditions: [{ type: 'Registry', status: 'True', lastTransitionTime: '' }] },
};

const createMockFastify = () =>
  ({
    log: { error: jest.fn(), warn: jest.fn(), debug: jest.fn(), info: jest.fn() },
    kube: { customObjectsApi: {} },
    get: jest.fn(),
  } as any);

const createMockReply = () => {
  const reply: any = { send: jest.fn(), code: jest.fn(), type: jest.fn() };
  reply.code.mockReturnValue(reply);
  reply.type.mockReturnValue(reply);
  return reply;
};

const createMockCRD = (overrides: Partial<FeatureStoreCRD> = {}): FeatureStoreCRD => ({
  apiVersion: 'feast.dev/v1',
  kind: 'FeatureStore',
  metadata: { name: CRD_NAME, namespace: NAMESPACE, ...overrides.metadata },
  ...overrides,
});

const createProxyReq = (feastPath: string) => {
  const [pathPart, queryPart] = feastPath.split('?');
  const query: Record<string, string> = {};
  if (queryPart) {
    queryPart.split('&').forEach((pair) => {
      const [k, v] = pair.split('=');
      query[decodeURIComponent(k)] = decodeURIComponent(v ?? '');
    });
  }
  return {
    params: { namespace: NAMESPACE, name: CRD_NAME, '*': pathPart },
    url: `/api/featurestores/${NAMESPACE}/${CRD_NAME}/${feastPath}`,
    query,
    headers: {},
  };
};

const setupSuccessfulProxyMocks = (registryUrl: string = REGISTRY_URL.FEATURES) => {
  mockGetFeastFeatureStoreCRD.mockResolvedValue(createMockCRD());
  mockGetServiceFromCRD.mockReturnValue(MOCK_SERVICE);
  mockConstructRegistryProxyUrl.mockReturnValue(registryUrl);
  mockMakeAuthenticatedHttpRequest.mockResolvedValue({ data: {}, statusCode: 200 });
};

describe('featureStores routes', () => {
  let mockFastify: ReturnType<typeof createMockFastify>;
  let mockReply: ReturnType<typeof createMockReply>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockFastify = createMockFastify();
    mockReply = createMockReply();
    mockGetDirectCallOptions.mockResolvedValue({
      headers: { Authorization: `Bearer ${TOKEN}` },
    } as any);
    mockGetAccessToken.mockReturnValue(TOKEN);
    mockHandleError.mockReturnValue('error occurred');
  });

  describe('Route registration', () => {
    it('should register GET / and GET /:namespace/:name/* routes', async () => {
      await featureStoresRoute(mockFastify);

      const registeredPaths = (mockFastify.get as jest.Mock).mock.calls.map(
        (call: any[]) => call[0],
      );
      expect(registeredPaths).toContain('/');
      expect(registeredPaths).toContain('/:namespace/:name/*');
    });
  });

  describe('GET /', () => {
    let listHandler: (req: any, reply: any) => Promise<void>;

    beforeEach(async () => {
      await featureStoresRoute(mockFastify);
      listHandler = (mockFastify.get as jest.Mock).mock.calls[0][1];
    });

    it('should throw when no access token is present', async () => {
      mockGetAccessToken.mockReturnValue(null as any);

      await expect(listHandler({ params: {}, headers: {} }, mockReply)).rejects.toMatchObject({
        statusCode: 401,
      });
    });

    it('should return empty response when no namespaces are found', async () => {
      mockListFeastNamespaces.mockResolvedValue([]);

      await listHandler({ params: {}, headers: {} }, mockReply);

      expect(mockReply.send).toHaveBeenCalledWith({ featureStores: [], enabledCRDCount: 0 });
    });

    it('should skip CRDs where registry is not ready', async () => {
      mockListFeastNamespaces.mockResolvedValue([NAMESPACE]);
      mockListFeastFeatureStoreCRDs.mockResolvedValue([createMockCRD()]);
      mockIsRegistryReady.mockReturnValue(false);

      await listHandler({ params: {}, headers: {} }, mockReply);

      expect(mockMakeAuthenticatedHttpRequest).not.toHaveBeenCalled();
      expect(mockReply.send).toHaveBeenCalledWith({ featureStores: [], enabledCRDCount: 1 });
    });

    it('should skip CRDs where registry fetch fails and log a warning', async () => {
      mockListFeastNamespaces.mockResolvedValue([NAMESPACE]);
      mockListFeastFeatureStoreCRDs.mockResolvedValue([createMockCRD()]);
      mockIsRegistryReady.mockReturnValue(true);
      mockGetServiceFromCRD.mockReturnValue(MOCK_SERVICE);
      mockConstructRegistryProxyUrl.mockReturnValue(REGISTRY_URL.PROJECTS);
      mockMakeAuthenticatedHttpRequest.mockRejectedValue(new Error('connection refused'));

      await listHandler({ params: {}, headers: {} }, mockReply);

      expect(mockFastify.log.warn).toHaveBeenCalledWith(
        expect.stringContaining(`${NAMESPACE}/${CRD_NAME}`),
      );
      expect(mockReply.send).toHaveBeenCalledWith({ featureStores: [], enabledCRDCount: 1 });
    });

    it('should return feature stores for ready CRDs with successful registry response', async () => {
      mockListFeastNamespaces.mockResolvedValue([NAMESPACE]);
      mockListFeastFeatureStoreCRDs.mockResolvedValue([createMockCRD()]);
      mockIsRegistryReady.mockReturnValue(true);
      mockGetServiceFromCRD.mockReturnValue(MOCK_SERVICE);
      // First call: registryUrl (api/v1/projects fetch), second call: baseRegistryUrl (trailing slash stripped)
      mockConstructRegistryProxyUrl
        .mockReturnValueOnce(REGISTRY_URL.PROJECTS)
        .mockReturnValueOnce(REGISTRY_URL.BASE);
      mockMakeAuthenticatedHttpRequest.mockResolvedValue({
        data: { projects: [{ name: CRD_NAME }] },
        statusCode: 200,
      });
      mockCreateFeatureStoreResponse.mockReturnValue(MOCK_FEATURE_STORE as any);

      await listHandler({ params: {}, headers: {} }, mockReply);

      expect(mockCreateFeatureStoreResponse).toHaveBeenCalledWith(
        CRD_NAME,
        CRD_NAME,
        REGISTRY_URL.BASE,
        'True',
        NAMESPACE,
      );
      expect(mockReply.send).toHaveBeenCalledWith({
        featureStores: [MOCK_FEATURE_STORE],
        enabledCRDCount: 1,
      });
    });
  });

  describe('GET /:namespace/:name/*', () => {
    let proxyHandler: (req: any, reply: any) => Promise<void>;

    beforeEach(async () => {
      await featureStoresRoute(mockFastify);
      proxyHandler = (mockFastify.get as jest.Mock).mock.calls[1][1];
    });

    it('should throw 400 for namespace with invalid DNS-1123 characters', async () => {
      const req = {
        params: { namespace: 'INVALID_NS!', name: CRD_NAME },
        url: `/api/featurestores/INVALID_NS!/${CRD_NAME}/${FEAST_API.FEATURES}`,
        raw: { url: `/api/featurestores/INVALID_NS!/${CRD_NAME}/${FEAST_API.FEATURES}` },
        query: {},
        headers: {},
      };

      await expect(proxyHandler(req, mockReply)).rejects.toMatchObject({ statusCode: 400 });
      expect(mockGetFeastFeatureStoreCRD).not.toHaveBeenCalled();
    });

    it('should throw 400 when wildcard path does not start with api/v1/', async () => {
      const req = {
        params: { namespace: NAMESPACE, name: CRD_NAME, '*': 'admin/reset' },
        url: `/api/featurestores/${NAMESPACE}/${CRD_NAME}/admin/reset`,
        raw: { url: `/api/featurestores/${NAMESPACE}/${CRD_NAME}/admin/reset` },
        query: {},
        headers: {},
      };

      await expect(proxyHandler(req, mockReply)).rejects.toMatchObject({ statusCode: 400 });
      expect(mockGetFeastFeatureStoreCRD).not.toHaveBeenCalled();
    });

    it('should throw 400 when wildcard path contains path traversal sequences', async () => {
      const req = {
        params: { namespace: NAMESPACE, name: CRD_NAME, '*': 'api/v1/../../../sensitive' },
        url: `/api/featurestores/${NAMESPACE}/${CRD_NAME}/api/v1/../../../sensitive`,
        raw: { url: `/api/featurestores/${NAMESPACE}/${CRD_NAME}/api/v1/../../../sensitive` },
        query: {},
        headers: {},
      };

      await expect(proxyHandler(req, mockReply)).rejects.toMatchObject({ statusCode: 400 });
      expect(mockGetFeastFeatureStoreCRD).not.toHaveBeenCalled();
    });

    it('should throw 401 when no access token is present', async () => {
      mockGetAccessToken.mockReturnValue(null as any);

      await expect(
        proxyHandler(createProxyReq(FEAST_API.FEATURES), mockReply),
      ).rejects.toMatchObject({
        statusCode: 401,
      });
    });

    it('should throw 404 when CRD is not found', async () => {
      mockGetFeastFeatureStoreCRD.mockResolvedValue(null);

      await expect(
        proxyHandler(createProxyReq(FEAST_API.FEATURES), mockReply),
      ).rejects.toMatchObject({ statusCode: 404 });
    });

    it('should proxy request and forward status code, content type, and data', async () => {
      const responseData = { features: [{ name: 'feature-1' }] };
      mockGetFeastFeatureStoreCRD.mockResolvedValue(createMockCRD());
      mockGetServiceFromCRD.mockReturnValue(MOCK_SERVICE);
      mockConstructRegistryProxyUrl.mockReturnValue(REGISTRY_URL.FEATURES);
      mockMakeAuthenticatedHttpRequest.mockResolvedValue({ data: responseData, statusCode: 200 });

      await proxyHandler(createProxyReq(FEAST_API.FEATURES), mockReply);

      expect(mockReply.code).toHaveBeenCalledWith(200);
      expect(mockReply.type).toHaveBeenCalledWith('application/json');
      expect(mockReply.send).toHaveBeenCalledWith(responseData);
    });

    it.each([
      [`${FEAST_API.LINEAGE}?project=${PROJECT}`, `${FEAST_API.LINEAGE}?project=${PROJECT}`],
      [
        `${FEAST_API.FEATURES}?project=${PROJECT}&include_relationships=true`,
        `${FEAST_API.FEATURES}?project=${PROJECT}&include_relationships=true`,
      ],
    ])('should forward query string "%s" to the proxied path', async (feastPath, expectedPath) => {
      setupSuccessfulProxyMocks(`https://registry.local/${expectedPath}`);

      await proxyHandler(createProxyReq(feastPath), mockReply);

      expect(mockConstructRegistryProxyUrl).toHaveBeenCalledWith(
        MOCK_SERVICE.serviceName,
        NAMESPACE,
        expectedPath,
        true,
        MOCK_SERVICE.protocol,
        MOCK_SERVICE.port,
      );
    });

    it('should default path to api/v1/projects when wildcard path is empty', async () => {
      setupSuccessfulProxyMocks(REGISTRY_URL.PROJECTS);

      const req = {
        params: { namespace: NAMESPACE, name: CRD_NAME, '*': '' },
        url: `/api/featurestores/${NAMESPACE}/${CRD_NAME}`,
        raw: { url: `/api/featurestores/${NAMESPACE}/${CRD_NAME}` },
        query: {},
        headers: {},
      };

      await proxyHandler(req, mockReply);

      expect(mockConstructRegistryProxyUrl).toHaveBeenCalledWith(
        MOCK_SERVICE.serviceName,
        NAMESPACE,
        FEAST_API.PROJECTS,
        true,
        MOCK_SERVICE.protocol,
        MOCK_SERVICE.port,
      );
    });

    it('should throw 500 when registry request fails', async () => {
      mockGetFeastFeatureStoreCRD.mockResolvedValue(createMockCRD());
      mockGetServiceFromCRD.mockReturnValue(MOCK_SERVICE);
      mockConstructRegistryProxyUrl.mockReturnValue(REGISTRY_URL.FEATURES);
      mockMakeAuthenticatedHttpRequest.mockRejectedValue(new Error('timeout'));

      await expect(
        proxyHandler(createProxyReq(FEAST_API.FEATURES), mockReply),
      ).rejects.toMatchObject({ statusCode: 500 });
      expect(mockHandleError).toHaveBeenCalledWith(
        mockFastify,
        expect.any(Error),
        'Direct request error',
      );
    });
  });
});
