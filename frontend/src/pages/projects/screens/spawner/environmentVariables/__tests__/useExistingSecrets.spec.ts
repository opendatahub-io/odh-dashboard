import { testHook } from '@odh-dashboard/jest-config/hooks';
import { getSecrets } from '#~/api/k8s/secrets';
import { isConnection } from '#~/concepts/connectionTypes/utils';
import { mockSecretK8sResource } from '#~/__mocks__/mockSecretK8sResource';
import { useExistingSecrets } from '#~/pages/projects/screens/spawner/environmentVariables/useExistingSecrets';
import { NotReadyError } from '#~/utilities/useFetch';

jest.mock('#~/api/k8s/secrets', () => ({
  getSecrets: jest.fn(),
}));

jest.mock('#~/concepts/connectionTypes/utils', () => ({
  isConnection: jest.fn(),
}));

jest.mock('#~/utilities/useFetchState', () => ({
  ...jest.requireActual('#~/utilities/useFetchState'),
  __esModule: true,
  default: jest.fn(),
}));

const mockGetSecrets = jest.mocked(getSecrets);
const mockIsConnection = jest.mocked(isConnection);
const mockUseFetchState = jest.mocked(require('#~/utilities/useFetchState').default);

describe('useExistingSecrets', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseFetchState.mockReturnValue([[], false, undefined, jest.fn()]);
  });

  it('should not fire API call when enabled is false', () => {
    testHook(useExistingSecrets)('test-namespace', false);

    const callbackArg = mockUseFetchState.mock.calls[0]?.[0];
    expect(callbackArg).toBeDefined();
    expect(typeof callbackArg).toBe('function');

    // The callback should reject with NotReadyError when enabled is false
    expect(() => callbackArg({})).rejects.toBeInstanceOf(NotReadyError);
    expect(mockGetSecrets).not.toHaveBeenCalled();
  });

  it('should fire API call when enabled is true', async () => {
    const mockOpaqueSecret = mockSecretK8sResource({ name: 'opaque-secret', type: 'Opaque' });
    mockGetSecrets.mockResolvedValue([mockOpaqueSecret]);
    mockIsConnection.mockReturnValue(false);

    testHook(useExistingSecrets)('test-namespace', true);

    const callbackArg = mockUseFetchState.mock.calls[0]?.[0];
    await callbackArg({});

    expect(mockGetSecrets).toHaveBeenCalledWith('test-namespace', {});
  });

  it('should return only Opaque type secrets', async () => {
    const opaqueSecret = mockSecretK8sResource({ name: 'opaque-secret', type: 'Opaque' });
    const dockerSecret = mockSecretK8sResource({
      name: 'docker-secret',
      type: 'kubernetes.io/dockerconfigjson',
    });
    const tokenSecret = mockSecretK8sResource({
      name: 'token-secret',
      type: 'kubernetes.io/service-account-token',
    });

    mockGetSecrets.mockResolvedValue([opaqueSecret, dockerSecret, tokenSecret]);
    mockIsConnection.mockReturnValue(false);

    testHook(useExistingSecrets)('test-namespace', true);

    const callbackArg = mockUseFetchState.mock.calls[0]?.[0];
    const result = await callbackArg({});

    expect(result).toHaveLength(1);
    expect(result[0]).toBe(opaqueSecret);
  });

  it('should filter out Connection secrets using isConnection utility', async () => {
    const regularSecret = mockSecretK8sResource({ name: 'regular-secret', type: 'Opaque' });
    const connectionSecret = mockSecretK8sResource({ name: 'connection-secret', type: 'Opaque' });

    mockGetSecrets.mockResolvedValue([regularSecret, connectionSecret]);
    mockIsConnection.mockImplementation((secret) => secret.metadata.name === 'connection-secret');

    testHook(useExistingSecrets)('test-namespace', true);

    const callbackArg = mockUseFetchState.mock.calls[0]?.[0];
    const result = await callbackArg({});

    expect(result).toHaveLength(1);
    expect(result[0]).toBe(regularSecret);
    expect(mockIsConnection).toHaveBeenCalledTimes(2);
  });

  it('should return empty array when all secrets are filtered out', async () => {
    const dockerSecret = mockSecretK8sResource({
      name: 'docker-secret',
      type: 'kubernetes.io/dockerconfigjson',
    });
    const connectionSecret = mockSecretK8sResource({ name: 'connection-secret', type: 'Opaque' });

    mockGetSecrets.mockResolvedValue([dockerSecret, connectionSecret]);
    mockIsConnection.mockImplementation((secret) => secret.metadata.name === 'connection-secret');

    testHook(useExistingSecrets)('test-namespace', true);

    const callbackArg = mockUseFetchState.mock.calls[0]?.[0];
    const result = await callbackArg({});

    expect(result).toEqual([]);
  });

  it('should return tuple with correct structure', () => {
    const mockSecrets = [mockSecretK8sResource({ name: 'test-secret', type: 'Opaque' })];
    mockUseFetchState.mockReturnValue([mockSecrets, true, undefined, jest.fn()]);

    const renderResult = testHook(useExistingSecrets)('test-namespace', true);
    const [secrets, loaded, error] = renderResult.result.current;

    expect(secrets).toBe(mockSecrets);
    expect(loaded).toBe(true);
    expect(error).toBeUndefined();
  });

  it('should handle error state from useFetchState', () => {
    const testError = new Error('Failed to fetch secrets');
    mockUseFetchState.mockReturnValue([[], false, testError, jest.fn()]);

    const renderResult = testHook(useExistingSecrets)('test-namespace', true);
    const [secrets, loaded, error] = renderResult.result.current;

    expect(secrets).toEqual([]);
    expect(loaded).toBe(false);
    expect(error).toBe(testError);
  });

  it('should handle empty namespace gracefully', async () => {
    testHook(useExistingSecrets)('', true);

    const callbackArg = mockUseFetchState.mock.calls[0]?.[0];

    await expect(callbackArg({})).rejects.toBeInstanceOf(NotReadyError);
    expect(mockGetSecrets).not.toHaveBeenCalled();
  });

  it('should pass K8sAPIOptions to getSecrets', async () => {
    const mockOpts = { signal: new AbortController().signal };
    mockGetSecrets.mockResolvedValue([]);
    mockIsConnection.mockReturnValue(false);

    testHook(useExistingSecrets)('test-namespace', true);

    const callbackArg = mockUseFetchState.mock.calls[0]?.[0];
    await callbackArg(mockOpts);

    expect(mockGetSecrets).toHaveBeenCalledWith('test-namespace', mockOpts);
  });

  it('should use correct dependency array for useCallback', () => {
    const renderResult = testHook(useExistingSecrets)('test-namespace', true);

    // Re-render with same arguments should not create new callback
    renderResult.rerender('test-namespace', true);

    expect(mockUseFetchState).toHaveBeenCalledTimes(2);
    const firstCallback = mockUseFetchState.mock.calls[0]?.[0];
    const secondCallback = mockUseFetchState.mock.calls[1]?.[0];

    // Callbacks should be the same reference (stable)
    expect(firstCallback).toBe(secondCallback);
  });

  it('should create new callback when namespace changes', () => {
    const renderResult = testHook(useExistingSecrets)('namespace-1', true);

    renderResult.rerender('namespace-2', true);

    expect(mockUseFetchState).toHaveBeenCalledTimes(2);
    const firstCallback = mockUseFetchState.mock.calls[0]?.[0];
    const secondCallback = mockUseFetchState.mock.calls[1]?.[0];

    // Callbacks should be different references (namespace changed)
    expect(firstCallback).not.toBe(secondCallback);
  });

  it('should create new callback when enabled changes', () => {
    const renderResult = testHook(useExistingSecrets)('test-namespace', false);

    renderResult.rerender('test-namespace', true);

    expect(mockUseFetchState).toHaveBeenCalledTimes(2);
    const firstCallback = mockUseFetchState.mock.calls[0]?.[0];
    const secondCallback = mockUseFetchState.mock.calls[1]?.[0];

    // Callbacks should be different references (enabled changed)
    expect(firstCallback).not.toBe(secondCallback);
  });
});
