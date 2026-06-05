import fsWorkbenchIntegrationRoute from '../routes/api/featurestores/fsworkbenchIntegration';
import { getDirectCallOptions, getAccessToken } from '../utils/directCallUtils';
import {
  listFeastNamespaces,
  listFeastFeatureStoreCRDs,
  makeAuthenticatedHttpRequest,
  handleError,
  isRegistryReady,
  getServiceFromCRD,
  constructRegistryProxyUrl,
  type FeatureStoreCRD,
} from '../routes/api/featurestores/featureStoreUtils';

jest.mock('../utils/directCallUtils');
jest.mock('../utils/route-security', () => ({
  secureRoute: jest.fn(() => (handler: any) => handler),
}));
jest.mock('../routes/api/featurestores/featureStoreUtils');

const mockGetDirectCallOptions = jest.mocked(getDirectCallOptions);
const mockGetAccessToken = jest.mocked(getAccessToken);
const mockListFeastNamespaces = jest.mocked(listFeastNamespaces);
const mockListFeastFeatureStoreCRDs = jest.mocked(listFeastFeatureStoreCRDs);
const mockMakeAuthenticatedHttpRequest = jest.mocked(makeAuthenticatedHttpRequest);
const mockHandleError = jest.mocked(handleError);
const mockIsRegistryReady = jest.mocked(isRegistryReady);
const mockGetServiceFromCRD = jest.mocked(getServiceFromCRD);
const mockConstructRegistryProxyUrl = jest.mocked(constructRegistryProxyUrl);

const TOKEN = 'test-token';
const NAMESPACE = 'test-namespace';
const CRD_NAME = 'banking';

const MOCK_SERVICE = {
  serviceName: `feast-${CRD_NAME}-registry-rest`,
  namespace: NAMESPACE,
  protocol: 'https' as const,
  port: '443',
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

describe('fsworkbenchIntegration routes', () => {
  let mockFastify: ReturnType<typeof createMockFastify>;
  let mockReply: ReturnType<typeof createMockReply>;
  let workbenchHandler: (req: any, reply: any) => Promise<void>;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockFastify = createMockFastify();
    mockReply = createMockReply();
    mockGetDirectCallOptions.mockResolvedValue({
      headers: { Authorization: `Bearer ${TOKEN}` },
    } as any);
    mockGetAccessToken.mockReturnValue(TOKEN);
    mockHandleError.mockReturnValue('error occurred');

    await fsWorkbenchIntegrationRoute(mockFastify);
    workbenchHandler = (mockFastify.get as jest.Mock).mock.calls[0][1];
  });

  describe('Route registration', () => {
    it('should register GET /workbench-integration', () => {
      expect((mockFastify.get as jest.Mock).mock.calls[0][0]).toBe('/workbench-integration');
    });
  });

  describe('GET /workbench-integration', () => {
    it('should return 401 when no access token is present', async () => {
      mockGetAccessToken.mockReturnValue(null as any);

      await workbenchHandler({ params: {}, headers: {} }, mockReply);

      expect(mockReply.code).toHaveBeenCalledWith(401);
      expect(mockReply.send).toHaveBeenCalledWith({ error: 'User authentication required' });
    });

    it('should return empty namespaces array when no namespaces are found', async () => {
      mockListFeastNamespaces.mockResolvedValue([]);

      await workbenchHandler({ params: {}, headers: {} }, mockReply);

      expect(mockReply.send).toHaveBeenCalledWith({ namespaces: [] });
    });

    it('should filter out namespaces where no CRD registry is ready', async () => {
      mockListFeastNamespaces.mockResolvedValue([NAMESPACE]);
      mockListFeastFeatureStoreCRDs.mockResolvedValue([createMockCRD()]);
      mockIsRegistryReady.mockReturnValue(false);

      await workbenchHandler({ params: {}, headers: {} }, mockReply);

      expect(mockReply.send).toHaveBeenCalledWith({ namespaces: [] });
    });

    it('should filter out CRDs where access check is denied', async () => {
      mockListFeastNamespaces.mockResolvedValue([NAMESPACE]);
      mockListFeastFeatureStoreCRDs.mockResolvedValue([createMockCRD()]);
      mockIsRegistryReady.mockReturnValue(true);
      mockGetServiceFromCRD.mockReturnValue(MOCK_SERVICE);
      mockConstructRegistryProxyUrl.mockReturnValue('https://registry.local/api/v1/projects');
      mockMakeAuthenticatedHttpRequest.mockRejectedValue(new Error('forbidden'));

      await workbenchHandler({ params: {}, headers: {} }, mockReply);

      expect(mockReply.send).toHaveBeenCalledWith({ namespaces: [] });
    });

    it('should return namespaces with configs for accessible feature stores', async () => {
      mockListFeastNamespaces.mockResolvedValue([NAMESPACE]);
      mockListFeastFeatureStoreCRDs.mockResolvedValue([createMockCRD()]);
      mockIsRegistryReady.mockReturnValue(true);
      mockGetServiceFromCRD.mockReturnValue(MOCK_SERVICE);
      mockConstructRegistryProxyUrl.mockReturnValue('https://registry.local/api/v1/projects');
      mockMakeAuthenticatedHttpRequest.mockResolvedValue({
        data: { projects: [{ name: CRD_NAME }] },
        statusCode: 200,
      });

      await workbenchHandler({ params: {}, headers: {} }, mockReply);

      expect(mockReply.send).toHaveBeenCalledWith({
        namespaces: [
          {
            namespace: NAMESPACE,
            clientConfigs: [
              {
                configName: CRD_NAME,
                projectName: CRD_NAME,
                hasAccessToFeatureStore: true,
              },
            ],
          },
        ],
      });
    });

    it('should return 500 and call handleError on unexpected internal error', async () => {
      mockListFeastNamespaces.mockRejectedValue(new Error('cluster unreachable'));

      await workbenchHandler({ params: {}, headers: {} }, mockReply);

      expect(mockHandleError).toHaveBeenCalledWith(
        mockFastify,
        expect.any(Error),
        'workbench-integration',
      );
      expect(mockReply.code).toHaveBeenCalledWith(500);
      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Failed to fetch workbench feature store configs',
          status_code: 500,
        }),
      );
    });
  });
});
