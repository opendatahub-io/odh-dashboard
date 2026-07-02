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

const expectLabelApply = (ns: string, callIndex?: number) => {
  const args = [
    ns,
    { metadata: { labels: { [GLOBAL_MLFLOW_LABEL_KEY]: GLOBAL_MLFLOW_CR_NAME } } },
    undefined,
    undefined,
    undefined,
    undefined,
    expect.objectContaining({ headers: expect.any(Object) }),
  ];
  if (callIndex !== undefined) {
    expect(mockPatchNamespace).toHaveBeenNthCalledWith(callIndex, ...args);
  } else {
    expect(mockPatchNamespace).toHaveBeenCalledWith(...args);
  }
};

const expectLabelRemove = (ns: string, callIndex?: number) => {
  const args = [
    ns,
    { metadata: { labels: { [GLOBAL_MLFLOW_LABEL_KEY]: null } } },
    undefined,
    undefined,
    undefined,
    undefined,
    expect.objectContaining({ headers: expect.any(Object) }),
  ];
  if (callIndex !== undefined) {
    expect(mockPatchNamespace).toHaveBeenNthCalledWith(callIndex, ...args);
  } else {
    expect(mockPatchNamespace).toHaveBeenCalledWith(...args);
  }
};

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
    expect(mockSetDashboardConfig).toHaveBeenCalledWith(mockFastify, {
      spec: { globalMLflowNamespaces: ['ns-a'] },
    });
    expectLabelApply('ns-a');
  });

  it('changes a single namespace (["ns-a"] -> ["ns-b"])', async () => {
    mockGetDashboardConfig.mockReturnValue(makeDashboardConfig(['ns-a']));

    const result = await updateGlobalMLflowNamespaces(mockFastify, mockRequest, ['ns-b']);

    expect(result).toEqual({ success: true, globalMLflowNamespaces: ['ns-b'] });
    expectLabelRemove('ns-a', 1);
    expectLabelApply('ns-b', 2);
    expect(mockSetDashboardConfig).toHaveBeenCalledWith(mockFastify, {
      spec: { globalMLflowNamespaces: ['ns-b'] },
    });
  });

  it('clears all (["ns-a"] -> [])', async () => {
    mockGetDashboardConfig.mockReturnValue(makeDashboardConfig(['ns-a']));

    const result = await updateGlobalMLflowNamespaces(mockFastify, mockRequest, []);

    expect(result).toEqual({ success: true, globalMLflowNamespaces: [] });
    expectLabelRemove('ns-a');
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

  it('re-applies label when same namespace re-set (["ns-a"] -> ["ns-a"])', async () => {
    mockGetDashboardConfig.mockReturnValue(makeDashboardConfig(['ns-a']));

    const result = await updateGlobalMLflowNamespaces(mockFastify, mockRequest, ['ns-a']);

    expect(result).toEqual({ success: true, globalMLflowNamespaces: ['ns-a'] });
    expect(mockReadNamespace).not.toHaveBeenCalled();
    expect(mockEnsurePermission).not.toHaveBeenCalled();
    expectLabelApply('ns-a');
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

  it('handles stale namespace (previous namespace deleted) -- label removal skips gracefully', async () => {
    mockGetDashboardConfig.mockReturnValue(makeDashboardConfig(['deleted-ns']));
    mockPatchNamespace
      .mockRejectedValueOnce({ response: { statusCode: 404 } })
      .mockResolvedValueOnce({ body: {} });

    const result = await updateGlobalMLflowNamespaces(mockFastify, mockRequest, ['ns-new']);

    expect(result.success).toBe(true);
    expect(result.globalMLflowNamespaces).toEqual(['ns-new']);
    expect(result.warnings).toBeUndefined();
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

  it('throws when label application fails for new namespace', async () => {
    mockGetDashboardConfig.mockReturnValue(makeDashboardConfig([]));
    mockPatchNamespace.mockRejectedValue({
      response: { statusCode: 500 },
      message: 'patch failed',
    });

    await expect(
      updateGlobalMLflowNamespaces(mockFastify, mockRequest, ['ns-a']),
    ).rejects.toMatchObject({
      message: 'Unable to apply global MLflow label to namespace "ns-a": unexpected error',
      statusCode: 500,
    });

    expect(mockFastify.log.error).toHaveBeenCalled();
    expect(mockSetDashboardConfig).toHaveBeenCalled();
  });

  it('does not apply labels when config CR patch fails', async () => {
    mockGetDashboardConfig.mockReturnValue(makeDashboardConfig([]));
    mockSetDashboardConfig.mockRejectedValue(new Error('CR patch failed'));

    await expect(updateGlobalMLflowNamespaces(mockFastify, mockRequest, ['ns-a'])).rejects.toThrow(
      'CR patch failed',
    );

    expect(mockPatchNamespace).not.toHaveBeenCalled();
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
      expect.objectContaining({ namespace: 'ns-old', error: expect.any(String) }),
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

  it('propagates non-404 error from namespace validation (e.g. 500)', async () => {
    mockGetDashboardConfig.mockReturnValue(makeDashboardConfig([]));
    mockReadNamespace.mockRejectedValue({
      response: { statusCode: 500 },
      message: 'Internal server error',
    });

    await expect(
      updateGlobalMLflowNamespaces(mockFastify, mockRequest, ['ns-a']),
    ).rejects.toMatchObject({
      statusCode: 500,
      message: expect.stringContaining('ns-a'),
    });

    expect(mockPatchNamespace).not.toHaveBeenCalled();
    expect(mockSetDashboardConfig).not.toHaveBeenCalled();
  });

  it('returns "insufficient permissions" reason when label application gets 403', async () => {
    mockGetDashboardConfig.mockReturnValue(makeDashboardConfig([]));
    mockPatchNamespace.mockRejectedValue({
      response: { statusCode: 403, body: { message: 'Forbidden' } },
    });

    await expect(
      updateGlobalMLflowNamespaces(mockFastify, mockRequest, ['ns-a']),
    ).rejects.toMatchObject({
      message: expect.stringContaining('insufficient permissions'),
      statusCode: 403,
    });

    expect(mockSetDashboardConfig).toHaveBeenCalled();
  });

  it('returns "conflict" reason when label application gets 409', async () => {
    mockGetDashboardConfig.mockReturnValue(makeDashboardConfig([]));
    mockPatchNamespace.mockRejectedValue({
      response: { statusCode: 409, body: { message: 'Conflict' } },
    });

    await expect(
      updateGlobalMLflowNamespaces(mockFastify, mockRequest, ['ns-a']),
    ).rejects.toMatchObject({
      message: expect.stringContaining('conflict'),
      statusCode: 409,
    });

    expect(mockSetDashboardConfig).toHaveBeenCalled();
  });

  it('returns 404 when namespace is deleted between validation and label application (TOCTOU)', async () => {
    mockGetDashboardConfig.mockReturnValue(makeDashboardConfig([]));
    mockPatchNamespace.mockRejectedValue({ response: { statusCode: 404 } });

    await expect(
      updateGlobalMLflowNamespaces(mockFastify, mockRequest, ['ns-a']),
    ).rejects.toMatchObject({
      code: 404,
      message: expect.stringContaining('deleted before the label could be applied'),
    });

    expect(mockSetDashboardConfig).toHaveBeenCalled();
  });

  it('silently skips label removal when namespace returns 404 (already deleted)', async () => {
    mockGetDashboardConfig.mockReturnValue(makeDashboardConfig(['ns-old']));
    mockPatchNamespace.mockRejectedValue({ response: { statusCode: 404 } });

    const result = await updateGlobalMLflowNamespaces(mockFastify, mockRequest, []);

    expect(result).toEqual({ success: true, globalMLflowNamespaces: [] });
    expect(mockFastify.log.warn).toHaveBeenCalledWith(expect.stringContaining('no longer exists'));
    expect(mockSetDashboardConfig).toHaveBeenCalled();
  });

  it('applies label on retry when CR already has the desired value', async () => {
    mockGetDashboardConfig.mockReturnValue(makeDashboardConfig(['ns-a']));

    const result = await updateGlobalMLflowNamespaces(mockFastify, mockRequest, ['ns-a']);

    expect(result).toEqual({ success: true, globalMLflowNamespaces: ['ns-a'] });
    expectLabelApply('ns-a');
    expect(mockSetDashboardConfig).toHaveBeenCalled();
  });
});
