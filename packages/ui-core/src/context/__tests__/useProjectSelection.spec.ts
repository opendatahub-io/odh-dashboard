import { act, waitFor } from '@testing-library/react';
import type { ProjectSelectionCandidate } from '@odh-dashboard/foundation';
import { renderHook } from '@odh-dashboard/jest-config/hooks';
import type { ProjectSelectionStorage } from '../projectSelectionStorage';
import { useProjectSelection } from '../useProjectSelection';

type TestProject = { name: string; displayName?: string; ai?: boolean };

const first: TestProject = { name: 'first' };
const second: TestProject = { name: 'second' };
const ai: TestProject = { name: 'ai', ai: true };
const accessors = {
  getName: (project: TestProject) => project.name,
  getDisplayName: (project: TestProject) => project.displayName,
};
const isAiProject = (project: TestProject): boolean => project.ai === true;

const createStorage = (initial: string | null = null) => {
  let listener: ((projectName: string | null) => void) | undefined;
  const storage: ProjectSelectionStorage = {
    read: jest.fn(() => initial),
    write: jest.fn(),
    remove: jest.fn(),
    subscribe: jest.fn((nextListener) => {
      listener = nextListener;
      return () => {
        listener = undefined;
      };
    }),
  };
  return { storage, emit: (projectName: string | null) => listener?.(projectName) };
};

const useSelection = (
  projects: readonly TestProject[] | null,
  storage: ProjectSelectionStorage,
  routeCandidate: ProjectSelectionCandidate = { status: 'absent' },
  providerValidatedProjects: readonly TestProject[] = [],
  validateCandidate?: (name: string, signal: AbortSignal) => Promise<TestProject | null>,
) =>
  useProjectSelection({
    projects,
    providerValidatedProjects,
    routeCandidate,
    accessors,
    isAiProject,
    validateCandidate,
    storage,
  });

describe('useProjectSelection', () => {
  it('should select and persist a route winner over storage', async () => {
    const { storage } = createStorage(second.name);
    const renderResult = renderHook(() =>
      useSelection([first, second], storage, { status: 'present', name: first.name }),
    );
    const { result } = renderResult;

    await waitFor(() => expect(result.current.activeProject).toBe(first));
    expect(storage.write).toHaveBeenCalledWith(first.name);
    expect(renderResult).hookToHaveUpdateCount(2);
  });

  it('should not activate or persist a fallback for an invalid route', () => {
    const { storage } = createStorage(second.name);
    const { result } = renderHook(() =>
      useSelection([first, ai], storage, { status: 'present', name: 'deleted' }),
    );

    expect(result.current.activeProject).toBeNull();
    expect(storage.write).not.toHaveBeenCalled();
  });

  it('should rerun route precedence for browser navigation changes', async () => {
    const { storage } = createStorage();
    const renderResult = renderHook(
      ({ routeCandidate }: { routeCandidate: ProjectSelectionCandidate }) =>
        useSelection([first, second], storage, routeCandidate),
      {
        initialProps: {
          routeCandidate: { status: 'present', name: first.name } as ProjectSelectionCandidate,
        },
      },
    );
    const { result, rerender } = renderResult;
    await waitFor(() => expect(result.current.activeProject).toBe(first));

    rerender({ routeCandidate: { status: 'present', name: second.name } });

    await waitFor(() => expect(result.current.activeProject).toBe(second));
    rerender({ routeCandidate: { status: 'present', name: first.name } });
    await waitFor(() => expect(result.current.activeProject).toBe(first));
    expect(storage.write).toHaveBeenLastCalledWith(first.name);
    expect(renderResult).hookToHaveUpdateCount(6);
  });

  it('should expose the same ordered collection used by fallback resolution', async () => {
    const { storage } = createStorage();
    const project10 = { name: 'project-10', displayName: 'Project 10' };
    const project2 = { name: 'project-2', displayName: 'project 2' };
    const renderResult = renderHook(() => useSelection([project10, project2], storage));
    const { result } = renderResult;

    await waitFor(() => expect(result.current.activeProject).toBe(project2));
    expect(result.current.orderedProjects).toEqual([project2, project10]);
    expect(renderResult).hookToHaveUpdateCount(2);
  });

  it('should rerun resolution when the active project is removed', async () => {
    const { storage } = createStorage(first.name);
    const renderResult = renderHook(({ projects }) => useSelection(projects, storage), {
      initialProps: { projects: [first, ai] as TestProject[] },
    });
    const { result, rerender } = renderResult;
    await waitFor(() => expect(result.current.activeProject).toBe(first));

    rerender({ projects: [ai] });

    await waitFor(() => expect(result.current.activeProject).toBe(ai));
    expect(storage.write).not.toHaveBeenCalled();
    expect(renderResult).hookToHaveUpdateCount(4);
  });

  it('should ignore an explicit null selection while selectable projects exist', async () => {
    const { storage } = createStorage(first.name);
    const renderResult = renderHook(() => useSelection([first], storage));
    const { result } = renderResult;
    await waitFor(() => expect(result.current.activeProject).toBe(first));

    act(() => result.current.selectProject(null));

    expect(result.current.activeProject).toBe(first);
    expect(storage.remove).not.toHaveBeenCalled();
    expect(storage.write).not.toHaveBeenCalled();
    expect(renderResult).hookToHaveUpdateCount(2);
  });

  it('should use the canonical project when equivalent objects are recreated', async () => {
    const { storage } = createStorage(first.name);
    const renderResult = renderHook(({ projects }) => useSelection(projects, storage), {
      initialProps: { projects: [first] as TestProject[] },
    });
    const { result, rerender } = renderResult;
    await waitFor(() => expect(result.current.activeProject).toBe(first));
    const refreshedFirst = { ...first };

    rerender({ projects: [refreshedFirst] });

    expect(result.current.activeProject).toBe(refreshedFirst);
    expect(renderResult).hookToHaveUpdateCount(3);
  });

  it('should keep returned references stable on an unrelated rerender', async () => {
    const { storage } = createStorage(first.name);
    const projects = [first];
    const renderResult = renderHook(
      ({ marker }) => {
        void marker;
        return useProjectSelection({ projects, accessors, isAiProject, storage });
      },
      { initialProps: { marker: 0 } },
    );
    await waitFor(() => expect(renderResult.result.current.activeProject).toBe(first));
    const { orderedProjects, selectProject } = renderResult.result.current;

    renderResult.rerender({ marker: 1 });

    expect(renderResult.result.current.orderedProjects).toBe(orderedProjects);
    expect(renderResult.result.current.selectProject).toBe(selectProject);
  });

  it('should use the provider-known identity for an explicit selection', async () => {
    const { storage } = createStorage(first.name);
    const renderResult = renderHook(() => useSelection([first, second], storage));
    const { result } = renderResult;
    await waitFor(() => expect(result.current.activeProject).toBe(first));

    act(() => result.current.selectProject({ ...second, displayName: 'Stale display name' }));

    await waitFor(() => expect(result.current.activeProject).toBe(second));
    expect(storage.write).toHaveBeenCalledWith(second.name);
    expect(renderResult).hookToHaveUpdateCount(3);
  });

  it('should apply a valid cross-tab update without writing it back', async () => {
    const { storage, emit } = createStorage(first.name);
    const renderResult = renderHook(
      ({ routeCandidate }: { routeCandidate: ProjectSelectionCandidate }) =>
        useSelection([first, second], storage, routeCandidate),
      { initialProps: { routeCandidate: { status: 'absent' } as ProjectSelectionCandidate } },
    );
    const { result, rerender } = renderResult;
    await waitFor(() => expect(result.current.activeProject).toBe(first));

    act(() => emit(second.name));

    await waitFor(() => expect(result.current.activeProject).toBe(second));
    rerender({ routeCandidate: { status: 'present', name: second.name } });
    await waitFor(() => expect(result.current.activeProject).toBe(second));
    expect(storage.write).not.toHaveBeenCalled();
    expect(renderResult).hookToHaveUpdateCount(6);
  });

  it('should ignore a stale or inaccessible cross-tab value', async () => {
    const { storage, emit } = createStorage(first.name);
    const renderResult = renderHook(() => useSelection([first], storage));
    const { result } = renderResult;
    await waitFor(() => expect(result.current.activeProject).toBe(first));

    act(() => emit('deleted'));

    expect(result.current.activeProject).toBe(first);
    expect(storage.write).not.toHaveBeenCalled();
    expect(renderResult).hookToHaveUpdateCount(2);
  });

  it.each([
    ['route', null, { status: 'present', name: second.name } as ProjectSelectionCandidate],
    ['storage', second.name, { status: 'absent' } as ProjectSelectionCandidate],
  ])(
    'should defer an unavailable-list %s candidate until validation succeeds',
    async (_, initial, routeCandidate) => {
      const { storage } = createStorage(initial);
      let finishValidation: ((project: TestProject) => void) | undefined;
      const validateCandidate = jest.fn(
        () =>
          new Promise<TestProject | null>((resolve) => {
            finishValidation = resolve;
          }),
      );
      const renderResult = renderHook(() =>
        useSelection(null, storage, routeCandidate, [], validateCandidate),
      );
      const { result } = renderResult;

      expect(result.current.activeProject).toBeNull();

      act(() => finishValidation?.(second));

      await waitFor(() => expect(result.current.activeProject).toBe(second));
      if (routeCandidate.status === 'present') {
        expect(storage.write).toHaveBeenCalledWith(second.name);
      } else {
        expect(storage.write).not.toHaveBeenCalled();
      }
      expect(renderResult).hookToHaveUpdateCount(3);
    },
  );

  it('should preserve the current project when unavailable-list validation fails', async () => {
    const { storage } = createStorage(first.name);
    const validateCandidate = jest.fn(() => Promise.reject(new Error('access denied')));
    const renderResult = renderHook(
      ({ routeCandidate }: { routeCandidate: ProjectSelectionCandidate }) =>
        useSelection(null, storage, routeCandidate, [first], validateCandidate),
      { initialProps: { routeCandidate: { status: 'absent' } as ProjectSelectionCandidate } },
    );
    const { result, rerender } = renderResult;
    await waitFor(() => expect(result.current.activeProject).toBe(first));

    rerender({ routeCandidate: { status: 'present', name: second.name } });

    await waitFor(() => expect(validateCandidate).toHaveBeenCalled());
    expect(result.current.activeProject).toBe(first);
    expect(storage.write).not.toHaveBeenCalled();
    expect(renderResult).hookToHaveUpdateCount(3);
  });

  it('should validate an unavailable-list cross-tab value without a feedback write', async () => {
    const { storage, emit } = createStorage(first.name);
    const validateCandidate = jest.fn((name: string) =>
      Promise.resolve(name === second.name ? second : null),
    );
    const renderResult = renderHook(() =>
      useSelection(null, storage, { status: 'absent' }, [first], validateCandidate),
    );
    const { result } = renderResult;
    await waitFor(() => expect(result.current.activeProject).toBe(first));

    act(() => emit(second.name));

    await waitFor(() => expect(result.current.activeProject).toBe(second));
    act(() => emit('inaccessible'));
    await waitFor(() =>
      expect(validateCandidate).toHaveBeenCalledWith('inaccessible', expect.any(AbortSignal)),
    );
    expect(result.current.activeProject).toBe(second);
    expect(storage.write).not.toHaveBeenCalled();
    expect(renderResult).hookToHaveUpdateCount(7);
  });

  it('should preserve a valid external selection when later external validation fails', async () => {
    const { storage, emit } = createStorage();
    const validateCandidate = jest.fn((name: string) =>
      Promise.resolve(name === second.name ? second : null),
    );
    const renderResult = renderHook(() =>
      useSelection(
        null,
        storage,
        { status: 'present', name: first.name },
        [first],
        validateCandidate,
      ),
    );
    const { result } = renderResult;
    await waitFor(() => expect(result.current.activeProject).toBe(first));

    act(() => emit(second.name));
    await waitFor(() => expect(result.current.activeProject).toBe(second));
    act(() => emit('inaccessible'));

    await waitFor(() => expect(validateCandidate).toHaveBeenCalledTimes(2));
    expect(result.current.activeProject).toBe(second);
    expect(storage.write).toHaveBeenCalledTimes(1);
    expect(storage.write).toHaveBeenCalledWith(first.name);
  });

  it('should not reuse a validated candidate excluded by a later authoritative list', async () => {
    const { storage } = createStorage();
    const validatedFirst = { ...first, displayName: 'Validated first' };
    const providerFirst = { ...first, displayName: 'Provider first' };
    const validateCandidate = jest
      .fn<Promise<TestProject | null>, [string, AbortSignal]>()
      .mockResolvedValueOnce(validatedFirst)
      .mockImplementationOnce(
        () =>
          new Promise(() => {
            // Remain pending so a stale cached candidate cannot be replaced by validation.
          }),
      );
    const renderResult = renderHook(
      ({ projects, providerValidatedProjects }) =>
        useSelection(
          projects,
          storage,
          { status: 'present', name: first.name },
          providerValidatedProjects,
          validateCandidate,
        ),
      {
        initialProps: {
          projects: null as TestProject[] | null,
          providerValidatedProjects: [] as TestProject[],
        },
      },
    );
    const { result, rerender } = renderResult;
    await waitFor(() => expect(result.current.activeProject).toBe(validatedFirst));

    rerender({ projects: null, providerValidatedProjects: [providerFirst] });
    expect(result.current.activeProject).toBe(providerFirst);

    rerender({ projects: [second], providerValidatedProjects: [] });
    await waitFor(() => expect(result.current.activeProject).toBeNull());
    rerender({ projects: null, providerValidatedProjects: [second] });

    await waitFor(() => expect(validateCandidate).toHaveBeenCalledTimes(2));
    expect(result.current.activeProject).toBeNull();
  });

  it('should accept a pending cross-tab value when the list arrives without writing it back', async () => {
    const { storage, emit } = createStorage(first.name);
    const validateCandidate = jest.fn(
      () =>
        new Promise<TestProject | null>(() => {
          // Remains pending until the provider list becomes available.
        }),
    );
    const renderResult = renderHook(
      ({ projects, routeCandidate }) =>
        useSelection(projects, storage, routeCandidate, [first], validateCandidate),
      {
        initialProps: {
          projects: null as TestProject[] | null,
          routeCandidate: { status: 'absent' } as ProjectSelectionCandidate,
        },
      },
    );
    const { result, rerender } = renderResult;
    await waitFor(() => expect(result.current.activeProject).toBe(first));

    act(() => emit(second.name));
    await waitFor(() => expect(validateCandidate).toHaveBeenCalled());
    rerender({
      projects: [first, second],
      routeCandidate: { status: 'absent' },
    });
    await waitFor(() => expect(result.current.activeProject).toBe(second));
    expect(storage.write).not.toHaveBeenCalled();
    expect(renderResult).hookToHaveUpdateCount(5);
  });

  it('should keep a cross-tab value pending without a validator until the list arrives', async () => {
    const { storage, emit } = createStorage(first.name);
    const renderResult = renderHook(({ projects }) => useSelection(projects, storage), {
      initialProps: { projects: null as TestProject[] | null },
    });
    const { result, rerender } = renderResult;
    expect(result.current.activeProject).toBeNull();

    act(() => emit(second.name));
    rerender({ projects: [first, second] });

    await waitFor(() => expect(result.current.activeProject).toBe(second));
    expect(storage.write).not.toHaveBeenCalled();
  });

  it('should clear a pending cross-tab value when storage removes the key', async () => {
    const { storage, emit } = createStorage();
    let finishValidation: ((project: TestProject) => void) | undefined;
    const validateCandidate = jest.fn(
      () =>
        new Promise<TestProject | null>((resolve) => {
          finishValidation = resolve;
        }),
    );
    const renderResult = renderHook(() =>
      useSelection(null, storage, { status: 'absent' }, [], validateCandidate),
    );

    act(() => emit(second.name));
    await waitFor(() => expect(validateCandidate).toHaveBeenCalled());
    act(() => emit(null));
    await act(async () => finishValidation?.(second));
    expect(renderResult.result.current.activeProject).toBeNull();
    expect(storage.write).not.toHaveBeenCalled();
  });
});
