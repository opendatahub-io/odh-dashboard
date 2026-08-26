import { renderHook } from '@testing-library/react';
import { useNamespaceSelector } from 'mod-arch-core';
import { useNamespaceSelectorWithPersistence } from '../useNamespaceSelectorWithPersistence';

jest.mock('mod-arch-core', () => ({
  useNamespaceSelector: jest.fn(),
}));

const useNamespaceSelectorMock = jest.mocked(useNamespaceSelector);

describe('useNamespaceSelectorWithPersistence', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should call useNamespaceSelector with storeLastNamespace enabled', () => {
    const mockResult = {
      namespaces: [],
      preferredNamespace: undefined,
      updatePreferredNamespace: jest.fn(),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;
    useNamespaceSelectorMock.mockReturnValue(mockResult);

    const { result } = renderHook(() => useNamespaceSelectorWithPersistence());

    expect(useNamespaceSelectorMock).toHaveBeenCalledWith({ storeLastNamespace: true });
    expect(result.current).toBe(mockResult);
  });
});
