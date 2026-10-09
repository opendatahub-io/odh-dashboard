import {
  persistResolvedWorkingProject,
  resolvePersistedWorkingProject,
} from '../resolvePersistedWorkingProject';
import { PREFERRED_NAMESPACE_STORAGE_KEY } from '../getStoredPreferredProject';

const first = { name: 'ai-2', displayName: 'AI 2' };
const second = { name: 'team-10', displayName: 'Team 10' };
const projects = [second, first];
const listed = { status: 'listed' as const, projects };

describe('resolvePersistedWorkingProject', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    localStorage.clear();
  });

  it('should defer reconciling a valid route winner until the host commits it', () => {
    localStorage.setItem(PREFERRED_NAMESPACE_STORAGE_KEY, JSON.stringify(first.name));
    const setItem = jest.spyOn(Storage.prototype, 'setItem');
    const result = resolvePersistedWorkingProject({
      storage: localStorage,
      list: listed,
      route: { kind: 'project', name: second.name },
    });
    expect(result.activeProject).toBe(second);
    expect(setItem).not.toHaveBeenCalled();
    expect(localStorage.getItem(PREFERRED_NAMESPACE_STORAGE_KEY)).toBe(JSON.stringify(first.name));
    expect(persistResolvedWorkingProject(localStorage, result, listed)).toBe(true);
    expect(localStorage.getItem(PREFERRED_NAMESPACE_STORAGE_KEY)).toBe(JSON.stringify(second.name));
  });

  it('should not use storage to choose a project when the route is present or invalid', () => {
    const storage = {
      getItem: jest.fn(() => {
        throw new Error('storage read blocked');
      }),
      setItem: jest.fn(),
    };
    expect(
      resolvePersistedWorkingProject({
        storage,
        list: listed,
        route: { kind: 'project', name: first.name },
      }).activeProject,
    ).toBe(first);
    expect(
      resolvePersistedWorkingProject({
        storage,
        list: listed,
        route: { kind: 'invalid' },
      }).activeProject,
    ).toBeNull();
    expect(storage.getItem).not.toHaveBeenCalled();
    expect(storage.setItem).not.toHaveBeenCalled();
  });

  it('should restore legacy raw storage only when the route does not specify a project', () => {
    localStorage.setItem(PREFERRED_NAMESPACE_STORAGE_KEY, second.name);
    const result = resolvePersistedWorkingProject({
      storage: localStorage,
      list: listed,
      route: null,
    });
    expect(result.activeProject).toBe(second);
  });

  it('should select the first listed project when storage is stale and persist only after commit', () => {
    localStorage.setItem(PREFERRED_NAMESPACE_STORAGE_KEY, 'deleted');
    const result = resolvePersistedWorkingProject({
      storage: localStorage,
      list: listed,
      route: null,
    });
    expect(result.activeProject).toBe(first);
    expect(result.activeProject).toBe(result.orderedProjects[0]);
    expect(localStorage.getItem(PREFERRED_NAMESPACE_STORAGE_KEY)).toBe('deleted');
    expect(persistResolvedWorkingProject(localStorage, result, listed)).toBe(true);
    expect(localStorage.getItem(PREFERRED_NAMESPACE_STORAGE_KEY)).toBe(JSON.stringify(first.name));
  });

  it('should prefer the first classified AI project when no stored or route project exists', () => {
    const result = resolvePersistedWorkingProject({
      storage: localStorage,
      list: {
        status: 'listed',
        projects: [{ name: 'team-a', displayName: 'Aardvark' }, first, second],
      },
      route: null,
      isAiProject: ({ name }) => name === first.name,
    });
    expect(result.orderedProjects[0].name).toBe('team-a');
    expect(result.activeProject).toBe(first);
  });

  it('should not persist an invalid deep link or overwrite a valid stored selection', () => {
    localStorage.setItem(PREFERRED_NAMESPACE_STORAGE_KEY, JSON.stringify(first.name));
    const result = resolvePersistedWorkingProject({
      storage: localStorage,
      list: listed,
      route: { kind: 'project', name: 'inaccessible' },
    });
    expect(result.activeProject).toBeNull();
    expect(result.orderedProjects).toHaveLength(projects.length);
    expect(persistResolvedWorkingProject(localStorage, result, listed)).toBe(false);
    expect(localStorage.getItem(PREFERRED_NAMESPACE_STORAGE_KEY)).toBe(JSON.stringify(first.name));
  });

  it('should not persist anything while loading or for a known empty list', () => {
    const storage = { getItem: jest.fn(() => null), setItem: jest.fn() };
    const loading = resolvePersistedWorkingProject({
      storage,
      list: { status: 'loading' },
      route: null,
    });
    const empty = resolvePersistedWorkingProject({
      storage,
      list: { status: 'listed', projects: [] },
      route: null,
    });
    expect(loading.activeProject).toBeNull();
    expect(empty.activeProject).toBeNull();
    expect(storage.setItem).not.toHaveBeenCalled();
  });

  it('should keep the resolved route selection when a post-commit storage write fails', () => {
    const storage = {
      getItem: jest.fn(() => null),
      setItem: jest.fn(() => {
        throw new Error('quota exceeded');
      }),
    };
    const result = resolvePersistedWorkingProject({
      storage,
      list: listed,
      route: { kind: 'project', name: second.name },
    });
    expect(result.activeProject).toBe(second);
    expect(storage.setItem).not.toHaveBeenCalled();
    expect(persistResolvedWorkingProject(storage, result, listed)).toBe(false);
    expect(storage.setItem).toHaveBeenCalledTimes(1);
  });

  it('should recover from removal and tolerate blocked storage', () => {
    const storage = {
      getItem: jest.fn(() => {
        throw new Error('blocked');
      }),
      setItem: jest.fn(),
    };
    const result = resolvePersistedWorkingProject({
      storage,
      list: { status: 'listed', projects: [second] },
      route: { kind: 'project', name: first.name },
      currentName: first.name,
    });
    expect(result.activeProject).toBe(second);
    expect(
      persistResolvedWorkingProject(storage, result, { status: 'listed', projects: [second] }),
    ).toBe(false);
    expect(storage.setItem).not.toHaveBeenCalled();
  });

  it('should retain a removed-route fallback across persisted resolutions until route reconciliation', () => {
    const storage = { getItem: jest.fn(() => null), setItem: jest.fn() };
    const remainingProjects = { status: 'listed' as const, projects: [second] };
    const firstResolution = resolvePersistedWorkingProject({
      storage,
      list: remainingProjects,
      route: { kind: 'project', name: first.name },
      currentName: first.name,
    });
    const secondResolution = resolvePersistedWorkingProject({
      storage,
      list: remainingProjects,
      route: { kind: 'project', name: first.name },
      currentName: firstResolution.activeProject?.name,
      removedRouteFallback: firstResolution.removedRouteFallback,
    });

    expect(firstResolution.activeProject).toBe(second);
    expect(secondResolution.activeProject).toBe(second);
    expect(secondResolution.removedRouteFallback).toEqual({
      routeName: first.name,
      projectName: second.name,
    });
    expect(storage.getItem).not.toHaveBeenCalled();
  });

  it('should refuse a result whose project has since disappeared from the provider set', () => {
    const storage = { getItem: jest.fn(() => null), setItem: jest.fn() };
    const result = resolvePersistedWorkingProject({
      storage,
      list: listed,
      route: { kind: 'project', name: first.name },
    });
    expect(
      persistResolvedWorkingProject(storage, result, { status: 'listed', projects: [second] }),
    ).toBe(false);
    expect(persistResolvedWorkingProject(storage, result, { status: 'loading' })).toBe(false);
    expect(storage.setItem).not.toHaveBeenCalled();
  });
});
