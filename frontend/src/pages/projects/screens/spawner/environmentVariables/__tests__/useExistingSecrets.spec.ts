import { testHook, standardUseFetchState } from '@odh-dashboard/jest-config/hooks';
import { k8sListResource } from '@openshift/dynamic-plugin-sdk-utils';
import { mockCustomSecretK8sResource } from '#~/__mocks__/mockSecretK8sResource';
import { useExistingSecrets } from '#~/pages/projects/screens/spawner/environmentVariables/useExistingSecrets';

// Mock k8sListResource
jest.mock('@openshift/dynamic-plugin-sdk-utils', () => ({
  ...jest.requireActual('@openshift/dynamic-plugin-sdk-utils'),
  k8sListResource: jest.fn(),
}));

const k8sListResourceMock = jest.mocked(k8sListResource);

describe('useExistingSecrets', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should not call k8sListResource when enabled is false', () => {
    const renderResult = testHook(useExistingSecrets)('test-namespace', false);

    expect(k8sListResourceMock).not.toHaveBeenCalled();
    expect(renderResult).hookToStrictEqual(standardUseFetchState([], false));
  });

  it('should fetch and filter secrets when enabled is true', async () => {
    // Create mock secrets - mix of Opaque and non-Opaque, Connection and non-Connection
    const opaqueSecret = mockCustomSecretK8sResource({
      name: 'opaque-secret',
      namespace: 'test-namespace',
      data: { key: 'value' },
      type: 'Opaque',
    });

    const connectionSecret = mockCustomSecretK8sResource({
      name: 'connection-secret',
      namespace: 'test-namespace',
      data: { key: 'value' },
      type: 'Opaque',
      annotations: {
        'opendatahub.io/connection-type': 's3',
      },
    });

    const nonOpaqueSecret = mockCustomSecretK8sResource({
      name: 'non-opaque-secret',
      namespace: 'test-namespace',
      data: { key: 'value' },
      type: 'kubernetes.io/service-account-token',
    });

    const anotherOpaqueSecret = mockCustomSecretK8sResource({
      name: 'another-opaque-secret',
      namespace: 'test-namespace',
      data: { key2: 'value2' },
      type: 'Opaque',
    });

    k8sListResourceMock.mockResolvedValue({
      apiVersion: 'v1',
      metadata: {
        resourceVersion: '12345',
        continue: '',
      },
      items: [opaqueSecret, connectionSecret, nonOpaqueSecret, anotherOpaqueSecret],
    });

    const renderResult = testHook(useExistingSecrets)('test-namespace', true);

    // Wait for the hook to complete
    await renderResult.waitForNextUpdate();

    // Should have called k8sListResource with correct parameters
    expect(k8sListResourceMock).toHaveBeenCalledWith({
      model: expect.any(Object), // SecretModel
      queryOptions: { ns: 'test-namespace' },
    });

    // Should return only Opaque secrets that are not Connections
    expect(renderResult).hookToStrictEqual(
      standardUseFetchState([opaqueSecret, anotherOpaqueSecret], true),
    );
  });

  it('should handle errors from k8sListResource', async () => {
    const testError = new Error('Failed to fetch secrets');
    k8sListResourceMock.mockRejectedValue(testError);

    const renderResult = testHook(useExistingSecrets)('test-namespace', true);

    await renderResult.waitForNextUpdate();

    expect(renderResult).hookToStrictEqual(standardUseFetchState([], false, testError));
  });

  it('should refresh when refresh function is called', async () => {
    const secret1 = mockCustomSecretK8sResource({
      name: 'secret-1',
      namespace: 'test-namespace',
      data: { key: 'value' },
      type: 'Opaque',
    });

    k8sListResourceMock.mockResolvedValueOnce({
      apiVersion: 'v1',
      metadata: {
        resourceVersion: '12345',
        continue: '',
      },
      items: [secret1],
    });

    const renderResult = testHook(useExistingSecrets)('test-namespace', true);
    await renderResult.waitForNextUpdate();

    // Change the mock to return different data
    const secret2 = mockCustomSecretK8sResource({
      name: 'secret-2',
      namespace: 'test-namespace',
      data: { key: 'value2' },
      type: 'Opaque',
    });

    k8sListResourceMock.mockResolvedValue({
      apiVersion: 'v1',
      metadata: {
        resourceVersion: '12345',
        continue: '',
      },
      items: [secret2],
    });

    // Call refresh
    const [, , , refresh] = renderResult.result.current;
    const refreshPromise = refresh();
    await renderResult.waitForNextUpdate();
    await refreshPromise;

    // Should have new data
    expect(renderResult).hookToStrictEqual(standardUseFetchState([secret2], true));
  });

  it('should re-run when namespace changes', async () => {
    k8sListResourceMock.mockResolvedValue({
      apiVersion: 'v1',
      metadata: {
        resourceVersion: '12345',
        continue: '',
      },
      items: [],
    });

    const renderResult = testHook(useExistingSecrets)('namespace-1', true);
    await renderResult.waitForNextUpdate();

    expect(k8sListResourceMock).toHaveBeenCalledWith({
      model: expect.any(Object),
      queryOptions: { ns: 'namespace-1' },
    });

    // Change namespace
    renderResult.rerender('namespace-2', true);
    await renderResult.waitForNextUpdate();

    expect(k8sListResourceMock).toHaveBeenCalledWith({
      model: expect.any(Object),
      queryOptions: { ns: 'namespace-2' },
    });
  });
});
