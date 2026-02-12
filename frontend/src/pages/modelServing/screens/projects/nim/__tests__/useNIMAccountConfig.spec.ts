import { testHook } from '@odh-dashboard/jest-config/hooks';
import { getConfigMap } from '#~/api';
import { mockConfigMap } from '#~/__mocks__/mockConfigMap';
import { useNIMAccountConfig } from '#~/pages/modelServing/screens/projects/nim/useNIMAccountConfig';
import { useDashboardNamespace } from '#~/redux/selectors';

jest.mock('#~/api', () => ({
  getConfigMap: jest.fn(),
}));

jest.mock('#~/redux/selectors', () => ({
  useDashboardNamespace: jest.fn(),
}));

const getConfigMapMock = jest.mocked(getConfigMap);
const useDashboardNamespaceMock = jest.mocked(useDashboardNamespace);

describe('useNIMAccountConfig', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return loading state initially', () => {
    useDashboardNamespaceMock.mockReturnValue({
      dashboardNamespace: 'redhat-ods-applications',
    });
    getConfigMapMock.mockImplementation(
      () =>
        new Promise(() => {
          // Never resolves
        }),
    );

    const renderResult = testHook(useNIMAccountConfig)();

    expect(renderResult).hookToStrictEqual({
      loading: true,
    });
  });

  it('should return empty config when dashboardNamespace is not available', async () => {
    useDashboardNamespaceMock.mockReturnValue({
      dashboardNamespace: '',
    });

    const renderResult = testHook(useNIMAccountConfig)();

    // Wait for the effect to complete
    await new Promise((resolve) => {
      setTimeout(resolve, 100);
    });

    expect(renderResult).hookToStrictEqual({
      loading: false,
    });
    expect(getConfigMapMock).not.toHaveBeenCalled();
  });

  it('should fetch and return air-gapped configuration from ConfigMap', async () => {
    useDashboardNamespaceMock.mockReturnValue({
      dashboardNamespace: 'redhat-ods-applications',
    });

    const airGappedConfigMap = mockConfigMap({
      name: 'odh-nim-account-cm',
      namespace: 'redhat-ods-applications',
      data: {
        registry: 'internal-registry.company.com',
        imagePullSecret: 'custom-pull-secret',
      },
    });

    getConfigMapMock.mockResolvedValue(airGappedConfigMap);

    const renderResult = testHook(useNIMAccountConfig)();
    await renderResult.waitForNextUpdate();

    expect(getConfigMapMock).toHaveBeenCalledWith('redhat-ods-applications', 'odh-nim-account-cm');
    expect(getConfigMapMock).toHaveBeenCalledTimes(1);
    expect(renderResult).hookToStrictEqual({
      registry: 'internal-registry.company.com',
      imagePullSecret: 'custom-pull-secret',
      loading: false,
    });
  });

  it('should handle ConfigMap with only registry field', async () => {
    useDashboardNamespaceMock.mockReturnValue({
      dashboardNamespace: 'redhat-ods-applications',
    });

    const configMapWithRegistry = mockConfigMap({
      name: 'odh-nim-account-cm',
      namespace: 'redhat-ods-applications',
      data: {
        registry: 'my-registry.io',
      },
    });

    getConfigMapMock.mockResolvedValue(configMapWithRegistry);

    const renderResult = testHook(useNIMAccountConfig)();
    await renderResult.waitForNextUpdate();

    expect(renderResult).hookToStrictEqual({
      registry: 'my-registry.io',
      imagePullSecret: undefined,
      loading: false,
    });
  });

  it('should handle ConfigMap with only imagePullSecret field', async () => {
    useDashboardNamespaceMock.mockReturnValue({
      dashboardNamespace: 'redhat-ods-applications',
    });

    const configMapWithSecret = mockConfigMap({
      name: 'odh-nim-account-cm',
      namespace: 'redhat-ods-applications',
      data: {
        imagePullSecret: 'my-pull-secret',
      },
    });

    getConfigMapMock.mockResolvedValue(configMapWithSecret);

    const renderResult = testHook(useNIMAccountConfig)();
    await renderResult.waitForNextUpdate();

    expect(renderResult).hookToStrictEqual({
      registry: undefined,
      imagePullSecret: 'my-pull-secret',
      loading: false,
    });
  });

  it('should gracefully handle ConfigMap not found (non-air-gapped mode)', async () => {
    useDashboardNamespaceMock.mockReturnValue({
      dashboardNamespace: 'redhat-ods-applications',
    });

    const notFoundError = new Error('ConfigMap not found');
    getConfigMapMock.mockRejectedValue(notFoundError);

    const renderResult = testHook(useNIMAccountConfig)();
    await renderResult.waitForNextUpdate();

    expect(renderResult).hookToStrictEqual({
      loading: false,
      error: 'ConfigMap not found',
    });
  });

  it('should handle generic fetch errors', async () => {
    useDashboardNamespaceMock.mockReturnValue({
      dashboardNamespace: 'redhat-ods-applications',
    });

    getConfigMapMock.mockRejectedValue('Network error');

    const renderResult = testHook(useNIMAccountConfig)();
    await renderResult.waitForNextUpdate();

    expect(renderResult).hookToStrictEqual({
      loading: false,
      error: 'Failed to fetch NIM account configuration',
    });
  });

  it('should handle RBAC permission errors', async () => {
    useDashboardNamespaceMock.mockReturnValue({
      dashboardNamespace: 'redhat-ods-applications',
    });

    const rbacError = new Error('Forbidden: User cannot get ConfigMap');
    getConfigMapMock.mockRejectedValue(rbacError);

    const renderResult = testHook(useNIMAccountConfig)();
    await renderResult.waitForNextUpdate();

    expect(renderResult).hookToStrictEqual({
      loading: false,
      error: 'Forbidden: User cannot get ConfigMap',
    });
  });

  it('should handle ConfigMap with empty data', async () => {
    useDashboardNamespaceMock.mockReturnValue({
      dashboardNamespace: 'redhat-ods-applications',
    });

    const emptyConfigMap = mockConfigMap({
      name: 'odh-nim-account-cm',
      namespace: 'redhat-ods-applications',
      data: {},
    });

    getConfigMapMock.mockResolvedValue(emptyConfigMap);

    const renderResult = testHook(useNIMAccountConfig)();
    await renderResult.waitForNextUpdate();

    expect(renderResult).hookToStrictEqual({
      registry: undefined,
      imagePullSecret: undefined,
      loading: false,
    });
  });

  it('should refetch when dashboardNamespace changes', async () => {
    // Start with a namespace
    useDashboardNamespaceMock.mockReturnValue({
      dashboardNamespace: 'initial-namespace',
    });

    const initialConfigMap = mockConfigMap({
      name: 'odh-nim-account-cm',
      namespace: 'initial-namespace',
      data: {
        registry: 'initial-registry.io',
      },
    });

    getConfigMapMock.mockResolvedValue(initialConfigMap);

    const renderResult = testHook(useNIMAccountConfig)();
    await renderResult.waitForNextUpdate();

    expect(getConfigMapMock).toHaveBeenCalledWith('initial-namespace', 'odh-nim-account-cm');
    expect(renderResult).hookToStrictEqual({
      registry: 'initial-registry.io',
      imagePullSecret: undefined,
      loading: false,
    });

    // Change namespace
    useDashboardNamespaceMock.mockReturnValue({
      dashboardNamespace: 'new-namespace',
    });

    const newConfigMap = mockConfigMap({
      name: 'odh-nim-account-cm',
      namespace: 'new-namespace',
      data: {
        registry: 'new-registry.io',
      },
    });

    getConfigMapMock.mockResolvedValue(newConfigMap);

    renderResult.rerender();
    await renderResult.waitForNextUpdate();

    expect(getConfigMapMock).toHaveBeenCalledWith('new-namespace', 'odh-nim-account-cm');
    expect(renderResult).hookToStrictEqual({
      registry: 'new-registry.io',
      imagePullSecret: undefined,
      loading: false,
    });
  });
});
