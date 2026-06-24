import { standardUseFetchStateObject, testHook } from '@odh-dashboard/jest-config/hooks';
import { k8sListResource } from '@openshift/dynamic-plugin-sdk-utils';
import type { SecretKind } from '@odh-dashboard/k8s-core';
import useNamespaceSecrets from '#~/pages/projects/screens/spawner/environmentVariables/useNamespaceSecrets';

jest.mock('@openshift/dynamic-plugin-sdk-utils', () => ({
  k8sListResource: jest.fn(),
}));

const k8sListResourceMock = jest.mocked(k8sListResource);

const mockListResult = (items: SecretKind[]) => ({
  apiVersion: 'v1',
  items,
  metadata: { resourceVersion: '1', continue: '' },
});

const createSecret = (
  name: string,
  type: string,
  annotations: Record<string, string> = {},
): SecretKind => ({
  apiVersion: 'v1',
  kind: 'Secret',
  metadata: {
    name,
    namespace: 'test-ns',
    annotations,
  },
  type,
});

describe('useNamespaceSecrets', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return only Opaque secrets excluding connections', async () => {
    const opaqueSecret = createSecret('my-secret', 'Opaque');
    const opaqueSecret2 = createSecret('my-secret-2', 'Opaque');
    const serviceAccountSecret = createSecret('sa-token', 'kubernetes.io/service-account-token');
    const connectionWithRef = createSecret('conn-ref', 'Opaque', {
      'opendatahub.io/connection-type-ref': 's3',
    });
    const connectionWithProtocol = createSecret('conn-proto', 'Opaque', {
      'opendatahub.io/connection-type-protocol': 'https',
    });

    k8sListResourceMock.mockResolvedValue(
      mockListResult([
        opaqueSecret,
        opaqueSecret2,
        serviceAccountSecret,
        connectionWithRef,
        connectionWithProtocol,
      ]),
    );

    const renderResult = testHook(useNamespaceSecrets)('test-ns', true);
    expect(renderResult).hookToHaveUpdateCount(1);

    await renderResult.waitForNextUpdate();
    expect(renderResult).hookToStrictEqual(
      standardUseFetchStateObject({
        data: [opaqueSecret, opaqueSecret2],
        loaded: true,
      }),
    );
    expect(renderResult).hookToHaveUpdateCount(2);
  });

  it('should not fetch when enabled is false', () => {
    const renderResult = testHook(useNamespaceSecrets)('test-ns', false);
    expect(k8sListResourceMock).not.toHaveBeenCalled();
    expect(renderResult).hookToStrictEqual(standardUseFetchStateObject({ data: [] }));
    expect(renderResult).hookToHaveUpdateCount(1);
  });

  it('should not fetch when namespace is empty', () => {
    const renderResult = testHook(useNamespaceSecrets)('', true);
    expect(k8sListResourceMock).not.toHaveBeenCalled();
    expect(renderResult).hookToStrictEqual(standardUseFetchStateObject({ data: [] }));
    expect(renderResult).hookToHaveUpdateCount(1);
  });

  it('should call k8sListResource with correct parameters', async () => {
    k8sListResourceMock.mockResolvedValue(mockListResult([]));

    const renderResult = testHook(useNamespaceSecrets)('my-namespace', true);
    await renderResult.waitForNextUpdate();

    expect(k8sListResourceMock).toHaveBeenCalledWith(
      expect.objectContaining({
        model: expect.objectContaining({
          apiVersion: 'v1',
          kind: 'Secret',
          plural: 'secrets',
        }),
        queryOptions: expect.objectContaining({
          ns: 'my-namespace',
        }),
      }),
    );
  });

  it('should return empty array when no Opaque secrets exist', async () => {
    k8sListResourceMock.mockResolvedValue(
      mockListResult([
        createSecret('sa-token', 'kubernetes.io/service-account-token'),
        createSecret('tls-cert', 'kubernetes.io/tls'),
      ]),
    );

    const renderResult = testHook(useNamespaceSecrets)('test-ns', true);
    await renderResult.waitForNextUpdate();

    expect(renderResult).hookToStrictEqual(standardUseFetchStateObject({ data: [], loaded: true }));
  });

  it('should exclude secrets with both connection annotations', async () => {
    const connectionWithBoth = createSecret('conn-both', 'Opaque', {
      'opendatahub.io/connection-type-ref': 's3',
      'opendatahub.io/connection-type-protocol': 'https',
    });
    const plainOpaque = createSecret('plain', 'Opaque');

    k8sListResourceMock.mockResolvedValue(mockListResult([connectionWithBoth, plainOpaque]));

    const renderResult = testHook(useNamespaceSecrets)('test-ns', true);
    await renderResult.waitForNextUpdate();

    expect(renderResult).hookToStrictEqual(
      standardUseFetchStateObject({ data: [plainOpaque], loaded: true }),
    );
  });

  it('should keep Opaque secrets with unrelated annotations', async () => {
    const secretWithAnnotations = createSecret('annotated', 'Opaque', {
      'some-other/annotation': 'value',
    });

    k8sListResourceMock.mockResolvedValue(mockListResult([secretWithAnnotations]));

    const renderResult = testHook(useNamespaceSecrets)('test-ns', true);
    await renderResult.waitForNextUpdate();

    expect(renderResult).hookToStrictEqual(
      standardUseFetchStateObject({
        data: [secretWithAnnotations],
        loaded: true,
      }),
    );
  });
});
