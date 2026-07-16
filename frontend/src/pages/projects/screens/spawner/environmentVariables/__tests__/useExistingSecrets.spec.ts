import { testHook } from '@odh-dashboard/jest-config/hooks';
import { mockCustomSecretK8sResource } from '#~/__mocks__/mockSecretK8sResource';
import { useExistingSecrets } from '#~/pages/projects/screens/spawner/environmentVariables/useExistingSecrets';

jest.mock('#~/api', () => ({
  getSecrets: jest.fn(),
}));

const { getSecrets } = jest.requireMock('#~/api') as {
  getSecrets: jest.Mock;
};

describe('useExistingSecrets', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return empty array when namespace is undefined', () => {
    const renderResult = testHook(useExistingSecrets)(undefined);
    const [secrets, loaded] = renderResult.result.current;
    expect(secrets).toEqual([]);
    expect(loaded).toBe(false);
  });

  it('should fetch and filter secrets when namespace is provided', async () => {
    const opaqueSecret = mockCustomSecretK8sResource({
      name: 'eligible-secret',
      namespace: 'test-ns',
      data: { KEY: 'dmFsdWU=' },
      type: 'Opaque',
      labels: {},
      annotations: {},
    });
    const connectionSecret = mockCustomSecretK8sResource({
      name: 'connection-secret',
      namespace: 'test-ns',
      data: { KEY: 'dmFsdWU=' },
      type: 'Opaque',
      labels: { 'opendatahub.io/dashboard': 'true' },
      annotations: { 'opendatahub.io/connection-type': 's3' },
    });
    getSecrets.mockResolvedValue([opaqueSecret, connectionSecret]);

    const renderResult = testHook(useExistingSecrets)('test-ns');
    await renderResult.waitForNextUpdate();

    const [secrets, loaded] = renderResult.result.current;
    expect(loaded).toBe(true);
    expect(secrets).toHaveLength(1);
    expect(secrets[0].metadata.name).toBe('eligible-secret');
  });
});
