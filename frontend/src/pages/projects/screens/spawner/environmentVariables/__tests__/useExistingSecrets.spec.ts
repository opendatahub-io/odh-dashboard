import { k8sListResource } from '@openshift/dynamic-plugin-sdk-utils';
import type { SecretKind } from '@odh-dashboard/k8s-core';
import { renderHook } from '@odh-dashboard/jest-config/hooks';
import { mockK8sResourceList } from '#~/__mocks__/mockK8sResourceList';
import { SecretModel } from '#~/api/models';
import { useAccessReview } from '#~/api/useAccessReview';
import {
  fetchExistingSecrets,
  useExistingSecrets,
} from '#~/pages/projects/screens/spawner/environmentVariables/useExistingSecrets';

jest.mock('@openshift/dynamic-plugin-sdk-utils', () => ({
  k8sListResource: jest.fn(),
}));

jest.mock('#~/api/useAccessReview', () => ({
  useAccessReview: jest.fn(),
}));

const k8sListResourceMock = jest.mocked(k8sListResource<SecretKind>);
const useAccessReviewMock = jest.mocked(useAccessReview);

const createMockSecret = (
  name: string,
  options: {
    data?: Record<string, string>;
    labels?: Record<string, string>;
    annotations?: Record<string, string>;
    type?: string;
  } = {},
): SecretKind => ({
  apiVersion: 'v1',
  kind: 'Secret',
  metadata: {
    name,
    namespace: 'test-namespace',
    ...(options.labels && { labels: options.labels }),
    ...(options.annotations && { annotations: options.annotations }),
  },
  ...(options.data && { data: options.data }),
  ...(options.type && { type: options.type }),
});

describe('fetchExistingSecrets', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return eligible secrets with key names only', async () => {
    const secrets = [
      createMockSecret('my-secret', {
        data: { username: 'dXNlcg==', password: 'cGFzcw==' },
      }),
    ];
    k8sListResourceMock.mockResolvedValue(mockK8sResourceList(secrets));

    const result = await fetchExistingSecrets('test-namespace');

    expect(result).toStrictEqual([{ name: 'my-secret', keys: ['username', 'password'] }]);
    expect(k8sListResourceMock).toHaveBeenCalledWith({
      model: SecretModel,
      queryOptions: { ns: 'test-namespace' },
    });
  });

  it('should filter out dashboard-created secrets', async () => {
    const secrets = [
      createMockSecret('dashboard-secret', {
        data: { key1: 'val1' },
        labels: { 'opendatahub.io/dashboard': 'true' },
      }),
      createMockSecret('user-secret', {
        data: { key2: 'val2' },
      }),
    ];
    k8sListResourceMock.mockResolvedValue(mockK8sResourceList(secrets));

    const result = await fetchExistingSecrets('test-namespace');

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('user-secret');
  });

  it('should filter out connection secrets with connection-type-ref annotation', async () => {
    const secrets = [
      createMockSecret('connection-secret', {
        data: { endpoint: 'aHR0cA==' },
        labels: { 'opendatahub.io/dashboard': 'true' },
        annotations: { 'opendatahub.io/connection-type-ref': 's3' },
      }),
      createMockSecret('user-secret', {
        data: { key1: 'val1' },
      }),
    ];
    k8sListResourceMock.mockResolvedValue(mockK8sResourceList(secrets));

    const result = await fetchExistingSecrets('test-namespace');

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('user-secret');
  });

  it('should filter out connection secrets with connection-type annotation', async () => {
    const secrets = [
      createMockSecret('protocol-secret', {
        data: { endpoint: 'aHR0cA==' },
        labels: { 'opendatahub.io/dashboard': 'true' },
        annotations: { 'opendatahub.io/connection-type': 's3' },
      }),
      createMockSecret('user-secret', {
        data: { key1: 'val1' },
      }),
    ];
    k8sListResourceMock.mockResolvedValue(mockK8sResourceList(secrets));

    const result = await fetchExistingSecrets('test-namespace');

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('user-secret');
  });

  it('should filter out secrets that are both dashboard-created and connections', async () => {
    const secrets = [
      createMockSecret('combo-secret', {
        data: { key1: 'val1' },
        labels: { 'opendatahub.io/dashboard': 'true' },
        annotations: { 'opendatahub.io/connection-type-ref': 's3' },
      }),
    ];
    k8sListResourceMock.mockResolvedValue(mockK8sResourceList(secrets));

    const result = await fetchExistingSecrets('test-namespace');

    expect(result).toHaveLength(0);
  });

  it('should return empty keys array for secrets without data', async () => {
    const secrets = [createMockSecret('empty-secret')];
    k8sListResourceMock.mockResolvedValue(mockK8sResourceList(secrets));

    const result = await fetchExistingSecrets('test-namespace');

    expect(result).toStrictEqual([{ name: 'empty-secret', keys: [] }]);
  });

  it('should return empty array when namespace has no eligible secrets', async () => {
    k8sListResourceMock.mockResolvedValue(mockK8sResourceList([]));

    const result = await fetchExistingSecrets('test-namespace');

    expect(result).toStrictEqual([]);
  });

  it('should not expose secret values in the result', async () => {
    const secrets = [
      createMockSecret('my-secret', {
        data: { apiKey: 'c3VwZXItc2VjcmV0', token: 'dG9rZW4=' },
      }),
    ];
    k8sListResourceMock.mockResolvedValue(mockK8sResourceList(secrets));

    const result = await fetchExistingSecrets('test-namespace');

    expect(result[0].keys).toStrictEqual(['apiKey', 'token']);
    // Verify no values are present in the result
    expect(result[0]).not.toHaveProperty('data');
    expect(JSON.stringify(result)).not.toContain('c3VwZXItc2VjcmV0');
    expect(JSON.stringify(result)).not.toContain('dG9rZW4=');
  });

  it('should propagate API errors', async () => {
    k8sListResourceMock.mockRejectedValue(new Error('Forbidden'));

    await expect(fetchExistingSecrets('test-namespace')).rejects.toThrow('Forbidden');
  });
});

describe('useExistingSecrets', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return loaded secrets when RBAC allows listing', async () => {
    useAccessReviewMock.mockReturnValue([true, true]);
    k8sListResourceMock.mockResolvedValue(
      mockK8sResourceList([
        createMockSecret('secret-a', { data: { key1: 'val1' } }),
        createMockSecret('secret-b', { data: { key2: 'val2', key3: 'val3' } }),
      ]),
    );

    const renderResult = renderHook(() => useExistingSecrets('test-namespace'));
    await renderResult.waitForNextUpdate();

    expect(renderResult.result.current).toStrictEqual({
      secrets: [
        { name: 'secret-a', keys: ['key1'] },
        { name: 'secret-b', keys: ['key2', 'key3'] },
      ],
      loaded: true,
      canList: true,
      error: undefined,
    });
  });

  it('should return canList false when RBAC denies listing', async () => {
    useAccessReviewMock.mockReturnValue([false, true]);

    const renderResult = renderHook(() => useExistingSecrets('test-namespace'));

    expect(renderResult.result.current).toStrictEqual({
      secrets: [],
      loaded: true,
      canList: false,
      error: undefined,
    });
  });

  it('should return loaded false while RBAC check is pending', () => {
    useAccessReviewMock.mockReturnValue([false, false]);

    const renderResult = renderHook(() => useExistingSecrets('test-namespace'));

    expect(renderResult.result.current).toStrictEqual({
      secrets: [],
      loaded: false,
      canList: false,
      error: undefined,
    });
  });

  it('should handle API errors gracefully', async () => {
    useAccessReviewMock.mockReturnValue([true, true]);
    k8sListResourceMock.mockRejectedValue(new Error('Network error'));

    const renderResult = renderHook(() => useExistingSecrets('test-namespace'));
    await renderResult.waitForNextUpdate();

    expect(renderResult.result.current).toStrictEqual({
      secrets: [],
      loaded: true,
      canList: true,
      error: new Error('Network error'),
    });
  });

  it('should not fetch when namespace is empty', () => {
    useAccessReviewMock.mockReturnValue([true, true]);

    const renderResult = renderHook(() => useExistingSecrets(''));

    expect(k8sListResourceMock).not.toHaveBeenCalled();
    expect(renderResult.result.current.loaded).toBe(true);
  });
});
