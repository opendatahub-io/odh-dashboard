import { testHook, standardUseFetchState } from '@odh-dashboard/jest-config/hooks';
import type { SecretKind } from '@odh-dashboard/k8s-core';
import { listSecrets } from '#~/api/k8s/secrets';
import { useExistingSecrets } from '#~/pages/projects/screens/spawner/environmentVariables/useExistingSecrets';

jest.mock('@odh-dashboard/k8s-core', () => ({
  getDisplayNameFromK8sResource: (resource: {
    metadata: { annotations?: Record<string, string>; name: string };
  }) => resource.metadata.annotations?.['openshift.io/display-name'] || resource.metadata.name,
}));

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
    metadata: { name, namespace: 'test-ns', annotations },
    data: { key1: 'dmFsdWUx' },
    type,
  } as unknown as SecretKind);

describe('useExistingSecrets', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should not fire when disabled', () => {
    const renderResult = testHook(useExistingSecrets)('test-ns', false);
    expect(renderResult).hookToStrictEqual(standardUseFetchState([]));
    expect(listSecretsMock).not.toHaveBeenCalled();
    expect(renderResult).hookToHaveUpdateCount(1);
  });

  it('should fetch and filter secrets when enabled', async () => {
    const opaqueSecret = makeSecret('my-secret');
    const connectionSecret = makeSecret('conn-secret', 'Opaque', {
      'opendatahub.io/connection-type': 'some-type',
    });
    const nonOpaqueSecret = makeSecret('tls-secret', 'kubernetes.io/tls');

    listSecretsMock.mockResolvedValue([opaqueSecret, connectionSecret, nonOpaqueSecret]);

    const renderResult = testHook(useExistingSecrets)('test-ns', true);
    await renderResult.waitForNextUpdate();

    expect(listSecretsMock).toHaveBeenCalledWith('test-ns', expect.any(Object));
    expect(renderResult).hookToStrictEqual(standardUseFetchState([opaqueSecret], true));
    expect(renderResult).hookToHaveUpdateCount(2);
  });

  it('should return empty array on API error', async () => {
    listSecretsMock.mockRejectedValue(new Error('API error'));

    const renderResult = testHook(useExistingSecrets)('test-ns', true);
    await renderResult.waitForNextUpdate();

    expect(renderResult).hookToStrictEqual(
      standardUseFetchState([], false, new Error('API error')),
    );
  });

  it('should not fire when namespace is empty', () => {
    const renderResult = testHook(useExistingSecrets)('', true);
    expect(listSecretsMock).not.toHaveBeenCalled();
    expect(renderResult).hookToHaveUpdateCount(1);
  });
});
