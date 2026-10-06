import * as React from 'react';
import { act, render, renderHook } from '@testing-library/react';
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
  { status: 'empty', projects: [], activeProject: null },
  { status: 'list-unavailable', knownProjects: [], activeProject: null },
  { status: 'error', error: new Error('Unable to load projects') },
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
    const { result } = renderHook(() => useWorkingProject());

    expect(result.current.state).toStrictEqual({ status: 'absent' });
  });

  it.each(mountedProviderStates)('should expose the $status state', (state) => {
    const onProjectChange = jest.fn();
    const { result } = renderHook(() => useWorkingProject(), {
      wrapper: createWrapper(state, onProjectChange),
    });

    expect(result.current.state).toBe(state);
  });

  it('should change to a known project using the provider identity', () => {
    const onProjectChange = jest.fn();
    const state: ProvidedWorkingProjectState = {
      status: 'ready',
      projects: [firstProject, secondProject],
      activeProject: firstProject,
    };
    const { result } = renderHook(() => useWorkingProject(), {
      wrapper: createWrapper(state, onProjectChange),
    });

    act(() => {
      result.current.selectProject({
        name: secondProject.name,
        displayName: 'Ignored display name',
      });
    });

    expect(onProjectChange).toHaveBeenCalledWith(secondProject);
  });

  it('should not change to an unknown project', () => {
    const onProjectChange = jest.fn();
    const state: ProvidedWorkingProjectState = {
      status: 'ready',
      projects: [firstProject],
      activeProject: firstProject,
    };
    const { result } = renderHook(() => useWorkingProject(), {
      wrapper: createWrapper(state, onProjectChange),
    });

    act(() => {
      result.current.selectProject({ name: 'unknown-project' });
    });

    expect(onProjectChange).not.toHaveBeenCalled();
  });

  it('should expose an error when a provider supplies an unknown active project', () => {
    const onProjectChange = jest.fn();
    const state: ProvidedWorkingProjectState = {
      status: 'ready',
      projects: [firstProject, secondProject],
      activeProject: { name: 'unknown-project' },
    };
    const { result } = renderHook(() => useWorkingProject(), {
      wrapper: createWrapper(state, onProjectChange),
    });

    expect(result.current.state).toStrictEqual({
      status: 'error',
      error: new Error('The active project must belong to the provider-known project set.'),
    });
  });

  it('should allow a provider-validated identity after it becomes known', () => {
    const onProjectChange = jest.fn();
    const unvalidatedState: ProvidedWorkingProjectState = {
      status: 'list-unavailable',
      knownProjects: [],
      activeProject: null,
    };
    const validatedState: ProvidedWorkingProjectState = {
      status: 'list-unavailable',
      knownProjects: [firstProject],
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
