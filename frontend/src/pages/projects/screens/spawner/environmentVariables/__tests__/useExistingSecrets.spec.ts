import { k8sListResource } from '@openshift/dynamic-plugin-sdk-utils';
import { standardUseFetchState, testHook } from '@odh-dashboard/jest-config/hooks';
import type { SecretKind } from '@odh-dashboard/k8s-core';
import { mockCustomSecretK8sResource } from '#~/__mocks__/mockSecretK8sResource';
import { useExistingSecrets } from '#~/pages/projects/screens/spawner/environmentVariables/useExistingSecrets';

jest.mock('@openshift/dynamic-plugin-sdk-utils', () => ({
  k8sListResource: jest.fn(),
}));

const k8sListResourceMock = jest.mocked(k8sListResource<SecretKind>);

const mockOpaqueSecret = (
  name: string,
  annotations: Record<string, string> = {},
  labels: Record<string, string> = {},
): SecretKind =>
  mockCustomSecretK8sResource({
    name,
    namespace: 'test-ns',
    annotations,
    labels,
    data: { key: 'dmFsdWU=' },
    type: 'Opaque',
  });

describe('useExistingSecrets', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should not fetch when enabled is false', () => {
    const renderResult = testHook(useExistingSecrets)('test-ns', false);
    expect(k8sListResourceMock).not.toHaveBeenCalled();
    expect(renderResult).hookToStrictEqual(standardUseFetchState([]));
    expect(renderResult).hookToHaveUpdateCount(1);
  });

  it('should fetch and return non-connection secrets when enabled is true', async () => {
    const plainSecret = mockOpaqueSecret('my-plain-secret');
    const connectionSecret = mockOpaqueSecret(
      'my-connection',
      {
        'opendatahub.io/connection-type': 's3',
      },
      {
        'opendatahub.io/dashboard': 'true',
      },
    );

    k8sListResourceMock.mockResolvedValue({ items: [plainSecret, connectionSecret] } as never);

    const renderResult = testHook(useExistingSecrets)('test-ns', true);
    expect(k8sListResourceMock).toHaveBeenCalledTimes(1);
    expect(renderResult).hookToStrictEqual(standardUseFetchState([]));
    expect(renderResult).hookToHaveUpdateCount(1);

    await renderResult.waitForNextUpdate();
    expect(renderResult).hookToStrictEqual(standardUseFetchState([plainSecret], true));
    expect(renderResult).hookToHaveUpdateCount(2);
  });

  it('should filter out secrets with connection-type-ref annotation', async () => {
    const plainSecret = mockOpaqueSecret('plain');
    const connectionRefSecret = mockOpaqueSecret(
      'conn-ref',
      {
        'opendatahub.io/connection-type-ref': 'some-type',
      },
      {
        'opendatahub.io/dashboard': 'true',
      },
    );

    k8sListResourceMock.mockResolvedValue({
      items: [plainSecret, connectionRefSecret],
    } as never);

    const renderResult = testHook(useExistingSecrets)('test-ns', true);
    await renderResult.waitForNextUpdate();

    expect(renderResult).hookToStrictEqual(standardUseFetchState([plainSecret], true));
  });

  it('should filter out secrets with connection-type-protocol annotation', async () => {
    const plainSecret = mockOpaqueSecret('plain');
    const protocolSecret = mockOpaqueSecret('proto-conn', {
      'opendatahub.io/connection-type-protocol': 'grpc',
    });

    k8sListResourceMock.mockResolvedValue({
      items: [plainSecret, protocolSecret],
    } as never);

    const renderResult = testHook(useExistingSecrets)('test-ns', true);
    await renderResult.waitForNextUpdate();

    expect(renderResult).hookToStrictEqual(standardUseFetchState([plainSecret], true));
  });

  it('should return all secrets when none are connections', async () => {
    const secret1 = mockOpaqueSecret('secret-1');
    const secret2 = mockOpaqueSecret('secret-2');

    k8sListResourceMock.mockResolvedValue({
      items: [secret1, secret2],
    } as never);

    const renderResult = testHook(useExistingSecrets)('test-ns', true);
    await renderResult.waitForNextUpdate();

    expect(renderResult).hookToStrictEqual(standardUseFetchState([secret1, secret2], true));
  });

  it('should handle API errors', async () => {
    k8sListResourceMock.mockRejectedValue(new Error('forbidden'));

    const renderResult = testHook(useExistingSecrets)('test-ns', true);
    await renderResult.waitForNextUpdate();

    expect(renderResult).hookToStrictEqual(
      standardUseFetchState([], false, new Error('forbidden')),
    );
    expect(renderResult).hookToHaveUpdateCount(2);
  });

  it('should return empty array when all secrets are connections', async () => {
    const conn1 = mockOpaqueSecret(
      'conn-1',
      { 'opendatahub.io/connection-type': 's3' },
      { 'opendatahub.io/dashboard': 'true' },
    );
    const conn2 = mockOpaqueSecret('conn-2', {
      'opendatahub.io/connection-type-protocol': 'http',
    });

    k8sListResourceMock.mockResolvedValue({ items: [conn1, conn2] } as never);

    const renderResult = testHook(useExistingSecrets)('test-ns', true);
    await renderResult.waitForNextUpdate();

    expect(renderResult).hookToStrictEqual(standardUseFetchState([], true));
  });
});
