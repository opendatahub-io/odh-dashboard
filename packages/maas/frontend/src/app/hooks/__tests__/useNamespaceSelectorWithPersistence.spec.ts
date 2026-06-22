import { useNamespaceSelector } from 'mod-arch-core';
import { useNamespaceSelectorWithPersistence } from '~/app/hooks/useNamespaceSelectorWithPersistence';
import { testHook } from '~/__tests__/unit/testUtils/hooks';

jest.mock('mod-arch-core', () => ({
  useNamespaceSelector: jest.fn(),
}));

const mockUseNamespaceSelector = jest.mocked(useNamespaceSelector);

describe('useNamespaceSelectorWithPersistence', () => {
  const mockReturn = {
    namespaces: [{ name: 'ns-1' }],
    namespacesLoaded: true,
    preferredNamespace: { name: 'ns-1' },
    updatePreferredNamespace: jest.fn(),
    clearStoredNamespace: jest.fn(),
    namespacesLoadError: undefined,
    initializationError: undefined,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseNamespaceSelector.mockReturnValue(mockReturn as ReturnType<typeof useNamespaceSelector>);
  });

  it('calls useNamespaceSelector with storeLastNamespace: true', () => {
    testHook(useNamespaceSelectorWithPersistence)();
    expect(mockUseNamespaceSelector).toHaveBeenCalledWith({ storeLastNamespace: true });
  });

  it('returns the result of useNamespaceSelector', () => {
    const renderResult = testHook(useNamespaceSelectorWithPersistence)();
    expect(renderResult.result.current).toBe(mockReturn);
  });
});
