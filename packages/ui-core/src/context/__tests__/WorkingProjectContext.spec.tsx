import * as React from 'react';
import { act, render } from '@testing-library/react';
import { renderHook } from '@odh-dashboard/jest-config/hooks';
import {
  type ProjectIdentity,
  type ProvidedWorkingProjectState,
  type WorkingProjectContextType,
  WorkingProjectProvider,
  useWorkingProject,
} from '../WorkingProjectContext';

const firstProject: ProjectIdentity = { name: 'first-project', displayName: 'First project' };
const secondProject: ProjectIdentity = { name: 'second-project' };
const mountedProviderStates: ProvidedWorkingProjectState[] = [
  { status: 'loading' },
  { status: 'ready', projects: [firstProject, secondProject], activeProject: firstProject },
  { status: 'no-accessible-projects', projects: [], activeProject: null },
  {
    status: 'invalid-route',
    candidate: 'missing-project',
    projects: [firstProject],
    activeProject: null,
  },
  { status: 'list-unavailable', providerValidatedProjects: [], activeProject: null },
  { status: 'provider-error', error: new Error('Unable to load projects') },
];
const nonSelectableProviderStates: ProvidedWorkingProjectState[] = [
  { status: 'loading' },
  { status: 'no-accessible-projects', projects: [], activeProject: null },
  { status: 'list-unavailable', providerValidatedProjects: [], activeProject: null },
  { status: 'provider-error', error: new Error('Unable to load projects') },
];

const createWrapper = (
  state: ProvidedWorkingProjectState,
  onProjectChange: (project: ProjectIdentity) => void,
): React.FC<React.PropsWithChildren> =>
  function Wrapper({ children }) {
    return (
      <WorkingProjectProvider state={state} onProjectChange={onProjectChange}>
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
  it('should expose provider absence', () => {
    const renderResult = renderHook(() => useWorkingProject());

    expect(renderResult.result.current.state).toStrictEqual({ status: 'provider-absent' });
    expect(renderResult).hookToHaveUpdateCount(1);
  });

  it('should not select a project when the provider is absent', () => {
    const renderResult = renderHook(() => useWorkingProject());

    act(() => {
      renderResult.result.current.selectProject(firstProject);
    });

    expect(renderResult).hookToHaveUpdateCount(1);
  });

  it.each(mountedProviderStates)('should expose the $status state', (state) => {
    const onProjectChange = jest.fn();
    const renderResult = renderHook(() => useWorkingProject(), {
      wrapper: createWrapper(state, onProjectChange),
    });

    expect(renderResult.result.current.state).toBe(state);
    expect(renderResult).hookToHaveUpdateCount(1);
  });

  it('should change to a known project using the canonical provider identity', () => {
    const onProjectChange = jest.fn();
    const state: ProvidedWorkingProjectState = {
      status: 'ready',
      projects: [firstProject, secondProject],
      activeProject: firstProject,
    };
    const renderResult = renderHook(() => useWorkingProject(), {
      wrapper: createWrapper(state, onProjectChange),
    });

    act(() => {
      renderResult.result.current.selectProject({
        name: secondProject.name,
        displayName: 'Ignored display name',
      });
    });

    expect(onProjectChange).toHaveBeenCalledWith(secondProject);
    expect(renderResult).hookToHaveUpdateCount(1);
  });

  it.each([{ name: 'unknown-project' }, { name: '' }])(
    'should not change to an unknown project identity',
    (project) => {
      const onProjectChange = jest.fn();
      const state: ProvidedWorkingProjectState = {
        status: 'ready',
        projects: [firstProject],
        activeProject: firstProject,
      };
      const renderResult = renderHook(() => useWorkingProject(), {
        wrapper: createWrapper(state, onProjectChange),
      });

      act(() => {
        renderResult.result.current.selectProject(project);
      });

      expect(onProjectChange).not.toHaveBeenCalled();
      expect(renderResult).hookToHaveUpdateCount(1);
    },
  );

  it.each(nonSelectableProviderStates)(
    'should not select a project from the $status state',
    (state) => {
      const onProjectChange = jest.fn();
      const renderResult = renderHook(() => useWorkingProject(), {
        wrapper: createWrapper(state, onProjectChange),
      });

      act(() => {
        renderResult.result.current.selectProject(firstProject);
      });

      expect(onProjectChange).not.toHaveBeenCalled();
      expect(renderResult).hookToHaveUpdateCount(1);
    },
  );

  it('should expose an error when a provider supplies an unknown active project', () => {
    const onProjectChange = jest.fn();
    const state: ProvidedWorkingProjectState = {
      status: 'ready',
      projects: [firstProject, secondProject],
      activeProject: { name: 'unknown-project' },
    };
    const renderResult = renderHook(() => useWorkingProject(), {
      wrapper: createWrapper(state, onProjectChange),
    });

    expect(renderResult.result.current.state).toStrictEqual({
      status: 'provider-error',
      error: new Error('The active project must belong to the provider-known project set.'),
    });
    expect(renderResult).hookToHaveUpdateCount(1);
  });

  it('should expose transitions from ready to loading and list-unavailable', () => {
    const onProjectChange = jest.fn();
    const readyState: ProvidedWorkingProjectState = {
      status: 'ready',
      projects: [firstProject, secondProject],
      activeProject: firstProject,
    };
    const loadingState: ProvidedWorkingProjectState = { status: 'loading' };
    const listUnavailableState: ProvidedWorkingProjectState = {
      status: 'list-unavailable',
      providerValidatedProjects: [firstProject],
      activeProject: firstProject,
    };
    let workingProject: WorkingProjectContextType | undefined;
    const onContextChange = (nextWorkingProject: WorkingProjectContextType) => {
      workingProject = nextWorkingProject;
    };
    const renderProvider = (state: ProvidedWorkingProjectState) => (
      <WorkingProjectProvider state={state} onProjectChange={onProjectChange}>
        <WorkingProjectConsumer onContextChange={onContextChange} />
      </WorkingProjectProvider>
    );
    const { rerender } = render(renderProvider(readyState));

    rerender(renderProvider(loadingState));
    expect(workingProject?.state).toBe(loadingState);

    rerender(renderProvider(readyState));
    rerender(renderProvider(listUnavailableState));
    expect(workingProject?.state).toBe(listUnavailableState);
  });

  it('should expose a provider error when a list-unavailable provider fails', () => {
    const onProjectChange = jest.fn();
    const listUnavailableState: ProvidedWorkingProjectState = {
      status: 'list-unavailable',
      providerValidatedProjects: [firstProject],
      activeProject: firstProject,
    };
    const errorState: ProvidedWorkingProjectState = {
      status: 'provider-error',
      error: new Error('Unable to validate projects'),
    };
    let workingProject: WorkingProjectContextType | undefined;
    const onContextChange = (nextWorkingProject: WorkingProjectContextType) => {
      workingProject = nextWorkingProject;
    };
    const renderProvider = (state: ProvidedWorkingProjectState) => (
      <WorkingProjectProvider state={state} onProjectChange={onProjectChange}>
        <WorkingProjectConsumer onContextChange={onContextChange} />
      </WorkingProjectProvider>
    );
    const { rerender } = render(renderProvider(listUnavailableState));

    rerender(renderProvider(errorState));

    expect(workingProject?.state).toBe(errorState);
  });

  it('should expose a provider error when an active project is removed after a refresh', () => {
    const onProjectChange = jest.fn();
    const readyState: ProvidedWorkingProjectState = {
      status: 'ready',
      projects: [firstProject, secondProject],
      activeProject: firstProject,
    };
    const refreshedState: ProvidedWorkingProjectState = {
      status: 'ready',
      projects: [secondProject],
      activeProject: firstProject,
    };
    let workingProject: WorkingProjectContextType | undefined;
    const onContextChange = (nextWorkingProject: WorkingProjectContextType) => {
      workingProject = nextWorkingProject;
    };
    const renderProvider = (state: ProvidedWorkingProjectState) => (
      <WorkingProjectProvider state={state} onProjectChange={onProjectChange}>
        <WorkingProjectConsumer onContextChange={onContextChange} />
      </WorkingProjectProvider>
    );
    const { rerender } = render(renderProvider(readyState));

    rerender(renderProvider(refreshedState));

    expect(workingProject?.state).toStrictEqual({
      status: 'provider-error',
      error: new Error('The active project must belong to the provider-known project set.'),
    });
  });

  it('should use the latest project-change callback after a provider rerender', () => {
    const firstOnProjectChange = jest.fn();
    const secondOnProjectChange = jest.fn();
    const state: ProvidedWorkingProjectState = {
      status: 'ready',
      projects: [firstProject, secondProject],
      activeProject: firstProject,
    };
    let workingProject: WorkingProjectContextType | undefined;
    const onContextChange = (nextWorkingProject: WorkingProjectContextType) => {
      workingProject = nextWorkingProject;
    };
    const renderProvider = (onProjectChange: (project: ProjectIdentity) => void) => (
      <WorkingProjectProvider state={state} onProjectChange={onProjectChange}>
        <WorkingProjectConsumer onContextChange={onContextChange} />
      </WorkingProjectProvider>
    );
    const { rerender } = render(renderProvider(firstOnProjectChange));

    rerender(renderProvider(secondOnProjectChange));

    const latestWorkingProject = workingProject;
    if (!latestWorkingProject) {
      throw new Error('Working project context was not provided');
    }
    act(() => {
      latestWorkingProject.selectProject(secondProject);
    });

    expect(firstOnProjectChange).not.toHaveBeenCalled();
    expect(secondOnProjectChange).toHaveBeenCalledWith(secondProject);
  });

  it('should retain canonical identities when an equivalent provider state is recreated', () => {
    const onProjectChange = jest.fn();
    const state: ProvidedWorkingProjectState = {
      status: 'ready',
      projects: [firstProject, secondProject],
      activeProject: firstProject,
    };
    const recreatedFirstProject = { ...firstProject };
    const recreatedState: ProvidedWorkingProjectState = {
      status: 'ready',
      projects: [recreatedFirstProject, { ...secondProject }],
      activeProject: { name: firstProject.name, displayName: 'Stale display name' },
    };
    let workingProject: WorkingProjectContextType | undefined;
    const onContextChange = (nextWorkingProject: WorkingProjectContextType) => {
      workingProject = nextWorkingProject;
    };
    const renderProvider = (providerState: ProvidedWorkingProjectState) => (
      <WorkingProjectProvider state={providerState} onProjectChange={onProjectChange}>
        <WorkingProjectConsumer onContextChange={onContextChange} />
      </WorkingProjectProvider>
    );
    const { rerender } = render(renderProvider(state));

    rerender(renderProvider(recreatedState));

    if (workingProject?.state.status !== 'ready') {
      throw new Error('Working project state is not ready');
    }
    expect(workingProject.state.activeProject).toBe(recreatedFirstProject);
  });

  it('should allow a provider-validated identity after it becomes known', () => {
    const onProjectChange = jest.fn();
    const unvalidatedState: ProvidedWorkingProjectState = {
      status: 'list-unavailable',
      providerValidatedProjects: [],
      activeProject: firstProject,
    };
    const validatedState: ProvidedWorkingProjectState = {
      status: 'list-unavailable',
      providerValidatedProjects: [firstProject],
      activeProject: firstProject,
    };
    let workingProject: WorkingProjectContextType | undefined;
    const onContextChange = (nextWorkingProject: WorkingProjectContextType) => {
      workingProject = nextWorkingProject;
    };
    const renderProvider = (state: ProvidedWorkingProjectState) => (
      <WorkingProjectProvider state={state} onProjectChange={onProjectChange}>
        <WorkingProjectConsumer onContextChange={onContextChange} />
      </WorkingProjectProvider>
    );
    const getWorkingProject = (): WorkingProjectContextType => {
      if (!workingProject) {
        throw new Error('Working project context was not provided');
      }
      return workingProject;
    };
    const { rerender } = render(renderProvider(unvalidatedState));

    expect(getWorkingProject().state).toStrictEqual({
      ...unvalidatedState,
      activeProject: null,
    });

    act(() => {
      getWorkingProject().selectProject(firstProject);
    });
    expect(onProjectChange).not.toHaveBeenCalled();

    rerender(renderProvider(validatedState));

    expect(getWorkingProject().state).toStrictEqual(validatedState);

    act(() => {
      getWorkingProject().selectProject(firstProject);
    });

    expect(onProjectChange).toHaveBeenCalledWith(firstProject);
  });
});
