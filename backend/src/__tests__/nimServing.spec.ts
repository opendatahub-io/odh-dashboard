import { fastify } from 'fastify';
import nimServingRoute from '../routes/api/nim-serving/index';
import namespaceRoute from '../routes/api/namespaces/index';
import { NamespaceApplicationCase } from '../routes/api/namespaces/const';
import { createSelfSubjectAccessReview } from '../utils/authUtils';
import { getDashboardConfig } from '../utils/resourceUtils';
import { getNIMAccount } from '../routes/api/integrations/nim/nimUtils';
import { DashboardConfig } from '../types';

jest.mock('../utils/fileUtils', () => ({ logRequestDetails: jest.fn() }));
jest.mock('../utils/authUtils', () => ({ createSelfSubjectAccessReview: jest.fn() }));
jest.mock('../utils/resourceUtils', () => ({ getDashboardConfig: jest.fn() }));
jest.mock('../routes/api/integrations/nim/nimUtils', () => ({ getNIMAccount: jest.fn() }));

const mockReview = jest.mocked(createSelfSubjectAccessReview);
const mockConfig = jest.mocked(getDashboardConfig);
const mockAccount = jest.mocked(getNIMAccount);

const config = (disabled = false, nimWizard = false): DashboardConfig =>
  ({
    spec: { dashboardConfig: { disableNIMModelServing: disabled, nimWizard } },
  } as DashboardConfig);

const buildApp = async () => {
  const app = fastify();
  const coreV1Api = {
    readNamespace: jest.fn().mockResolvedValue({
      body: { metadata: { annotations: { 'opendatahub.io/nim-support': 'true' } } },
    }),
    readNamespacedSecret: jest.fn().mockResolvedValue({ body: { data: { api_key: 'test-only' } } }),
    readNamespacedConfigMap: jest.fn().mockResolvedValue({ body: { data: {} } }),
    patchNamespace: jest.fn().mockResolvedValue({}),
  };
  app.decorate('kube', { coreV1Api, namespace: 'dashboard' });
  await app.register(nimServingRoute, { prefix: '/api/nim-serving' });
  await app.register(namespaceRoute, { prefix: '/api/namespaces' });
  await app.ready();
  return { app, coreV1Api };
};

beforeEach(() => {
  jest.resetAllMocks();
  mockConfig.mockReturnValue(config());
  mockReview.mockResolvedValue({ spec: {}, status: { allowed: true } });
  mockAccount.mockResolvedValue({
    apiVersion: 'nim.opendatahub.io/v1',
    kind: 'Account',
    metadata: { name: 'global', namespace: 'dashboard' },
    spec: { apiKeySecret: { name: 'global-key' } },
    status: { nimPullSecret: { name: 'global-pull' }, nimConfig: { name: 'catalog' } },
  });
});

describe('legacy NIM credential authorization', () => {
  it.each(['apiKeySecret', 'nimPullSecret'])(
    'should authorize %s using caller create-secret permission',
    async (resource) => {
      const { app, coreV1Api } = await buildApp();
      try {
        const response = await app.inject(`/api/nim-serving/${resource}?namespace=my-project`);
        expect(response.statusCode).toBe(200);
        expect(response.json()).toEqual({ body: { data: { api_key: 'test-only' } } });
        expect(mockReview).toHaveBeenCalledWith(expect.anything(), expect.anything(), {
          group: '',
          resource: 'secrets',
          verb: 'create',
          namespace: 'my-project',
        });
        expect(coreV1Api.readNamespace).toHaveBeenCalledWith('my-project');
        expect(coreV1Api.readNamespacedSecret).toHaveBeenCalledWith(
          resource === 'apiKeySecret' ? 'global-key' : 'global-pull',
          'dashboard',
        );
        expect(mockConfig).toHaveBeenCalledWith();
      } finally {
        await app.close();
      }
    },
  );

  it.each([
    '',
    '?namespace=',
    '?namespace=Bad',
    '?namespace=-bad',
    '?namespace=a.b',
    `?namespace=${'a'.repeat(64)}`,
    '?namespace=one&namespace=two',
  ])('should reject invalid namespace query %s', async (query) => {
    const { app, coreV1Api } = await buildApp();
    try {
      const response = await app.inject(`/api/nim-serving/apiKeySecret${query}`);
      expect(response.statusCode).toBe(400);
      expect(mockReview).not.toHaveBeenCalled();
      expect(mockAccount).not.toHaveBeenCalled();
      expect(coreV1Api.readNamespacedSecret).not.toHaveBeenCalled();
    } finally {
      await app.close();
    }
  });

  it.each([
    { spec: {}, status: { allowed: false } },
    { spec: {} },
    {
      kind: 'Status',
      apiVersion: 'v1',
      status: 'Failure',
      code: 403,
      reason: 'Forbidden',
      message: 'Denied',
    },
  ])('should fail closed for review %j', async (review) => {
    mockReview.mockResolvedValue(review);
    const { app, coreV1Api } = await buildApp();
    try {
      const response = await app.inject('/api/nim-serving/apiKeySecret?namespace=my-project');
      expect(response.statusCode).toBe(403);
      expect(coreV1Api.readNamespace).not.toHaveBeenCalled();
      expect(coreV1Api.readNamespacedSecret).not.toHaveBeenCalled();
    } finally {
      await app.close();
    }
  });

  it('should not read Secrets when the caller-token review fails', async () => {
    mockReview.mockRejectedValue(new Error('Authentication failed'));
    const { app, coreV1Api } = await buildApp();
    try {
      const response = await app.inject('/api/nim-serving/nimPullSecret?namespace=my-project');
      expect(response.statusCode).toBeGreaterThanOrEqual(400);
      expect(coreV1Api.readNamespacedSecret).not.toHaveBeenCalled();
    } finally {
      await app.close();
    }
  });

  it.each([undefined, 'false', true])(
    'should deny a namespace with annotation %s',
    async (annotation) => {
      const { app, coreV1Api } = await buildApp();
      coreV1Api.readNamespace.mockResolvedValue({
        body: { metadata: { annotations: { 'opendatahub.io/nim-support': annotation } } },
      });
      try {
        const response = await app.inject('/api/nim-serving/apiKeySecret?namespace=my-project');
        expect(response.statusCode).toBe(403);
        expect(coreV1Api.readNamespacedSecret).not.toHaveBeenCalled();
      } finally {
        await app.close();
      }
    },
  );

  it('should not read a Secret when the namespace no longer exists', async () => {
    const { app, coreV1Api } = await buildApp();
    coreV1Api.readNamespace.mockRejectedValue(new Error('Namespace not found'));
    try {
      const response = await app.inject('/api/nim-serving/apiKeySecret?namespace=my-project');
      expect(response.statusCode).toBeGreaterThanOrEqual(400);
      expect(coreV1Api.readNamespacedSecret).not.toHaveBeenCalled();
    } finally {
      await app.close();
    }
  });

  it.each([false, true])(
    'should block disabled legacy NIM regardless of nimWizard=%s or client overrides',
    async (nimWizard) => {
      mockConfig.mockReturnValue(config(true, nimWizard));
      const { app, coreV1Api } = await buildApp();
      try {
        const response = await app.inject({
          url: '/api/nim-serving/apiKeySecret?namespace=my-project',
          headers: { 'x-odh-feature-flags': '{"disableNIMModelServing":false}' },
        });
        expect(response.statusCode).toBe(403);
        expect(mockConfig).toHaveBeenCalledWith();
        expect(mockReview).not.toHaveBeenCalled();
        expect(coreV1Api.readNamespacedSecret).not.toHaveBeenCalled();
      } finally {
        await app.close();
      }
    },
  );

  it.each(['unknown', 'constructor', '__proto__'])(
    'should reject selector %s',
    async (selector) => {
      const { app, coreV1Api } = await buildApp();
      try {
        expect((await app.inject(`/api/nim-serving/${selector}`)).statusCode).toBe(404);
        expect(mockAccount).not.toHaveBeenCalled();
        expect(coreV1Api.readNamespacedSecret).not.toHaveBeenCalled();
      } finally {
        await app.close();
      }
    },
  );

  it('should retain unscoped non-secret catalog access', async () => {
    mockConfig.mockReturnValue(config(true));
    const { app, coreV1Api } = await buildApp();
    try {
      expect((await app.inject('/api/nim-serving/nimConfig')).statusCode).toBe(200);
      expect(coreV1Api.readNamespacedConfigMap).toHaveBeenCalledWith('catalog', 'dashboard');
      expect(mockReview).not.toHaveBeenCalled();
      expect(coreV1Api.readNamespacedSecret).not.toHaveBeenCalled();
    } finally {
      await app.close();
    }
  });

  it('should return 404 for an absent global Account after authorization', async () => {
    mockAccount.mockResolvedValue(undefined);
    const { app, coreV1Api } = await buildApp();
    try {
      expect(
        (await app.inject('/api/nim-serving/apiKeySecret?namespace=my-project')).statusCode,
      ).toBe(404);
      expect(mockReview).toHaveBeenCalled();
      expect(coreV1Api.readNamespacedSecret).not.toHaveBeenCalled();
    } finally {
      await app.close();
    }
  });
});

describe('legacy NIM namespace promotion', () => {
  it.each(['', '?dryRun=All'])(
    'should reject disabled promotion %s despite a client override',
    async (query) => {
      mockConfig.mockReturnValue(config(true));
      const { app, coreV1Api } = await buildApp();
      try {
        const response = await app.inject({
          url: `/api/namespaces/my-project/${NamespaceApplicationCase.KSERVE_NIM_PROMOTION}${query}`,
          headers: { 'x-odh-feature-flags': '{"disableNIMModelServing":false}' },
        });
        expect(response.statusCode).toBe(403);
        expect(mockConfig).toHaveBeenCalledWith();
        expect(coreV1Api.patchNamespace).not.toHaveBeenCalled();
      } finally {
        await app.close();
      }
    },
  );

  it('should preserve non-admin promotion when enabled', async () => {
    const { app, coreV1Api } = await buildApp();
    try {
      const response = await app.inject(
        `/api/namespaces/my-project/${NamespaceApplicationCase.KSERVE_NIM_PROMOTION}`,
      );
      expect(response.statusCode).toBe(200);
      expect(mockReview).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.objectContaining({
          resource: 'servingruntimes',
          verb: 'create',
          namespace: 'my-project',
        }),
      );
      expect(coreV1Api.patchNamespace).toHaveBeenCalledWith(
        'my-project',
        { metadata: { annotations: { 'opendatahub.io/nim-support': 'true' }, labels: {} } },
        undefined,
        undefined,
        undefined,
        undefined,
        expect.anything(),
      );
    } finally {
      await app.close();
    }
  });

  it.each([
    NamespaceApplicationCase.KSERVE_PROMOTION,
    NamespaceApplicationCase.RESET_MODEL_SERVING_PLATFORM,
  ])('should leave non-NIM promotion/reset %s available when NIM is disabled', async (context) => {
    mockConfig.mockReturnValue(config(true));
    const { app, coreV1Api } = await buildApp();
    try {
      expect((await app.inject(`/api/namespaces/my-project/${context}`)).statusCode).toBe(200);
      expect(coreV1Api.patchNamespace).toHaveBeenCalled();
    } finally {
      await app.close();
    }
  });
});
