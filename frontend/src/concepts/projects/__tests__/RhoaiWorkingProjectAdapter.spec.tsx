import * as React from 'react';
import { act, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import type { ProjectKind } from '@odh-dashboard/k8s-core';
import { mockProjectK8sResource } from '@odh-dashboard/k8s-core/__mocks__/mockProjectK8sResource';
import {
  ProjectsContext,
  type ProjectsContextType,
} from '@odh-dashboard/ui-core/context/ProjectsContext';
import { useWorkingProject } from '@odh-dashboard/ui-core/context/WorkingProjectContext';
import { PREFERRED_NAMESPACE_STORAGE_KEY } from '@odh-dashboard/ui-core/context/getStoredPreferredProject';
import RhoaiWorkingProjectAdapter from '#~/concepts/projects/RhoaiWorkingProjectAdapter';
import { toWorkingProjectIdentity } from '#~/concepts/projects/workingProjectAdapterUtils';

const project = (name: string, displayName = name, isDSProject = true): ProjectKind =>
  mockProjectK8sResource({ k8sName: name, displayName, isDSProject });

let selection: ReturnType<typeof useWorkingProject>;
const Consumer: React.FC<{ label: string }> = ({ label }) => {
  selection = useWorkingProject();
  return <span data-testid={label}>{selection.activeProject?.name ?? 'none'}</span>;
};

const Harness: React.FC<{
  source: ProjectKind[];
  loaded?: boolean;
  error?: Error;
  onUpdate?: (project: ProjectKind | null) => void;
}> = ({ source, loaded = true, error, onUpdate }) => {
  const [preferred, setPreferred] = React.useState<ProjectKind | null>(null);
  const update = React.useCallback(
    (next: ProjectKind | null) => {
      setPreferred(next);
      onUpdate?.(next);
    },
    [onUpdate],
  );
  const context: ProjectsContextType = React.useMemo(
    () => ({
      projects: source,
      modelServingProjects: source,
      nonActiveProjects: [],
      preferredProject: preferred,
      updatePreferredProject: update,
      loaded,
      loadError: error,
      waitForProject: () => Promise.resolve(),
    }),
    [source, preferred, update, loaded, error],
  );
  return (
    <ProjectsContext.Provider value={context}>
      <RhoaiWorkingProjectAdapter>
        <Consumer label="masthead" />
        <Consumer label="route" />
      </RhoaiWorkingProjectAdapter>
    </ProjectsContext.Provider>
  );
};

describe('RHOAI working project adapter', () => {
  beforeEach(() => localStorage.clear());

  it('should map resource names and optional display names without changing source records', () => {
    const source = project('alpha', 'Alpha');
    expect(toWorkingProjectIdentity(source)).toEqual({ name: 'alpha', displayName: 'Alpha' });
    expect(toWorkingProjectIdentity(project('beta', ''))).toEqual({ name: 'beta' });
  });

  it('should resolve and update both consumers using the existing preferred source', () => {
    const projects = [project('team', 'A Team', false), project('ai', 'AI project')];
    const update = jest.fn();
    render(<Harness source={projects} onUpdate={update} />);
    expect(update).toHaveBeenCalledWith(projects[1]);
    expect(screen.getByTestId('masthead')).toHaveTextContent('ai');
    expect(screen.getByTestId('route')).toHaveTextContent('ai');
    act(() => selection.selectProject({ name: 'team', displayName: 'forged' }));
    expect(update).toHaveBeenLastCalledWith(projects[0]);
    expect(screen.getByTestId('route')).toHaveTextContent('team');
    act(() => selection.selectProject({ name: 'missing' }));
    expect(update).toHaveBeenCalledTimes(2);
    expect(screen.getByTestId('masthead')).toHaveTextContent('team');
  });

  it('should restore a valid stored project and ignore an invalid stored identity', () => {
    const source = [project('a'), project('b')];
    localStorage.setItem(PREFERRED_NAMESPACE_STORAGE_KEY, 'b');
    const update = jest.fn();
    const { unmount } = render(<Harness source={source} onUpdate={update} />);
    expect(update).toHaveBeenCalledWith(source[1]);
    unmount();
    localStorage.setItem(PREFERRED_NAMESPACE_STORAGE_KEY, 'missing');
    render(<Harness source={source} onUpdate={update} />);
    expect(update).toHaveBeenLastCalledWith(source[0]);
  });

  it('should update the display label from refreshed source records without changing selection', () => {
    const source = [project('a', 'Old label')];
    const update = jest.fn();
    const { rerender } = render(<Harness source={source} onUpdate={update} />);
    expect(selection.activeProject?.displayName).toBe('Old label');
    rerender(<Harness source={[project('a', 'New label')]} onUpdate={update} />);
    expect(selection.activeProject).toEqual({ name: 'a', displayName: 'New label' });
    expect(update).toHaveBeenCalledTimes(1);
  });

  it('should hide stale active state during loading, error, empty, and removal', () => {
    const a = project('a');
    const b = project('b');
    const update = jest.fn();
    const view = (source: ProjectKind[], loaded = true, error?: Error) => (
      <Harness source={source} loaded={loaded} error={error} onUpdate={update} />
    );
    const { rerender } = render(view([a, b]));
    expect(screen.getByTestId('route')).toHaveTextContent('a');
    rerender(view([a, b], false));
    expect(screen.getByTestId('route')).toHaveTextContent('none');
    act(() => selection.selectProject({ name: 'b' }));
    expect(update).toHaveBeenCalledTimes(1);
    rerender(view([a, b], true, new Error('unavailable')));
    expect(screen.getByTestId('route')).toHaveTextContent('none');
    rerender(view([b]));
    expect(screen.getByTestId('route')).toHaveTextContent('b');
    rerender(view([]));
    expect(screen.getByTestId('route')).toHaveTextContent('none');
    act(() => selection.selectProject({ name: 'b' }));
    expect(update).toHaveBeenCalledTimes(2);
  });

  it('should not commit an unknown identity when storage is inaccessible', () => {
    const source = [project('a')];
    const storage = jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    const update = jest.fn();
    render(<Harness source={source} onUpdate={update} />);
    act(() => selection.selectProject({ name: 'invalid' }));
    expect(update).toHaveBeenCalledTimes(1);
    storage.mockRestore();
  });
});
