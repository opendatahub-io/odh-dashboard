import { standardUseFetchState, testHook } from '@odh-dashboard/jest-config/hooks';
import type { SecretKind } from '@odh-dashboard/k8s-core';
import { getSecrets } from '#~/api';
import { useExistingSecrets } from '#~/pages/projects/screens/spawner/environmentVariables/useExistingSecrets';

jest.mock('#~/api', () => ({
  getSecrets: jest.fn(),
}));

const getSecretsMock = jest.mocked(getSecrets);

const mockOpaqueSecret = (name: string, annotations?: Record<string, string>): SecretKind => ({
  apiVersion: 'v1',
  kind: 'Secret',
  type: 'Opaque',
  metadata: {
    name,
    namespace: 'test-ns',
    annotations: annotations || {},
  },
  data: { key1: 'dmFsdWUx' },
});

describe('useExistingSecrets', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should not fetch when disabled', () => {
    const renderResult = testHook(useExistingSecrets)('test-ns', false);

    expect(getSecretsMock).not.toHaveBeenCalled();
    expect(renderResult).hookToStrictEqual(standardUseFetchState([]));
    expect(renderResult).hookToHaveUpdateCount(1);
  });

  it('should fetch and filter secrets when enabled', async () => {
    const secrets: SecretKind[] = [
      mockOpaqueSecret('my-secret'),
      mockOpaqueSecret('connection-secret', {
        'opendatahub.io/connection-type-ref': 'some-type',
      }),
      mockOpaqueSecret('connection-protocol-secret', {
        'opendatahub.io/connection-type-protocol': 'grpc',
      }),
      mockOpaqueSecret('legacy-aws-secret', {
        'opendatahub.io/connection-type': 's3',
      }),
      {
        ...mockOpaqueSecret('service-account-token'),
        type: 'kubernetes.io/service-account-token',
      },
    ];

    getSecretsMock.mockResolvedValue(secrets);

    const renderResult = testHook(useExistingSecrets)('test-ns', true);
    await renderResult.waitForNextUpdate();

    expect(renderResult).hookToStrictEqual(
      standardUseFetchState([mockOpaqueSecret('my-secret')], true),
    );
    expect(renderResult).hookToHaveUpdateCount(2);
  });

  it('should keep dashboard secrets that are not Connections', async () => {
    const secrets: SecretKind[] = [
      {
        ...mockOpaqueSecret('dashboard-secret'),
        metadata: {
          name: 'dashboard-secret',
          namespace: 'test-ns',
          labels: { 'opendatahub.io/dashboard': 'true' },
          annotations: {},
        },
      },
    ];

    getSecretsMock.mockResolvedValue(secrets);

    const renderResult = testHook(useExistingSecrets)('test-ns', true);
    await renderResult.waitForNextUpdate();

    expect(renderResult.result.current[0]).toHaveLength(1);
    expect(renderResult.result.current[0][0].metadata.name).toBe('dashboard-secret');
    expect(renderResult).hookToHaveUpdateCount(2);
  });
});
