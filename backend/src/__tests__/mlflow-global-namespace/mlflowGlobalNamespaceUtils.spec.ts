import {
  updateGlobalMLflowNamespaces,
  GLOBAL_MLFLOW_LABEL_KEY,
  GLOBAL_MLFLOW_CR_NAME,
} from '../../routes/api/mlflow-global-namespace/mlflowGlobalNamespaceUtils';

jest.mock('../../utils/resourceUtils', () => ({
  getDashboardConfig: jest.fn(),
}));
jest.mock('../../routes/api/config/configUtils', () => ({
  setDashboardConfig: jest.fn(),
}));
jest.mock('../../routes/api/namespaces/namespaceUtils', () => ({
  ...jest.requireActual('../../routes/api/namespaces/namespaceUtils'),
  ensureNamespaceAccessPermission: jest.fn(),
}));

import { getDashboardConfig } from '../../utils/resourceUtils';
import { setDashboardConfig } from '../../routes/api/config/configUtils';
import { ensureNamespaceAccessPermission } from '../../routes/api/namespaces/namespaceUtils';

const mockGetDashboardConfig = getDashboardConfig as jest.Mock;
const mockSetDashboardConfig = setDashboardConfig as jest.Mock;
const mockEnsurePermission = ensureNamespaceAccessPermission as jest.Mock;

const mockPatchNamespace = jest.fn();
const mockReadNamespace = jest.fn();

const mockFastify = {
  kube: {
    coreV1Api: {
      patchNamespace: mockPatchNamespace,
      readNamespace: mockReadNamespace,
    },
  },
  log: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
  },
} as any;

const mockRequest = {} as any;

const makeDashboardConfig = (globalMLflowNamespaces: string[] = []) => ({
  spec: {
    dashboardConfig: {},
    globalMLflowNamespaces,
  },
});

beforeEach(() => {
  jest.clearAllMocks();
  mockSetDashboardConfig.mockResolvedValue({});
  mockReadNamespace.mockResolvedValue({ body: {} });
  mockPatchNamespace.mockResolvedValue({ body: {} });
  mockEnsurePermission.mockResolvedValue(undefined);
});

describe('updateGlobalMLflowNamespaces', () => {
  it('sets a single namespace fresh ([] -> ["ns-a"])', async () => {
    mockGetDashboardConfig.mockReturnValue(makeDashboardConfig([]));

    const result = await updateGlobalMLflowNamespaces(mockFastify, mockRequest, ['ns-a']);

    expect(result).toEqual({ success: true, globalMLflowNamespaces: ['ns-a'] });
    expect(mockReadNamespace).toHaveBeenCalledWith('ns-a');
    expect(mockEnsurePermission).toHaveBeenCalledTimes(1);
    expect(mockPatchNamespace).toHaveBeenCalledWith(
      'ns-a',
      { metadata: { labels: { [GLOBAL_MLFLOW_LABEL_KEY]: GLOBAL_MLFLOW_CR_NAME } } },
      undefined,
      undefined,
      undefined,
      undefined,
      expect.objectContaining({ headers: expect.any(Object) }),
    );
    expect(mockSetDashboardConfig).toHaveBeenCalledWith(mockFastify, {
      spec: { globalMLflowNamespaces: ['ns-a'] },
    });
  });

  it('changes a single namespace (["ns-a"] -> ["ns-b"])', async () => {
    mockGetDashboardConfig.mockReturnValue(makeDashboardConfig(['ns-a']));

    const result = await updateGlobalMLflowNamespaces(mockFastify, mockRequest, ['ns-b']);

    expect(result).toEqual({ success: true, globalMLflowNamespaces: ['ns-b'] });
    // Remove old label
    expect(mockPatchNamespace).toHaveBeenCalledWith(
      'ns-a',
      { metadata: { labels: { [GLOBAL_MLFLOW_LABEL_KEY]: null } } },
      undefined,
      undefined,
      undefined,
      undefined,
      expect.objectContaining({ headers: expect.any(Object) }),
    );
    // Apply new label
    expect(mockPatchNamespace).toHaveBeenCalledWith(
      'ns-b',
      { metadata: { labels: { [GLOBAL_MLFLOW_LABEL_KEY]: GLOBAL_MLFLOW_CR_NAME } } },
      undefined,
      undefined,
      undefined,
      undefined,
      expect.objectContaining({ headers: expect.any(Object) }),
    );
    expect(mockSetDashboardConfig).toHaveBeenCalledWith(mockFastify, {
      spec: { globalMLflowNamespaces: ['ns-b'] },
    });
  });

  it('clears all (["ns-a"] -> [])', async () => {
    mockGetDashboardConfig.mockReturnValue(makeDashboardConfig(['ns-a']));

    const result = await updateGlobalMLflowNamespaces(mockFastify, mockRequest, []);

    expect(result).toEqual({ success: true, globalMLflowNamespaces: [] });
    expect(mockPatchNamespace).toHaveBeenCalledWith(
      'ns-a',
      { metadata: { labels: { [GLOBAL_MLFLOW_LABEL_KEY]: null } } },
      undefined,
      undefined,
      undefined,
      undefined,
      expect.objectContaining({ headers: expect.any(Object) }),
    );
    expect(mockSetDashboardConfig).toHaveBeenCalledWith(mockFastify, {
      spec: { globalMLflowNamespaces: [] },
    });
  });

  it('is a no-op when clearing with nothing set ([] -> [])', async () => {
    mockGetDashboardConfig.mockReturnValue(makeDashboardConfig([]));

    const result = await updateGlobalMLflowNamespaces(mockFastify, mockRequest, []);

    expect(result).toEqual({ success: true, globalMLflowNamespaces: [] });
    expect(mockPatchNamespace).not.toHaveBeenCalled();
    expect(mockReadNamespace).not.toHaveBeenCalled();
    expect(mockEnsurePermission).not.toHaveBeenCalled();
    expect(mockSetDashboardConfig).toHaveBeenCalledWith(mockFastify, {
      spec: { globalMLflowNamespaces: [] },
    });
  });

  it('is idempotent when same namespace re-set (["ns-a"] -> ["ns-a"])', async () => {
    mockGetDashboardConfig.mockReturnValue(makeDashboardConfig(['ns-a']));

    const result = await updateGlobalMLflowNamespaces(mockFastify, mockRequest, ['ns-a']);

    expect(result).toEqual({ success: true, globalMLflowNamespaces: ['ns-a'] });
    expect(mockPatchNamespace).not.toHaveBeenCalled();
    expect(mockReadNamespace).not.toHaveBeenCalled();
    expect(mockEnsurePermission).not.toHaveBeenCalled();
    expect(mockSetDashboardConfig).toHaveBeenCalled();
  });

  it('rejects with 404 when namespace does not exist', async () => {
    mockGetDashboardConfig.mockReturnValue(makeDashboardConfig([]));
    mockReadNamespace.mockRejectedValue({ response: { statusCode: 404 } });

    await expect(
      updateGlobalMLflowNamespaces(mockFastify, mockRequest, ['nonexistent']),
    ).rejects.toMatchObject({ code: 404 });

    expect(mockPatchNamespace).not.toHaveBeenCalled();
    expect(mockSetDashboardConfig).not.toHaveBeenCalled();
  });

  it('rejects with 400 for system namespace (openshift prefix)', async () => {
    mockGetDashboardConfig.mockReturnValue(makeDashboardConfig([]));

    await expect(
      updateGlobalMLflowNamespaces(mockFastify, mockRequest, ['openshift-monitoring']),
    ).rejects.toMatchObject({ code: 400 });

    expect(mockReadNamespace).not.toHaveBeenCalled();
    expect(mockPatchNamespace).not.toHaveBeenCalled();
    expect(mockSetDashboardConfig).not.toHaveBeenCalled();
  });

  it('rejects with 400 for system namespace (kube prefix)', async () => {
    mockGetDashboardConfig.mockReturnValue(makeDashboardConfig([]));

    await expect(
      updateGlobalMLflowNamespaces(mockFastify, mockRequest, ['kube-system']),
    ).rejects.toMatchObject({ code: 400 });

    expect(mockPatchNamespace).not.toHaveBeenCalled();
    expect(mockSetDashboardConfig).not.toHaveBeenCalled();
  });

  it('rejects with 403 when SSAR is denied', async () => {
    mockGetDashboardConfig.mockReturnValue(makeDashboardConfig([]));
    const forbiddenError = Object.assign(new Error('Forbidden'), { code: 403 });
    mockEnsurePermission.mockRejectedValue(forbiddenError);

    await expect(
      updateGlobalMLflowNamespaces(mockFastify, mockRequest, ['ns-a']),
    ).rejects.toMatchObject({ code: 403 });

    expect(mockPatchNamespace).not.toHaveBeenCalled();
    expect(mockSetDashboardConfig).not.toHaveBeenCalled();
  });

  it('handles stale namespace (previous namespace deleted) -- skips SSAR and label removal', async () => {
    mockGetDashboardConfig.mockReturnValue(makeDashboardConfig(['deleted-ns']));
    const notFoundError = { message: 'Not Found', code: 404 };
    mockEnsurePermission.mockResolvedValueOnce(undefined).mockRejectedValueOnce(notFoundError);

    const result = await updateGlobalMLflowNamespaces(mockFastify, mockRequest, ['ns-new']);

    expect(result).toEqual({ success: true, globalMLflowNamespaces: ['ns-new'] });
    expect(mockFastify.log.warn).toHaveBeenCalledWith(expect.stringContaining('deleted-ns'));
    expect(mockSetDashboardConfig).toHaveBeenCalled();
  });

  it('checks SSAR permission for namespace removal', async () => {
    mockGetDashboardConfig.mockReturnValue(makeDashboardConfig(['ns-old']));

    await updateGlobalMLflowNamespaces(mockFastify, mockRequest, []);

    expect(mockEnsurePermission).toHaveBeenCalledTimes(1);
    expect(mockEnsurePermission).toHaveBeenCalledWith(
      mockFastify,
      mockRequest,
      'ns-old',
      expect.any(Function),
      expect.stringContaining('ns-old'),
    );
  });

  it('rejects with 403 when SSAR denied on removal', async () => {
    mockGetDashboardConfig.mockReturnValue(makeDashboardConfig(['ns-old']));
    const forbiddenError = Object.assign(new Error('Forbidden'), { code: 403 });
    mockEnsurePermission.mockRejectedValue(forbiddenError);

    await expect(updateGlobalMLflowNamespaces(mockFastify, mockRequest, [])).rejects.toMatchObject({
      code: 403,
    });

    expect(mockPatchNamespace).not.toHaveBeenCalled();
    expect(mockSetDashboardConfig).not.toHaveBeenCalled();
  });

  it('throws when config CR patch fails after labels applied', async () => {
    mockGetDashboardConfig.mockReturnValue(makeDashboardConfig([]));
    mockSetDashboardConfig.mockRejectedValue(new Error('CR patch failed'));

    await expect(updateGlobalMLflowNamespaces(mockFastify, mockRequest, ['ns-a'])).rejects.toThrow(
      'CR patch failed',
    );

    expect(mockPatchNamespace).toHaveBeenCalledWith(
      'ns-a',
      { metadata: { labels: { [GLOBAL_MLFLOW_LABEL_KEY]: GLOBAL_MLFLOW_CR_NAME } } },
      undefined,
      undefined,
      undefined,
      undefined,
      expect.objectContaining({ headers: expect.any(Object) }),
    );
  });

  it('returns warnings when label removal fails (non-404)', async () => {
    mockGetDashboardConfig.mockReturnValue(makeDashboardConfig(['ns-old']));
    mockPatchNamespace
      .mockRejectedValueOnce({ response: { statusCode: 500 }, message: 'internal error' })
      .mockResolvedValueOnce({ body: {} });

    const result = await updateGlobalMLflowNamespaces(mockFastify, mockRequest, ['ns-new']);

    expect(result.success).toBe(true);
    expect(result.globalMLflowNamespaces).toEqual(['ns-new']);
    expect(result.warnings).toBeDefined();
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toContain('ns-old');
    expect(mockFastify.log.warn).toHaveBeenCalledWith(
      expect.objectContaining({ namespace: 'ns-old' }),
      expect.stringContaining('ns-old'),
    );
    expect(mockSetDashboardConfig).toHaveBeenCalled();
  });

  it('rejects multiple namespaces (maxItems enforcement)', async () => {
    mockGetDashboardConfig.mockReturnValue(makeDashboardConfig([]));

    await expect(
      updateGlobalMLflowNamespaces(mockFastify, mockRequest, ['ns-a', 'ns-b']),
    ).rejects.toMatchObject({ code: 400 });

    expect(mockReadNamespace).not.toHaveBeenCalled();
    expect(mockPatchNamespace).not.toHaveBeenCalled();
    expect(mockSetDashboardConfig).not.toHaveBeenCalled();
  });

  it('deduplicates input array', async () => {
    mockGetDashboardConfig.mockReturnValue(makeDashboardConfig([]));

    const result = await updateGlobalMLflowNamespaces(mockFastify, mockRequest, ['ns-a', 'ns-a']);

    expect(result).toEqual({ success: true, globalMLflowNamespaces: ['ns-a'] });
    expect(mockReadNamespace).toHaveBeenCalledTimes(1);
    expect(mockEnsurePermission).toHaveBeenCalledTimes(1);
    expect(mockPatchNamespace).toHaveBeenCalledTimes(1);
  });
});
