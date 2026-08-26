import { renderHook, waitFor } from '@testing-library/react';
import type { NamespaceKind } from '../../../api/k8s';
import { createUseNamespaces } from '../useNamespaces';

describe('createUseNamespaces', () => {
  const mockNamespaces: NamespaceKind[] = [{ name: 'ns-1' }, { name: 'ns-2' }];

  it('should fetch and return namespaces from the given getNamespaces function', async () => {
    const getNamespaces = jest.fn().mockReturnValue(() => Promise.resolve(mockNamespaces));
    const useNamespaces = createUseNamespaces(getNamespaces);

    const { result } = renderHook(() => useNamespaces());

    await waitFor(() => expect(result.current[1]).toBe(true));

    expect(result.current[0]).toEqual(mockNamespaces);
    expect(result.current[2]).toBeUndefined();
    expect(getNamespaces).toHaveBeenCalledWith('');
  });

  it('should surface a fetch error', async () => {
    const fetchError = new Error('failed to fetch namespaces');
    const getNamespaces = jest.fn().mockReturnValue(() => Promise.reject(fetchError));
    const useNamespaces = createUseNamespaces(getNamespaces);

    const { result } = renderHook(() => useNamespaces());

    await waitFor(() => expect(result.current[2]).toBe(fetchError));

    expect(result.current[0]).toEqual([]);
    expect(result.current[1]).toBe(false);
  });

  it('should create independent hooks for different getNamespaces functions', async () => {
    const getNamespacesA = jest.fn().mockReturnValue(() => Promise.resolve([{ name: 'a' }]));
    const getNamespacesB = jest.fn().mockReturnValue(() => Promise.resolve([{ name: 'b' }]));
    const useNamespacesA = createUseNamespaces(getNamespacesA);
    const useNamespacesB = createUseNamespaces(getNamespacesB);

    const { result: resultA } = renderHook(() => useNamespacesA());
    const { result: resultB } = renderHook(() => useNamespacesB());

    await waitFor(() => expect(resultA.current[1]).toBe(true));
    await waitFor(() => expect(resultB.current[1]).toBe(true));

    expect(resultA.current[0]).toEqual([{ name: 'a' }]);
    expect(resultB.current[0]).toEqual([{ name: 'b' }]);
  });
});
