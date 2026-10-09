import * as React from 'react';
import { act, render } from '@testing-library/react';
import { renderHook } from '@odh-dashboard/jest-config/hooks';
import {
  type ProjectIdentity,
  type WorkingProjectContextType,
  WorkingProjectProvider,
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
  it('should expose an empty, inactive selection without a provider', () => {
    const renderResult = renderHook(() => useWorkingProject());

    expect(renderResult.result.current.projects).toEqual([]);
    expect(renderResult.result.current.activeProject).toBeNull();
    act(() => {
      renderResult.result.current.selectProject(firstProject);
    });
    expect(renderResult).hookToHaveUpdateCount(1);
  });

  it('should expose the supplied projects and active project', () => {
    const projects = [firstProject, secondProject];
    const renderResult = renderHook(() => useWorkingProject(), {
      wrapper: createWrapper(projects, firstProject, jest.fn()),
    });

    expect(renderResult.result.current.projects).toBe(projects);
    expect(renderResult.result.current.activeProject).toBe(firstProject);
    expect(renderResult).hookToHaveUpdateCount(1);
  });

  it('should allow an empty list without an active project', () => {
    const onProjectChange = jest.fn();
    const renderResult = renderHook(() => useWorkingProject(), {
      wrapper: createWrapper([], null, onProjectChange),
    });

    expect(renderResult.result.current.projects).toEqual([]);
    expect(renderResult.result.current.activeProject).toBeNull();
    act(() => {
      renderResult.result.current.selectProject(firstProject);
    });
    expect(onProjectChange).not.toHaveBeenCalled();
  });

  it('should allow a null selection while preserving selectable projects', () => {
    const projects = [firstProject, secondProject];
    const renderResult = renderHook(() => useWorkingProject(), {
      wrapper: createWrapper(projects, null, jest.fn()),
    });

    expect(renderResult.result.current.projects).toBe(projects);
    expect(renderResult.result.current.activeProject).toBeNull();
  });

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

  it('should not expose an active project that is missing from the supplied list', () => {
    const projects = [firstProject, secondProject];
    const renderResult = renderHook(() => useWorkingProject(), {
      wrapper: createWrapper(projects, { name: 'removed-project' }, jest.fn()),
    });

    expect(renderResult.result.current.projects).toBe(projects);
    expect(renderResult.result.current.activeProject).toBeNull();
  });

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
});
