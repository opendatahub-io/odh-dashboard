import * as React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { ProjectsContext } from '@odh-dashboard/ui-core/context/ProjectsContext';
import { useHostApiCore } from '@odh-dashboard/plugin-core/host-api';
import { ProjectKind } from '@odh-dashboard/k8s-core';
import useAccessibleNamespaces from '../useAccessibleNamespaces';

jest.mock('@odh-dashboard/plugin-core/host-api', () => ({
  useHostApiCore: jest.fn(),
}));

jest.mock('@odh-dashboard/ui-core/hooks/useFetch', () => {
  const actual = jest.requireActual('@odh-dashboard/ui-core/hooks/useFetch');
  return actual;
});

const mockUseHostApiCore = jest.mocked(useHostApiCore);
const checkAccessMock = jest.fn();

const makeProject = (name: string, displayName?: string): ProjectKind =>
  ({
    metadata: {
      name,
      annotations: displayName ? { 'openshift.io/display-name': displayName } : {},
    },
  } as unknown as ProjectKind);

const createWrapper = (projects: ProjectKind[], loaded = true) => {
  const contextValue = {
    projects,
    loaded,
    refresh: jest.fn(),
  } as unknown as React.ContextType<typeof ProjectsContext>;

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <ProjectsContext.Provider value={contextValue}>{children}</ProjectsContext.Provider>
  );
  Wrapper.displayName = 'ProjectsContextWrapper';
  return Wrapper;
};

describe('useAccessibleNamespaces', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseHostApiCore.mockReturnValue({ checkAccess: checkAccessMock } as unknown as ReturnType<
      typeof useHostApiCore
    >);
  });

  it('should return namespaces where user has both create and get access', async () => {
    checkAccessMock.mockImplementation(async ({ namespace }) => namespace === 'allowed-ns');

    const projects = [makeProject('allowed-ns', 'Allowed'), makeProject('denied-ns', 'Denied')];
    const { result } = renderHook(() => useAccessibleNamespaces(), {
      wrapper: createWrapper(projects),
    });

    await waitFor(() => {
      expect(result.current.loaded).toBe(true);
    });

    expect(result.current.namespaces).toEqual([{ name: 'allowed-ns', displayName: 'Allowed' }]);
    expect(result.current.error).toBeUndefined();
  });

  it('should exclude namespaces where user has create but not get access', async () => {
    checkAccessMock.mockImplementation(async ({ namespace, verb }) => {
      if (namespace === 'create-only-ns') {
        return verb === 'create';
      }
      return true;
    });

    const projects = [
      makeProject('create-only-ns', 'Create Only'),
      makeProject('full-access-ns', 'Full Access'),
    ];
    const { result } = renderHook(() => useAccessibleNamespaces(), {
      wrapper: createWrapper(projects),
    });

    await waitFor(() => {
      expect(result.current.loaded).toBe(true);
    });

    expect(result.current.namespaces).toEqual([
      { name: 'full-access-ns', displayName: 'Full Access' },
    ]);
  });

  it('should use namespace name as displayName when annotation is missing', async () => {
    checkAccessMock.mockResolvedValue(true);

    const projects = [makeProject('my-ns')];
    const { result } = renderHook(() => useAccessibleNamespaces(), {
      wrapper: createWrapper(projects),
    });

    await waitFor(() => {
      expect(result.current.loaded).toBe(true);
    });

    expect(result.current.namespaces).toEqual([{ name: 'my-ns', displayName: 'my-ns' }]);
  });

  it('should treat checkAccess rejection as denied', async () => {
    checkAccessMock.mockRejectedValue(new Error('RBAC error'));

    const projects = [makeProject('ns-1')];
    const { result } = renderHook(() => useAccessibleNamespaces(), {
      wrapper: createWrapper(projects),
    });

    await waitFor(() => {
      expect(result.current.loaded).toBe(true);
    });

    expect(result.current.namespaces).toEqual([]);
    expect(result.current.error).toBeUndefined();
  });

  it('should not fetch when projects are not loaded', () => {
    const { result } = renderHook(() => useAccessibleNamespaces(), {
      wrapper: createWrapper([], false),
    });

    expect(result.current.loaded).toBe(false);
    expect(result.current.namespaces).toEqual([]);
    expect(checkAccessMock).not.toHaveBeenCalled();
  });

  it('should return empty array when no projects exist', async () => {
    const { result } = renderHook(() => useAccessibleNamespaces(), {
      wrapper: createWrapper([]),
    });

    await waitFor(() => {
      expect(result.current.loaded).toBe(true);
    });

    expect(result.current.namespaces).toEqual([]);
  });

  it('should preserve data across rerenders when dependencies are unchanged', async () => {
    checkAccessMock.mockResolvedValue(true);
    const projects = [makeProject('ns-1')];

    const { result, rerender } = renderHook(() => useAccessibleNamespaces(), {
      wrapper: createWrapper(projects),
    });

    await waitFor(() => {
      expect(result.current.loaded).toBe(true);
    });

    expect(result.current.namespaces).toHaveLength(1);

    rerender();

    expect(result.current.loaded).toBe(true);
    expect(result.current.namespaces).toHaveLength(1);
  });
});
