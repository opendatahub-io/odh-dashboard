import { renderHook, waitFor } from '@testing-library/react';
import { k8sListResource } from '@openshift/dynamic-plugin-sdk-utils';
import { SecretModel } from '@odh-dashboard/internal/api/models';
import useNamespaceSecrets from '../useNamespaceSecrets';

jest.mock('@openshift/dynamic-plugin-sdk-utils', () => ({
  k8sListResource: jest.fn(),
}));

jest.mock('@odh-dashboard/internal/utilities/useFetch', () => {
  const actual = jest.requireActual('@odh-dashboard/internal/utilities/useFetch');
  return actual;
});

const k8sListResourceMock = jest.mocked(k8sListResource);

describe('useNamespaceSecrets', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return sorted secret names for a namespace', async () => {
    k8sListResourceMock.mockResolvedValue({
      items: [
        { metadata: { name: 'z-secret' } },
        { metadata: { name: 'a-secret' } },
        { metadata: { name: 'm-secret' } },
      ],
    } as never);

    const { result } = renderHook(() => useNamespaceSecrets('test-ns'));

    await waitFor(() => {
      expect(result.current.loaded).toBe(true);
    });

    expect(result.current.secrets).toEqual(['a-secret', 'm-secret', 'z-secret']);
    expect(result.current.error).toBeUndefined();
    expect(k8sListResourceMock).toHaveBeenCalledWith({
      model: SecretModel,
      queryOptions: { ns: 'test-ns' },
    });
  });

  it('should return empty array when namespace has no secrets', async () => {
    k8sListResourceMock.mockResolvedValue({ items: [] } as never);

    const { result } = renderHook(() => useNamespaceSecrets('test-ns'));

    await waitFor(() => {
      expect(result.current.loaded).toBe(true);
    });

    expect(result.current.secrets).toEqual([]);
  });

  it('should not fetch when namespace is empty', () => {
    const { result } = renderHook(() => useNamespaceSecrets(''));

    expect(result.current.loaded).toBe(false);
    expect(k8sListResourceMock).not.toHaveBeenCalled();
  });

  it('should set error on API failure', async () => {
    k8sListResourceMock.mockRejectedValue(new Error('forbidden'));

    const { result } = renderHook(() => useNamespaceSecrets('test-ns'));

    await waitFor(() => {
      expect(result.current.error).toBeDefined();
    });

    expect(result.current.error?.message).toBe('forbidden');
  });
});
