import { FastifyReply } from 'fastify';
import { KubeFastifyInstance, OauthFastifyRequest } from '../types';
import * as notebookUtils from '../utils/notebookUtils';
import * as directCallUtils from '../utils/directCallUtils';
import * as featureStoreUtils from '../routes/api/featurestores/featureStoreUtils';
import registerRoutes from '../routes/api/featurestores/fsworkbenchIntegration';

jest.mock('../utils/notebookUtils');
jest.mock('../utils/directCallUtils');
jest.mock('../routes/api/featurestores/featureStoreUtils');
jest.mock('../utils/route-security', () => ({
  secureRoute: () => (handler: (...args: unknown[]) => Promise<unknown>) => handler,
}));

const mockGetNamespaces = jest.mocked(notebookUtils.getNamespaces);
const mockGetAccessToken = jest.mocked(directCallUtils.getAccessToken);
const mockGetDirectCallOptions = jest.mocked(directCallUtils.getDirectCallOptions);
const mockFetchConfigMap = jest.mocked(featureStoreUtils.fetchConfigMap);
const mockParseNamespacesData = jest.mocked(featureStoreUtils.parseNamespacesData);
const mockGetClientConfigs = jest.mocked(featureStoreUtils.getClientConfigs);
const mockFetchFromRegistry = jest.mocked(featureStoreUtils.fetchFromRegistry);
const mockHandleError = jest.mocked(featureStoreUtils.handleError);

describe('fsworkbenchIntegration routes', () => {
  let fastify: KubeFastifyInstance;
  let routeHandlers: Record<string, (req: any, reply: any) => Promise<any>>;

  const mockReply = (): FastifyReply =>
    ({
      send: jest.fn().mockReturnThis(),
      code: jest.fn().mockReturnThis(),
    } as unknown as FastifyReply);

  beforeEach(async () => {
    jest.resetAllMocks();
    routeHandlers = {};

    fastify = {
      get: jest.fn((path: string, handler: (req: any, reply: any) => Promise<any>) => {
        routeHandlers[path] = handler;
      }),
      log: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
      },
    } as unknown as KubeFastifyInstance;

    mockGetNamespaces.mockReturnValue({
      dashboardNamespace: 'test-dashboard-ns',
      workbenchNamespace: 'test-notebook-ns',
    });
    mockGetAccessToken.mockReturnValue('test-token');
    mockGetDirectCallOptions.mockResolvedValue({} as any);
    mockHandleError.mockImplementation((_f, error, context) => {
      const msg = error instanceof Error ? error.message : String(error);
      return `${context}: ${msg}`;
    });

    await registerRoutes(fastify);
  });

  describe('GET /workbench-integration', () => {
    it('should return empty namespaces when ConfigMap not found', async () => {
      mockFetchConfigMap.mockResolvedValue(null);

      const req = {} as OauthFastifyRequest;
      const reply = mockReply();

      await routeHandlers['/workbench-integration'](req, reply);

      expect(reply.send).toHaveBeenCalledWith({ namespaces: [] });
    });

    it('should return empty namespaces when ConfigMap has no namespaces data', async () => {
      mockFetchConfigMap.mockResolvedValue({
        data: {},
      } as any);

      const req = {} as OauthFastifyRequest;
      const reply = mockReply();

      await routeHandlers['/workbench-integration'](req, reply);

      expect(reply.send).toHaveBeenCalledWith({ namespaces: [] });
    });

    it('should return workbench integration data with accessible configs', async () => {
      mockFetchConfigMap.mockResolvedValue({
        data: { namespaces: '{"namespaces":{"ns1":["config1"]}}' },
      } as any);
      mockParseNamespacesData.mockReturnValue({
        namespaces: { ns1: ['config1'] },
      });
      mockGetClientConfigs.mockResolvedValue([
        {
          configName: 'config1',
          namespace: 'ns1',
          registryUrl: 'https://feast-test-registry.ns1.svc.cluster.local',
          projectName: 'test-project',
        },
      ]);
      mockFetchFromRegistry.mockResolvedValue([{ name: 'test-project', project: 'test-project' }]);

      const req = {} as OauthFastifyRequest;
      const reply = mockReply();

      await routeHandlers['/workbench-integration'](req, reply);

      expect(reply.send).toHaveBeenCalledWith({
        namespaces: [
          {
            namespace: 'ns1',
            clientConfigs: [
              {
                configName: 'config1',
                projectName: 'test-project',
                hasAccessToFeatureStore: true,
              },
            ],
          },
        ],
      });
    });

    it('should handle registry access check failure gracefully', async () => {
      mockFetchConfigMap.mockResolvedValue({
        data: { namespaces: '{"namespaces":{"ns1":["config1"]}}' },
      } as any);
      mockParseNamespacesData.mockReturnValue({
        namespaces: { ns1: ['config1'] },
      });
      mockGetClientConfigs.mockResolvedValue([
        {
          configName: 'config1',
          namespace: 'ns1',
          registryUrl: 'https://feast-test-registry.ns1.svc.cluster.local',
          projectName: 'test-project',
        },
      ]);
      mockFetchFromRegistry.mockRejectedValue(new Error('connection refused'));

      const req = {} as OauthFastifyRequest;
      const reply = mockReply();

      await routeHandlers['/workbench-integration'](req, reply);

      expect(reply.send).toHaveBeenCalledWith({
        namespaces: [],
      });
    });

    it('should filter out namespaces with no accessible configs', async () => {
      mockFetchConfigMap.mockResolvedValue({
        data: { namespaces: '{"namespaces":{"ns1":["config1"],"ns2":["config2"]}}' },
      } as any);
      mockParseNamespacesData.mockReturnValue({
        namespaces: { ns1: ['config1'], ns2: ['config2'] },
      });
      mockGetClientConfigs.mockResolvedValue([
        {
          configName: 'config1',
          namespace: 'ns1',
          registryUrl: 'https://feast-ns1-registry.ns1.svc.cluster.local',
          projectName: 'project1',
        },
        {
          configName: 'config2',
          namespace: 'ns2',
          registryUrl: 'https://feast-ns2-registry.ns2.svc.cluster.local',
          projectName: 'project2',
        },
      ]);
      mockFetchFromRegistry
        .mockResolvedValueOnce([{ name: 'project1', project: 'project1' }])
        .mockRejectedValueOnce(new Error('denied'));

      const req = {} as OauthFastifyRequest;
      const reply = mockReply();

      await routeHandlers['/workbench-integration'](req, reply);

      const response = (reply.send as jest.Mock).mock.calls[0][0];
      expect(response.namespaces).toHaveLength(1);
      expect(response.namespaces[0].namespace).toBe('ns1');
    });

    it('should return 500 on unexpected errors', async () => {
      mockFetchConfigMap.mockRejectedValue(new Error('k8s API error'));
      mockHandleError.mockReturnValue('workbench-integration: k8s API error');

      const req = {} as OauthFastifyRequest;
      const reply = mockReply();

      await routeHandlers['/workbench-integration'](req, reply);

      expect(mockHandleError).toHaveBeenCalledWith(
        fastify,
        expect.any(Error),
        'workbench-integration',
      );
      expect(reply.code).toHaveBeenCalledWith(500);
      expect(reply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Failed to fetch workbench feature store configs',
          message: 'workbench-integration: k8s API error',
          status_code: 500,
        }),
      );
    });

    it('should handle non-Error thrown values in access check', async () => {
      mockFetchConfigMap.mockResolvedValue({
        data: { namespaces: '{"namespaces":{"ns1":["config1"]}}' },
      } as any);
      mockParseNamespacesData.mockReturnValue({
        namespaces: { ns1: ['config1'] },
      });
      mockGetClientConfigs.mockResolvedValue([
        {
          configName: 'config1',
          namespace: 'ns1',
          registryUrl: 'https://feast-test-registry.ns1.svc.cluster.local',
          projectName: 'test-project',
        },
      ]);
      mockFetchFromRegistry.mockRejectedValue('string error');

      const req = {} as OauthFastifyRequest;
      const reply = mockReply();

      await routeHandlers['/workbench-integration'](req, reply);

      expect(reply.send).toHaveBeenCalledWith({
        namespaces: [],
      });
    });
  });
});
