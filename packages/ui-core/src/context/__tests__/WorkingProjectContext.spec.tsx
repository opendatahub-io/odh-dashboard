import * as React from 'react';
import { act, render } from '@testing-library/react';
import { renderHook } from '@odh-dashboard/jest-config/hooks';
import {
  type ProjectIdentity,
  type WorkingProjectContextType,
  type WorkingProjectProviderProps,
  WorkingProjectProvider,
  WorkingProjectStatusValue,
  useWorkingProject,
} from '../WorkingProjectContext';

const firstProject: ProjectIdentity = { name: 'first-project', displayName: 'First project' };
const secondProject: ProjectIdentity = { name: 'second-project' };

const createWrapper = (
  projects: readonly ProjectIdentity[],
  activeProject: ProjectIdentity | null,
  onProjectChange: (project: ProjectIdentity) => void,
): React.FC<React.PropsWithChildren> =>
  function Wrapper({ children }) {
    return (
      <WorkingProjectProvider
        projects={projects}
        activeProject={activeProject}
        onProjectChange={onProjectChange}
      >
        {children}
      </WorkingProjectProvider>
    );
  };

type WorkingProjectConsumerProps = {
  onContextChange: (workingProject: WorkingProjectContextType) => void;
};

const WorkingProjectConsumer: React.FC<WorkingProjectConsumerProps> = ({ onContextChange }) => {
  onContextChange(useWorkingProject());
  return null;
};

describe('WorkingProjectProvider', () => {
  it('should create and resolve a pending project change through the registered handler', async () => {
    const onProjectChange = jest.fn();
    const onConfirm = jest.fn();
    let workingProject: WorkingProjectContextType | undefined;

    const Handler: React.FC = () => {
      const context = useWorkingProject();
      const register = context.registerProjectChangeHandler;
      React.useLayoutEffect(
        () =>
          register?.(() => ({
            description: 'Discard form progress',
            onConfirm,
          })),
        [register],
      );
      workingProject = context;
      return null;
    };

    render(
      <WorkingProjectProvider
        projects={[firstProject, secondProject]}
        activeProject={firstProject}
        onProjectChange={onProjectChange}
      >
        <Handler />
      </WorkingProjectProvider>,
    );

    act(() => {
      workingProject?.requestProjectChange?.(secondProject);
    });

    expect(workingProject?.pendingProjectChange).toBeDefined();
    expect(onProjectChange).not.toHaveBeenCalled();

    await act(async () => {
      await workingProject?.confirmProjectChange?.();
    });

    expect(onConfirm).toHaveBeenCalledWith();
    expect(workingProject?.pendingProjectChange).toBeUndefined();
  });

  it('should clear a pending project change without invoking the confirmation callback', () => {
    const onProjectChange = jest.fn();
    const onConfirm = jest.fn();
    let workingProject: WorkingProjectContextType | undefined;

    const Handler: React.FC = () => {
      const context = useWorkingProject();
      const register = context.registerProjectChangeHandler;
      React.useLayoutEffect(
        () =>
          register?.(() => ({
            description: 'Discard form progress',
            onConfirm,
          })),
        [register],
      );
      workingProject = context;
      return null;
    };

    render(
      <WorkingProjectProvider
        projects={[firstProject, secondProject]}
        activeProject={firstProject}
        onProjectChange={onProjectChange}
      >
        <Handler />
      </WorkingProjectProvider>,
    );

    act(() => workingProject?.requestProjectChange?.(secondProject));
    act(() => workingProject?.cancelProjectChange?.());

    expect(workingProject?.pendingProjectChange).toBeUndefined();
    expect(onConfirm).not.toHaveBeenCalled();
    expect(onProjectChange).not.toHaveBeenCalled();
  });

  it('should clear confirmation state when the confirmation callback throws synchronously', async () => {
    const onProjectChange = jest.fn();
    const onConfirm = jest.fn(() => {
      throw new Error('Confirmation failed');
    });
    let workingProject: WorkingProjectContextType | undefined;

    const Handler: React.FC = () => {
      const context = useWorkingProject();
      const register = context.registerProjectChangeHandler;
      React.useLayoutEffect(
        () =>
          register?.(() => ({
            description: 'Discard form progress',
            onConfirm,
          })),
        [register],
      );
      workingProject = context;
      return null;
    };

    render(
      <WorkingProjectProvider
        projects={[firstProject, secondProject]}
        activeProject={firstProject}
        onProjectChange={onProjectChange}
      >
        <Handler />
      </WorkingProjectProvider>,
    );

    act(() => workingProject?.requestProjectChange?.(secondProject));

    await act(async () => {
      await workingProject?.confirmProjectChange?.();
    });

    expect(workingProject?.pendingProjectChange).toBeDefined();
    expect(workingProject?.isConfirmingProjectChange).toBe(false);
    expect(workingProject?.projectChangeError?.message).toBe('Confirmation failed');
    expect(onProjectChange).not.toHaveBeenCalled();
  });

  it('should keep the pending change and expose an error when async confirmation fails', async () => {
    const onProjectChange = jest.fn();
    const onConfirm = jest
      .fn<Promise<void>, []>()
      .mockRejectedValueOnce(new Error('Unable to switch projects.'))
      .mockResolvedValueOnce(undefined);
    let workingProject: WorkingProjectContextType | undefined;

    const Handler: React.FC = () => {
      const context = useWorkingProject();
      const register = context.registerProjectChangeHandler;
      React.useLayoutEffect(
        () =>
          register?.(() => ({
            description: 'Discard form progress',
            onConfirm,
          })),
        [register],
      );
      workingProject = context;
      return null;
    };

    render(
      <WorkingProjectProvider
        projects={[firstProject, secondProject]}
        activeProject={firstProject}
        onProjectChange={onProjectChange}
      >
        <Handler />
      </WorkingProjectProvider>,
    );

    act(() => workingProject?.requestProjectChange?.(secondProject));

    await act(async () => {
      await workingProject?.confirmProjectChange?.();
    });

    expect(workingProject?.pendingProjectChange).toBeDefined();
    expect(workingProject?.projectChangeError?.message).toBe('Unable to switch projects.');
    expect(workingProject?.isConfirmingProjectChange).toBe(false);

    await act(async () => {
      await workingProject?.confirmProjectChange?.();
    });

    expect(onConfirm).toHaveBeenCalledTimes(2);
    expect(workingProject?.pendingProjectChange).toBeUndefined();
    expect(workingProject?.projectChangeError).toBeUndefined();
    expect(onProjectChange).not.toHaveBeenCalled();
  });

  it('should keep the project-change handler registered when a request becomes pending', () => {
    const onProjectChange = jest.fn();
    const onConfirm = jest.fn();
    const registerCount = jest.fn();
    let workingProject: WorkingProjectContextType | undefined;

    const Handler: React.FC = () => {
      const context = useWorkingProject();
      const register = context.registerProjectChangeHandler;
      React.useLayoutEffect(() => {
        registerCount();
        return register?.(() => ({
          description: 'Discard form progress',
          onConfirm,
        }));
      }, [register]);
      workingProject = context;
      return null;
    };

    render(
      <WorkingProjectProvider
        projects={[firstProject, secondProject]}
        activeProject={firstProject}
        onProjectChange={onProjectChange}
      >
        <Handler />
      </WorkingProjectProvider>,
    );

    expect(registerCount).toHaveBeenCalledTimes(1);

    act(() => workingProject?.requestProjectChange?.(secondProject));

    expect(registerCount).toHaveBeenCalledTimes(1);
    expect(workingProject?.pendingProjectChange).toBeDefined();
  });

  it('should ignore cleanup from an older handler after a newer handler replaces it', () => {
    const onProjectChange = jest.fn();
    const firstOnConfirm = jest.fn();
    const secondOnConfirm = jest.fn();
    let firstCleanup: (() => void) | undefined;
    let secondCleanup: (() => void) | undefined;
    let workingProject: WorkingProjectContextType | undefined;

    const Handlers: React.FC = () => {
      const context = useWorkingProject();
      React.useLayoutEffect(() => {
        firstCleanup = context.registerProjectChangeHandler?.(() => ({
          description: 'First handler',
          onConfirm: firstOnConfirm,
        }));
        secondCleanup = context.registerProjectChangeHandler?.(() => ({
          description: 'Second handler',
          onConfirm: secondOnConfirm,
        }));
      }, [context]);
      workingProject = context;
      return null;
    };

    render(
      <WorkingProjectProvider
        projects={[firstProject, secondProject]}
        activeProject={firstProject}
        onProjectChange={onProjectChange}
      >
        <Handlers />
      </WorkingProjectProvider>,
    );

    act(() => firstCleanup?.());
    act(() => workingProject?.requestProjectChange?.(secondProject));

    expect(workingProject?.pendingProjectChange?.description).toBe('Second handler');
    expect(secondCleanup).toBeDefined();
    expect(firstOnConfirm).not.toHaveBeenCalled();
  });

  it('should select immediately when no project-change handler is registered', () => {
    const onProjectChange = jest.fn();
    const renderResult = renderHook(() => useWorkingProject(), {
      wrapper: createWrapper([firstProject, secondProject], firstProject, onProjectChange),
    });

    act(() => renderResult.result.current.requestProjectChange?.(secondProject));

    expect(onProjectChange).toHaveBeenCalledWith(secondProject);
    expect(renderResult.result.current.pendingProjectChange).toBeUndefined();
  });

  it('should expose an empty, inactive selection without a provider', () => {
    const renderResult = renderHook(() => useWorkingProject());

    expect(renderResult.result.current.projects).toEqual([]);
    expect(renderResult.result.current.status).toBe('provider-absent');
    expect(renderResult.result.current.activeProject).toBeNull();
    act(() => {
      renderResult.result.current.selectProject(firstProject);
    });
    expect(renderResult).hookToHaveUpdateCount(1);
  });

  it.each([
    {
      name: 'a selected project',
      projects: [firstProject, secondProject],
      activeProject: firstProject,
      expectedStatus: WorkingProjectStatusValue.Listed,
      expectedActiveProject: firstProject,
    },
    {
      name: 'an empty project list',
      projects: [],
      activeProject: null,
      expectedStatus: WorkingProjectStatusValue.EmptyList,
      expectedActiveProject: null,
    },
    {
      name: 'projects without a selected project',
      projects: [firstProject, secondProject],
      activeProject: null,
      expectedStatus: WorkingProjectStatusValue.NoProjectSelected,
      expectedActiveProject: null,
    },
    {
      name: 'a project missing from the supplied list',
      projects: [firstProject, secondProject],
      activeProject: { name: 'removed-project' },
      expectedStatus: WorkingProjectStatusValue.NoProjectSelected,
      expectedActiveProject: null,
    },
  ])(
    'should resolve the correct status and active project for $name',
    ({ projects, activeProject, expectedStatus, expectedActiveProject }) => {
      const renderResult = renderHook(() => useWorkingProject(), {
        wrapper: createWrapper(projects, activeProject, jest.fn()),
      });

      expect(renderResult.result.current.projects).toBe(projects);
      expect(renderResult.result.current.status).toBe(expectedStatus);
      expect(renderResult.result.current.activeProject).toBe(expectedActiveProject);
      expect(renderResult).hookToHaveUpdateCount(1);
    },
  );

  it('should select a known project using the canonical provider identity', () => {
    const onProjectChange = jest.fn();
    const renderResult = renderHook(() => useWorkingProject(), {
      wrapper: createWrapper([firstProject, secondProject], firstProject, onProjectChange),
    });

    act(() => {
      renderResult.result.current.selectProject({
        name: secondProject.name,
        displayName: 'Ignored display name',
      });
    });

    expect(onProjectChange).toHaveBeenCalledWith(secondProject);
  });

  it.each([{ name: 'unknown-project' }, { name: '' }])(
    'should not select an unknown project identity',
    (project) => {
      const onProjectChange = jest.fn();
      const renderResult = renderHook(() => useWorkingProject(), {
        wrapper: createWrapper([firstProject], firstProject, onProjectChange),
      });

      act(() => {
        renderResult.result.current.selectProject(project);
      });

      expect(onProjectChange).not.toHaveBeenCalled();
    },
  );

  it('should use the latest project-change callback after a provider rerender', () => {
    const firstOnProjectChange = jest.fn();
    const secondOnProjectChange = jest.fn();
    let workingProject: WorkingProjectContextType | undefined;
    const onContextChange = (nextWorkingProject: WorkingProjectContextType) => {
      workingProject = nextWorkingProject;
    };
    const projects = [firstProject, secondProject];
    const renderProvider = (onProjectChange: (project: ProjectIdentity) => void) => (
      <WorkingProjectProvider
        projects={projects}
        activeProject={firstProject}
        onProjectChange={onProjectChange}
      >
        <WorkingProjectConsumer onContextChange={onContextChange} />
      </WorkingProjectProvider>
    );
    const { rerender } = render(renderProvider(firstOnProjectChange));

    rerender(renderProvider(secondOnProjectChange));

    if (!workingProject) {
      throw new Error('Working project context was not provided');
    }
    const latestWorkingProject = workingProject;
    act(() => {
      latestWorkingProject.selectProject(secondProject);
    });

    expect(firstOnProjectChange).not.toHaveBeenCalled();
    expect(secondOnProjectChange).toHaveBeenCalledWith(secondProject);
  });

  it('should use the latest projects and canonical active identity after a refresh', () => {
    const onProjectChange = jest.fn();
    const projects = [firstProject, secondProject];
    const refreshedFirstProject = { ...firstProject };
    const refreshedProjects = [refreshedFirstProject, { ...secondProject }];
    let workingProject: WorkingProjectContextType | undefined;
    const onContextChange = (nextWorkingProject: WorkingProjectContextType) => {
      workingProject = nextWorkingProject;
    };
    const renderProvider = (
      knownProjects: readonly ProjectIdentity[],
      activeProject: ProjectIdentity | null,
    ) => (
      <WorkingProjectProvider
        projects={knownProjects}
        activeProject={activeProject}
        onProjectChange={onProjectChange}
      >
        <WorkingProjectConsumer onContextChange={onContextChange} />
      </WorkingProjectProvider>
    );
    const { rerender } = render(renderProvider(projects, firstProject));

    rerender(renderProvider(refreshedProjects, { name: firstProject.name }));

    if (!workingProject) {
      throw new Error('Working project context was not provided');
    }
    const latestWorkingProject = workingProject;
    expect(latestWorkingProject.projects).toBe(refreshedProjects);
    expect(latestWorkingProject.activeProject).toBe(refreshedFirstProject);

    act(() => {
      latestWorkingProject.selectProject(secondProject);
    });
    expect(onProjectChange).toHaveBeenCalledWith(refreshedProjects[1]);
  });

  it.each<NonNullable<WorkingProjectProviderProps['status']>>([
    'loading',
    'project-source-error',
    'listing-unavailable',
  ])('should expose %s without mistaking it for a successful empty list', (status) => {
    const onProjectChange = jest.fn();
    let working: WorkingProjectContextType | undefined;
    render(
      <WorkingProjectProvider
        status={status}
        projects={[firstProject]}
        activeProject={firstProject}
        onProjectChange={onProjectChange}
      >
        <WorkingProjectConsumer
          onContextChange={(value) => {
            working = value;
          }}
        />
      </WorkingProjectProvider>,
    );
    expect(working?.status).toBe(status);
    if (status !== 'listing-unavailable') {
      expect(working?.projects).toEqual([]);
      expect(working?.activeProject).toBeNull();
      act(() => working?.selectProject(firstProject));
      expect(onProjectChange).not.toHaveBeenCalled();
    } else {
      // The host has explicitly supplied a validated identity despite listing being unavailable.
      expect(working?.projects).toEqual([firstProject]);
      expect(working?.activeProject).toBe(firstProject);
      act(() => working?.selectProject({ name: 'unvalidated' }));
      expect(onProjectChange).not.toHaveBeenCalled();
      act(() => working?.selectProject(firstProject));
      expect(onProjectChange).toHaveBeenCalledWith(firstProject);
    }
  });

  it('should keep listing-unavailable without validated identities distinct from empty-list', () => {
    let working: WorkingProjectContextType | undefined;
    render(
      <WorkingProjectProvider
        status="listing-unavailable"
        projects={[]}
        activeProject={firstProject}
        onProjectChange={jest.fn()}
      >
        <WorkingProjectConsumer
          onContextChange={(value) => {
            working = value;
          }}
        />
      </WorkingProjectProvider>,
    );
    expect(working?.status).toBe('listing-unavailable');
    expect(working?.activeProject).toBeNull();
  });

  it('should transition through source states without exposing stale projects', () => {
    let working: WorkingProjectContextType | undefined;
    const view = (
      status: NonNullable<WorkingProjectProviderProps['status']>,
      projects: ProjectIdentity[],
    ) => (
      <WorkingProjectProvider
        status={status}
        projects={projects}
        activeProject={firstProject}
        onProjectChange={jest.fn()}
      >
        <WorkingProjectConsumer
          onContextChange={(value) => {
            working = value;
          }}
        />
      </WorkingProjectProvider>
    );
    const { rerender } = render(view('loading', [firstProject]));
    expect(working?.status).toBe('loading');
    expect(working?.activeProject).toBeNull();
    rerender(view('listed', [firstProject]));
    expect(working?.status).toBe('listed');
    expect(working?.activeProject).toBe(firstProject);
    rerender(view('listed', []));
    expect(working?.status).toBe('empty-list');
    expect(working?.activeProject).toBeNull();
    rerender(view('project-source-error', [firstProject]));
    expect(working?.status).toBe('project-source-error');
    expect(working?.projects).toEqual([]);
  });
});
