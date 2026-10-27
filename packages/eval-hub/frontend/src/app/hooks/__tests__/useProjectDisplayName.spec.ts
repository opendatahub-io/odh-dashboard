import { useNamespaceSelectorWithPersistence } from '~/app/hooks/useNamespaceSelectorWithPersistence';
import { useProjectDisplayName } from '~/app/hooks/useProjectDisplayName';
import { testHook } from '~/__tests__/unit/testUtils/hooks';

jest.mock('~/app/hooks/useNamespaceSelectorWithPersistence', () => ({
  useNamespaceSelectorWithPersistence: jest.fn(),
}));

const mockUseNamespaceSelectorWithPersistence = jest.mocked(useNamespaceSelectorWithPersistence);

describe('useProjectDisplayName', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseNamespaceSelectorWithPersistence.mockReturnValue({
      namespaces: [{ name: 'ns-1', displayName: 'My Project' }, { name: 'ns-2' }],
    } as ReturnType<typeof useNamespaceSelectorWithPersistence>);
  });

  it('should return the display name when the namespace is found', () => {
    const renderResult = testHook(useProjectDisplayName)('ns-1');
    expect(renderResult.result.current).toBe('My Project');
  });

  it('should return the raw namespace when no display name is set', () => {
    const renderResult = testHook(useProjectDisplayName)('ns-2');
    expect(renderResult.result.current).toBe('ns-2');
  });

  it('should return the raw namespace when the namespace is not found', () => {
    const renderResult = testHook(useProjectDisplayName)('unknown-ns');
    expect(renderResult.result.current).toBe('unknown-ns');
  });

  it('should return an empty string when namespace is undefined', () => {
    const renderResult = testHook(useProjectDisplayName)();
    expect(renderResult.result.current).toBe('');
  });
});
