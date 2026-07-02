import { renderHook, waitFor } from '@testing-library/react';
import { k8sListResource } from '@openshift/dynamic-plugin-sdk-utils';
import { ConfigMapModel } from '@odh-dashboard/internal/api/models';
import useNamespaceConfigMaps from '../useNamespaceConfigMaps';

jest.mock('@openshift/dynamic-plugin-sdk-utils', () => ({
  k8sListResource: jest.fn(),
}));

jest.mock('@odh-dashboard/internal/utilities/useFetch', () => {
  const actual = jest.requireActual('@odh-dashboard/internal/utilities/useFetch');
  return actual;
});

const k8sListResourceMock = jest.mocked(k8sListResource);

describe('useNamespaceConfigMaps', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return sorted configmap names for a namespace', async () => {
    k8sListResourceMock.mockResolvedValue({
      items: [
        { metadata: { name: 'z-config' } },
        { metadata: { name: 'a-config' } },
        { metadata: { name: 'm-config' } },
      ],
    } as never);

    const { result } = renderHook(() => useNamespaceConfigMaps('test-ns'));

    await waitFor(() => {
      expect(result.current.loaded).toBe(true);
    });

    expect(result.current.configMaps).toEqual(['a-config', 'm-config', 'z-config']);
    expect(result.current.error).toBeUndefined();
    expect(k8sListResourceMock).toHaveBeenCalledWith({
      model: ConfigMapModel,
      queryOptions: { ns: 'test-ns' },
    });
  });

  it('should return empty array when namespace has no configmaps', async () => {
    k8sListResourceMock.mockResolvedValue({ items: [] } as never);

    const { result } = renderHook(() => useNamespaceConfigMaps('test-ns'));

    await waitFor(() => {
      expect(result.current.loaded).toBe(true);
    });

    expect(result.current.configMaps).toEqual([]);
  });

  it('should not fetch when namespace is empty', () => {
    const { result } = renderHook(() => useNamespaceConfigMaps(''));

    expect(result.current.loaded).toBe(false);
    expect(k8sListResourceMock).not.toHaveBeenCalled();
  });

  it('should set error on API failure', async () => {
    k8sListResourceMock.mockRejectedValue(new Error('forbidden'));

    const { result } = renderHook(() => useNamespaceConfigMaps('test-ns'));

    await waitFor(() => {
      expect(result.current.error).toBeDefined();
    });

    expect(result.current.error?.message).toBe('forbidden');
  });
});
