import { testHook } from '@odh-dashboard/jest-config/hooks';
import { k8sListResource } from '@openshift/dynamic-plugin-sdk-utils';
import { mockCustomSecretK8sResource } from '#~/__mocks__/mockSecretK8sResource';
import useExistingSecrets from '#~/pages/projects/screens/spawner/environmentVariables/useExistingSecrets';

jest.mock('@openshift/dynamic-plugin-sdk-utils', () => ({
  k8sListResource: jest.fn(),
}));

const k8sListResourceMock = jest.mocked(k8sListResource);

describe('useExistingSecrets', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should not fetch when disabled', () => {
    const renderResult = testHook(useExistingSecrets)('test-ns', false);
    expect(renderResult.result.current).toStrictEqual([[], false, undefined]);
    expect(k8sListResourceMock).not.toHaveBeenCalled();
    expect(renderResult).hookToHaveUpdateCount(1);
  });

  it('should not fetch when namespace is empty string', () => {
    const renderResult = testHook(useExistingSecrets)('', true);
    expect(renderResult.result.current).toStrictEqual([[], false, undefined]);
    expect(k8sListResourceMock).not.toHaveBeenCalled();
    expect(renderResult).hookToHaveUpdateCount(1);
  });

  it('should fetch opaque secrets when enabled', async () => {
    const mockSecrets = {
      apiVersion: 'v1',
      metadata: {
        resourceVersion: '1234',
        continue: '',
      },
      items: [
        mockCustomSecretK8sResource({
          name: 'my-secret',
          namespace: 'test-ns',
          data: { KEY_A: 'dmFsdWU=' },
          type: 'Opaque',
        }),
      ],
    };
    k8sListResourceMock.mockResolvedValue(mockSecrets);

    const renderResult = testHook(useExistingSecrets)('test-ns', true);
    await renderResult.waitForNextUpdate();

    expect(renderResult.result.current[0]).toHaveLength(1);
    expect(renderResult.result.current[0][0].metadata.name).toBe('my-secret');
    expect(renderResult.result.current[1]).toBe(true);
    expect(renderResult).hookToHaveUpdateCount(2);
  });

  it('should filter out connection secrets', async () => {
    const mockSecrets = {
      apiVersion: 'v1',
      metadata: {
        resourceVersion: '1234',
        continue: '',
      },
      items: [
        mockCustomSecretK8sResource({
          name: 'connection-secret',
          namespace: 'test-ns',
          labels: { 'opendatahub.io/dashboard': 'true', 'opendatahub.io/managed': 'true' },
          annotations: { 'opendatahub.io/connection-type': 's3' },
          data: {},
          type: 'Opaque',
        }),
        mockCustomSecretK8sResource({
          name: 'plain-secret',
          namespace: 'test-ns',
          data: { KEY: 'dmFsdWU=' },
          type: 'Opaque',
        }),
      ],
    };
    k8sListResourceMock.mockResolvedValue(mockSecrets);

    const renderResult = testHook(useExistingSecrets)('test-ns', true);
    await renderResult.waitForNextUpdate();

    expect(renderResult.result.current[0]).toHaveLength(1);
    expect(renderResult.result.current[0][0].metadata.name).toBe('plain-secret');
    expect(renderResult).hookToHaveUpdateCount(2);
  });

  it('should filter out secrets with protocol annotation', async () => {
    const mockSecrets = {
      apiVersion: 'v1',
      metadata: {
        resourceVersion: '1234',
        continue: '',
      },
      items: [
        mockCustomSecretK8sResource({
          name: 'protocol-secret',
          namespace: 'test-ns',
          annotations: { 'opendatahub.io/connection-type-protocol': 'grpc' },
          data: {},
          type: 'Opaque',
        }),
        mockCustomSecretK8sResource({
          name: 'eligible-secret',
          namespace: 'test-ns',
          data: { FOO: 'YmFy' },
          type: 'Opaque',
        }),
      ],
    };
    k8sListResourceMock.mockResolvedValue(mockSecrets);

    const renderResult = testHook(useExistingSecrets)('test-ns', true);
    await renderResult.waitForNextUpdate();

    expect(renderResult.result.current[0]).toHaveLength(1);
    expect(renderResult.result.current[0][0].metadata.name).toBe('eligible-secret');
    expect(renderResult).hookToHaveUpdateCount(2);
  });

  it('should handle fetch error', async () => {
    k8sListResourceMock.mockRejectedValue(new Error('403 Forbidden'));

    const renderResult = testHook(useExistingSecrets)('test-ns', true);
    await renderResult.waitForNextUpdate();

    expect(renderResult.result.current[0]).toStrictEqual([]);
    expect(renderResult.result.current[1]).toBe(false);
    expect(renderResult.result.current[2]).toBeInstanceOf(Error);
    expect(renderResult).hookToHaveUpdateCount(2);
  });
});
