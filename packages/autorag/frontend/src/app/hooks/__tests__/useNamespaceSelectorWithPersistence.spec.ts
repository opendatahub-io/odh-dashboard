import { renderHook } from '@testing-library/react';
import { useNamespaceSelector } from 'mod-arch-core';
import { useIsAreaAvailable } from '@odh-dashboard/plugin-core/areas';
import {
  useWorkingProject,
  WorkingProjectStatusValue,
} from '@odh-dashboard/ui-core/context/WorkingProjectContext';
import { useNamespaceSelectorWithPersistence } from '~/app/hooks/useNamespaceSelectorWithPersistence';

jest.mock('mod-arch-core', () => ({ useNamespaceSelector: jest.fn() }));
jest.mock('@odh-dashboard/plugin-core/areas', () => ({
  ...jest.requireActual('@odh-dashboard/plugin-core/areas'),
  useIsAreaAvailable: jest.fn(),
}));
jest.mock('@odh-dashboard/ui-core/context/WorkingProjectContext', () => ({
  ...jest.requireActual('@odh-dashboard/ui-core/context/WorkingProjectContext'),
  useWorkingProject: jest.fn(),
}));

describe('useNamespaceSelectorWithPersistence', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest
      .mocked(useIsAreaAvailable)
      .mockReturnValue({ status: true } as ReturnType<typeof useIsAreaAvailable>);
    jest.mocked(useNamespaceSelector).mockReturnValue({
      namespaces: [{ name: 'legacy-project', displayName: 'Legacy project' }],
      namespacesLoaded: false,
      namespacesLoadError: new Error('Cannot list namespaces'),
      initializationError: new Error('Legacy initialization failed'),
      preferredNamespace: undefined,
      updatePreferredNamespace: jest.fn(),
      clearStoredNamespace: jest.fn(),
    });
    jest.mocked(useWorkingProject).mockReturnValue({
      status: WorkingProjectStatusValue.ListingUnavailable,
      projects: [{ name: 'validated-project', displayName: 'Validated project' }],
      activeProject: { name: 'validated-project' },
      selectProject: jest.fn(),
    });
  });

  it('should use host-validated identities despite a restricted legacy namespace list', () => {
    const { result, rerender } = renderHook(() => useNamespaceSelectorWithPersistence());
    expect(result.current.namespaces).toEqual([
      { name: 'validated-project', displayName: 'Validated project' },
    ]);
    expect(result.current.preferredNamespace?.name).toBe('validated-project');
    expect(result.current.namespacesLoaded).toBe(true);
    expect(result.current.namespacesLoadError).toBeUndefined();
    expect(result.current.initializationError).toBeUndefined();
    expect(useNamespaceSelector).toHaveBeenLastCalledWith({ storeLastNamespace: false });
    const { namespaces } = result.current;
    rerender();
    expect(result.current.namespaces).toBe(namespaces);
  });

  it('should reflect delayed host discovery and preserve projects without display names', () => {
    const ready = useWorkingProject();
    jest.mocked(useWorkingProject).mockReturnValue({
      ...ready,
      status: WorkingProjectStatusValue.Loading,
      projects: [],
      activeProject: null,
    });
    const { result, rerender } = renderHook(() => useNamespaceSelectorWithPersistence());
    expect(result.current.namespacesLoaded).toBe(false);
    expect(result.current.namespaces).toEqual([]);
    jest
      .mocked(useWorkingProject)
      .mockReturnValue({ ...ready, projects: [{ name: 'validated-project' }] });
    rerender();
    expect(result.current.namespacesLoaded).toBe(true);
    expect(result.current.namespaces).toEqual([
      { name: 'validated-project', displayName: 'validated-project' },
    ]);
  });

  it('should switch namespace sources and persistence policy when the flag changes', () => {
    const { result, rerender } = renderHook(() => useNamespaceSelectorWithPersistence());
    expect(result.current.namespaces[0].name).toBe('validated-project');
    expect(useNamespaceSelector).toHaveBeenLastCalledWith({ storeLastNamespace: false });

    jest
      .mocked(useIsAreaAvailable)
      .mockReturnValue({ status: false } as ReturnType<typeof useIsAreaAvailable>);
    rerender();

    expect(result.current.namespaces[0].name).toBe('legacy-project');
    expect(result.current.namespacesLoadError?.message).toBe('Cannot list namespaces');
    expect(useNamespaceSelector).toHaveBeenLastCalledWith({ storeLastNamespace: true });
  });

  it('should return the unchanged legacy contract when UPS is disabled', () => {
    jest
      .mocked(useIsAreaAvailable)
      .mockReturnValue({ status: false } as ReturnType<typeof useIsAreaAvailable>);
    const legacy = jest.mocked(useNamespaceSelector)();
    const { result } = renderHook(() => useNamespaceSelectorWithPersistence());
    expect(result.current).toBe(legacy);
    expect(useNamespaceSelector).toHaveBeenLastCalledWith({ storeLastNamespace: true });
  });
});
