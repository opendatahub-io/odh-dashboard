import { standardUseFetchState, testHook } from '@odh-dashboard/jest-config/hooks';
import type { SecretKind } from '@odh-dashboard/k8s-core';
import { listSecrets } from '#~/api/k8s/secrets';
import { useExistingSecrets } from '#~/pages/projects/screens/spawner/environmentVariables/useExistingSecrets';

jest.mock('#~/api/k8s/secrets', () => ({
  listSecrets: jest.fn(),
}));

const listSecretsMock = jest.mocked(listSecrets);

const makeSecret = (
  name: string,
  type = 'Opaque',
  annotations: Record<string, string> = {},
): SecretKind =>
  ({
    apiVersion: 'v1',
    kind: 'Secret',
    type,
    metadata: { name, namespace: 'test-ns', annotations, labels: {} },
    data: { KEY: 'dmFsdWU=' },
  } as unknown as SecretKind);

describe('useExistingSecrets', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should not fire query when enabled is false', () => {
    const renderResult = testHook(useExistingSecrets)('test-ns', false);
    expect(listSecretsMock).not.toHaveBeenCalled();
    expect(renderResult).hookToStrictEqual(standardUseFetchState([]));
    expect(renderResult).hookToHaveUpdateCount(1);
  });

  it('should fire query when enabled is true and return filtered secrets', async () => {
    const opaqueSecret = makeSecret('db-creds');
    const connectionSecret = makeSecret('conn-secret', 'Opaque', {
      'opendatahub.io/connection-type': 's3',
    });
    const nonOpaqueSecret = makeSecret('tls-secret', 'kubernetes.io/tls');

    listSecretsMock.mockResolvedValue([opaqueSecret, connectionSecret, nonOpaqueSecret]);

    const renderResult = testHook(useExistingSecrets)('test-ns', true);
    expect(listSecretsMock).toHaveBeenCalledTimes(1);
    expect(renderResult).hookToHaveUpdateCount(1);

    await renderResult.waitForNextUpdate();
    // Only the opaque, non-connection secret should be returned
    expect(renderResult.result.current[0]).toEqual([opaqueSecret]);
    expect(renderResult.result.current[1]).toBe(true); // loaded
    expect(renderResult).hookToHaveUpdateCount(2);
  });

  it('should not fire query when namespace is empty', () => {
    testHook(useExistingSecrets)('', true);
    expect(listSecretsMock).not.toHaveBeenCalled();
  });
});
