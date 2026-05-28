import { FastifyReply } from 'fastify';
import { KubeFastifyInstance, OauthFastifyRequest } from '../types';
import * as notebookUtils from '../utils/notebookUtils';
import * as directCallUtils from '../utils/directCallUtils';
import * as featureStoreUtils from '../routes/api/featurestores/featureStoreUtils';
import registerRoutes from '../routes/api/featurestores/featureStores';

jest.mock('../utils/notebookUtils');
jest.mock('../utils/directCallUtils');
jest.mock('../routes/api/featurestores/featureStoreUtils');

const mockGetNamespaces = jest.mocked(notebookUtils.getNamespaces);
const mockGetAccessToken = jest.mocked(directCallUtils.getAccessToken);
const mockGetDirectCallOptions = jest.mocked(directCallUtils.getDirectCallOptions);
const mockFetchConfigMap = jest.mocked(featureStoreUtils.fetchConfigMap);
const mockParseNamespacesData = jest.mocked(featureStoreUtils.parseNamespacesData);
const mockGetClientConfigsBatched = jest.mocked(featureStoreUtils.getClientConfigsBatched);
const mockFilterEnabledCRDs = jest.mocked(featureStoreUtils.filterEnabledCRDs);
const mockFetchFromRegistry = jest.mocked(featureStoreUtils.fetchFromRegistry);
const mockExtractServiceInfo = jest.mocked(featureStoreUtils.extractServiceInfo);
const mockCreateFeatureStoreResponse = jest.mocked(featureStoreUtils.createFeatureStoreResponse);
const mockHandleError = jest.mocked(featureStoreUtils.handleError);
const mockFindRegistryUrlForFeatureStore = jest.mocked(
  featureStoreUtils.findRegistryUrlForFeatureStore,
);
const mockConstructRegistryProxyUrl = jest.mocked(featureStoreUtils.constructRegistryProxyUrl);
const mockMakeAuthenticatedHttpRequest = jest.mocked(
  featureStoreUtils.makeAuthenticatedHttpRequest,
);

describe('featureStores routes', () => {
  let fastify: KubeFastifyInstance;
  let routeHandlers: Record<string, (req: any, reply: any) => Promise<any>>;

  const mockReply = (): FastifyReply =>
    ({
      send: jest.fn().mockReturnThis(),
      code: jest.fn().mockReturnThis(),
      type: jest.fn().mockReturnThis(),
    } as unknown as FastifyReply);

  beforeEach(async () => {
    jest.clearAllMocks();
    routeHandlers = {};

    fastify = {
      get: jest.fn((path: string, ...args: unknown[]) => {
        const handler = args[args.length - 1] as (req: any, reply: any) => Promise<any>;
        routeHandlers[path] = handler;
      }),
      log: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
      },
      kube: {
        customObjectsApi: {
          listNamespacedCustomObject: jest.fn(),
        },
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

  describe('GET / (list feature stores)', () => {
    it('should return empty response when ConfigMap not found', async () => {
      mockFetchConfigMap.mockResolvedValue(null);

      const req = { query: {} } as unknown as OauthFastifyRequest;
      const reply = mockReply();

      await routeHandlers['/'](req, reply);

      expect(reply.send).toHaveBeenCalledWith({
        featureStores: [],
        enabledCRDCount: 0,
      });
    });

    it('should return empty response when ConfigMap has no namespaces data', async () => {
      mockFetchConfigMap.mockResolvedValue({
        metadata: { name: 'feast-configs-registry' },
        data: {},
      } as any);

      const req = { query: {} } as unknown as OauthFastifyRequest;
      const reply = mockReply();

      await routeHandlers['/'](req, reply);

      expect(reply.send).toHaveBeenCalledWith({
        featureStores: [],
        enabledCRDCount: 0,
      });
    });

    it('should fetch and return feature stores from registry', async () => {
      mockFetchConfigMap.mockResolvedValue({
        metadata: { name: 'feast-configs-registry' },
        data: { namespaces: '{"namespaces":{"ns1":["config1"]}}' },
      } as any);
      mockParseNamespacesData.mockReturnValue({
        namespaces: { ns1: ['config1'] },
      });

      const mockCRDs: featureStoreUtils.FeatureStoreCRD[] = [
        {
          apiVersion: 'feast.dev/v1',
          kind: 'FeatureStore',
          metadata: {
            name: 'test-fs',
            namespace: 'ns1',
            labels: { 'feature-store-ui': 'enabled' },
          },
          spec: { feastProject: 'test-project' },
        },
      ];
      (fastify.kube.customObjectsApi.listNamespacedCustomObject as jest.Mock).mockResolvedValue({
        body: { items: mockCRDs },
      });
      mockFilterEnabledCRDs.mockReturnValue(mockCRDs);
      mockGetClientConfigsBatched.mockResolvedValue([
        {
          configName: 'config1',
          namespace: 'ns1',
          registryUrl: 'https://feast-test-registry.ns1.svc.cluster.local',
          projectName: 'test-project',
        },
      ]);
      mockFetchFromRegistry.mockResolvedValue([{ name: 'test-fs', project: 'test-project' }]);
      mockExtractServiceInfo.mockReturnValue({
        serviceName: 'feast-test-registry-rest',
        serviceNamespace: 'ns1',
        originalUrl: 'https://feast-test-registry.ns1.svc.cluster.local',
        protocol: 'https',
        port: '443',
      });
      const mockStoreResponse = {
        name: 'test-fs',
        project: 'test-project',
        registry: { path: 'https://feast-test-registry.ns1.svc.cluster.local' },
        namespace: 'ns1',
        status: {
          conditions: [
            { type: 'Registry', status: 'True', lastTransitionTime: '2026-01-01T00:00:00.000Z' },
          ],
        },
      };
      mockCreateFeatureStoreResponse.mockReturnValue(mockStoreResponse);

      const req = { query: {} } as unknown as OauthFastifyRequest;
      const reply = mockReply();

      await routeHandlers['/'](req, reply);

      expect(reply.send).toHaveBeenCalledWith({
        featureStores: [mockStoreResponse],
        enabledCRDCount: 1,
      });
    });

    it('should throw on unexpected errors', async () => {
      mockFetchConfigMap.mockRejectedValue(new Error('k8s error'));
      mockHandleError.mockReturnValue('Failed: k8s error');

      const req = { query: {} } as unknown as OauthFastifyRequest;
      const reply = mockReply();

      await expect(routeHandlers['/'](req, reply)).rejects.toMatchObject({
        statusCode: 500,
      });
    });
  });

  describe('GET /:namespace/:projectName/* (proxy)', () => {
    it('should proxy request to feature store registry', async () => {
      mockFetchConfigMap.mockResolvedValue({
        data: { namespaces: '{"namespaces":{"ns1":["config1"]}}' },
      } as any);
      mockParseNamespacesData.mockReturnValue({ namespaces: { ns1: ['config1'] } });
      mockGetClientConfigsBatched.mockResolvedValue([
        {
          configName: 'config1',
          namespace: 'ns1',
          registryUrl: 'https://feast-test-registry.ns1.svc.cluster.local',
          projectName: 'test-project',
        },
      ]);
      mockFindRegistryUrlForFeatureStore.mockReturnValue(
        'https://feast-test-registry.ns1.svc.cluster.local',
      );
      mockExtractServiceInfo.mockReturnValue({
        serviceName: 'feast-test-registry-rest',
        serviceNamespace: 'ns1',
        originalUrl: 'https://feast-test-registry.ns1.svc.cluster.local',
        protocol: 'https',
        port: '443',
      });
      mockConstructRegistryProxyUrl.mockReturnValue('https://feast-test:443/api/v1/features');
      mockMakeAuthenticatedHttpRequest.mockResolvedValue({
        data: { features: [] },
        statusCode: 200,
      });

      const req = {
        params: { namespace: 'ns1', projectName: 'test-project', '*': 'api/v1/features' },
        url: '/api/featurestores/ns1/test-project/api/v1/features',
      } as unknown as OauthFastifyRequest;
      const reply = mockReply();

      await routeHandlers['/:namespace/:projectName/*'](req, reply);

      expect(reply.code).toHaveBeenCalledWith(200);
      expect(reply.send).toHaveBeenCalledWith({ features: [] });
    });

    it('should use default path when wildcard is empty', async () => {
      mockFetchConfigMap.mockResolvedValue({
        data: { namespaces: '{"namespaces":{"ns1":["config1"]}}' },
      } as any);
      mockParseNamespacesData.mockReturnValue({ namespaces: { ns1: ['config1'] } });
      mockGetClientConfigsBatched.mockResolvedValue([
        {
          configName: 'config1',
          namespace: 'ns1',
          registryUrl: 'https://feast-test-registry.ns1.svc.cluster.local',
          projectName: 'test-project',
        },
      ]);
      mockFindRegistryUrlForFeatureStore.mockReturnValue(
        'https://feast-test-registry.ns1.svc.cluster.local',
      );
      mockExtractServiceInfo.mockReturnValue({
        serviceName: 'feast-test-registry-rest',
        serviceNamespace: 'ns1',
        originalUrl: 'https://feast-test-registry.ns1.svc.cluster.local',
        protocol: 'https',
        port: '443',
      });
      mockConstructRegistryProxyUrl.mockReturnValue('https://feast-test:443/api/v1/projects');
      mockMakeAuthenticatedHttpRequest.mockResolvedValue({
        data: { projects: [] },
        statusCode: 200,
      });

      const req = {
        params: { namespace: 'ns1', projectName: 'test-project', '*': '' },
        url: '/api/featurestores/ns1/test-project/',
      } as unknown as OauthFastifyRequest;
      const reply = mockReply();

      await routeHandlers['/:namespace/:projectName/*'](req, reply);

      expect(mockConstructRegistryProxyUrl).toHaveBeenCalledWith(
        'feast-test-registry-rest',
        'ns1',
        'api/v1/projects',
        true,
        'https',
        '443',
      );
    });

    it('should throw 400 for invalid proxy path with path traversal', async () => {
      const req = {
        params: { namespace: 'ns1', projectName: 'test-project', '*': '../../../etc/passwd' },
        url: '/api/featurestores/ns1/test-project/../../../etc/passwd',
      } as unknown as OauthFastifyRequest;
      const reply = mockReply();

      await expect(routeHandlers['/:namespace/:projectName/*'](req, reply)).rejects.toMatchObject({
        statusCode: 400,
      });
    });

    it('should throw 400 for double-encoded path traversal', async () => {
      const req = {
        params: { namespace: 'ns1', projectName: 'test-project', '*': '%252e%252e/etc/passwd' },
        url: '/api/featurestores/ns1/test-project/%252e%252e/etc/passwd',
      } as unknown as OauthFastifyRequest;
      const reply = mockReply();

      await expect(routeHandlers['/:namespace/:projectName/*'](req, reply)).rejects.toMatchObject({
        statusCode: 400,
      });
    });

    it('should throw 400 for malformed percent encoding in proxy path', async () => {
      const req = {
        params: { namespace: 'ns1', projectName: 'test-project', '*': 'api/v1/%ZZ' },
        url: '/api/featurestores/ns1/test-project/api/v1/%ZZ',
      } as unknown as OauthFastifyRequest;
      const reply = mockReply();

      await expect(routeHandlers['/:namespace/:projectName/*'](req, reply)).rejects.toMatchObject({
        statusCode: 400,
      });
    });

    it('should throw 400 for proxy path not matching api/v prefix', async () => {
      const req = {
        params: { namespace: 'ns1', projectName: 'test-project', '*': 'admin/internal' },
        url: '/api/featurestores/ns1/test-project/admin/internal',
      } as unknown as OauthFastifyRequest;
      const reply = mockReply();

      await expect(routeHandlers['/:namespace/:projectName/*'](req, reply)).rejects.toMatchObject({
        statusCode: 400,
      });
    });

    it('should throw 404 when ConfigMap not found', async () => {
      mockFetchConfigMap.mockResolvedValue(null);

      const req = {
        params: { namespace: 'ns1', projectName: 'test-project', '*': 'api/v1/features' },
        url: '/api/featurestores/ns1/test-project/api/v1/features',
      } as unknown as OauthFastifyRequest;
      const reply = mockReply();

      await expect(routeHandlers['/:namespace/:projectName/*'](req, reply)).rejects.toMatchObject({
        statusCode: 404,
      });
    });

    it('should throw 404 when registry URL not found', async () => {
      mockFetchConfigMap.mockResolvedValue({
        data: { namespaces: '{"namespaces":{"ns1":["config1"]}}' },
      } as any);
      mockParseNamespacesData.mockReturnValue({ namespaces: { ns1: ['config1'] } });
      mockGetClientConfigsBatched.mockResolvedValue([]);
      mockFindRegistryUrlForFeatureStore.mockReturnValue(null);

      const req = {
        params: { namespace: 'ns1', projectName: 'nonexistent', '*': 'api/v1/features' },
        url: '/api/featurestores/ns1/nonexistent/api/v1/features',
      } as unknown as OauthFastifyRequest;
      const reply = mockReply();

      await expect(routeHandlers['/:namespace/:projectName/*'](req, reply)).rejects.toMatchObject({
        statusCode: 404,
      });
    });

    it('should throw 401 when no access token', async () => {
      mockFetchConfigMap.mockResolvedValue({
        data: { namespaces: '{"namespaces":{"ns1":["config1"]}}' },
      } as any);
      mockParseNamespacesData.mockReturnValue({ namespaces: { ns1: ['config1'] } });
      mockGetClientConfigsBatched.mockResolvedValue([
        {
          configName: 'config1',
          namespace: 'ns1',
          registryUrl: 'https://feast-test-registry.ns1.svc.cluster.local',
          projectName: 'test-project',
        },
      ]);
      mockFindRegistryUrlForFeatureStore.mockReturnValue(
        'https://feast-test-registry.ns1.svc.cluster.local',
      );
      mockExtractServiceInfo.mockReturnValue({
        serviceName: 'feast-test-registry-rest',
        serviceNamespace: 'ns1',
        originalUrl: 'https://feast-test-registry.ns1.svc.cluster.local',
        protocol: 'https',
        port: '443',
      });
      mockGetAccessToken.mockReturnValue('');

      const req = {
        params: { namespace: 'ns1', projectName: 'test-project', '*': 'api/v1/features' },
        url: '/api/featurestores/ns1/test-project/api/v1/features',
      } as unknown as OauthFastifyRequest;
      const reply = mockReply();

      await expect(routeHandlers['/:namespace/:projectName/*'](req, reply)).rejects.toMatchObject({
        statusCode: 401,
      });
    });

    it('should throw 500 when registry request fails', async () => {
      mockFetchConfigMap.mockResolvedValue({
        data: { namespaces: '{"namespaces":{"ns1":["config1"]}}' },
      } as any);
      mockParseNamespacesData.mockReturnValue({ namespaces: { ns1: ['config1'] } });
      mockGetClientConfigsBatched.mockResolvedValue([
        {
          configName: 'config1',
          namespace: 'ns1',
          registryUrl: 'https://feast-test-registry.ns1.svc.cluster.local',
          projectName: 'test-project',
        },
      ]);
      mockFindRegistryUrlForFeatureStore.mockReturnValue(
        'https://feast-test-registry.ns1.svc.cluster.local',
      );
      mockExtractServiceInfo.mockReturnValue({
        serviceName: 'feast-test-registry-rest',
        serviceNamespace: 'ns1',
        originalUrl: 'https://feast-test-registry.ns1.svc.cluster.local',
        protocol: 'https',
        port: '443',
      });
      mockConstructRegistryProxyUrl.mockReturnValue('https://feast-test:443/api/v1/features');
      mockMakeAuthenticatedHttpRequest.mockRejectedValue(new Error('connection refused'));
      mockHandleError.mockReturnValue('Direct request error: connection refused');

      const req = {
        params: { namespace: 'ns1', projectName: 'test-project', '*': 'api/v1/features' },
        url: '/api/featurestores/ns1/test-project/api/v1/features',
      } as unknown as OauthFastifyRequest;
      const reply = mockReply();

      await expect(routeHandlers['/:namespace/:projectName/*'](req, reply)).rejects.toMatchObject({
        statusCode: 500,
      });
    });
  });
});
