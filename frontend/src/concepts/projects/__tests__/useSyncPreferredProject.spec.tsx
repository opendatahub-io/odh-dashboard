import * as React from 'react';
import { act, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import type { ProjectKind } from '@odh-dashboard/k8s-core';
import { mockProjectK8sResource } from '@odh-dashboard/k8s-core/__mocks__/mockProjectK8sResource';
import { SupportedArea, useIsAreaAvailable } from '@odh-dashboard/plugin-core/areas';
import {
  ProjectsContext,
  type ProjectsContextType,
} from '@odh-dashboard/ui-core/context/ProjectsContext';
import useSyncPreferredProject from '#~/concepts/projects/useSyncPreferredProject';

jest.mock('@odh-dashboard/plugin-core/areas', () => ({
  ...jest.requireActual('@odh-dashboard/plugin-core/areas'),
  useIsAreaAvailable: jest.fn(),
}));

const a = mockProjectK8sResource({ k8sName: 'a' });
const b = mockProjectK8sResource({ k8sName: 'b' });
let updateWorkingProject: (project: ProjectKind | null) => void;

const RouteConsumer: React.FC<{
  routeProject: ProjectKind | null;
  skipWhenUnifiedProjectSelectorEnabled?: boolean;
  hasNestedPipeline?: boolean;
}> = ({ routeProject, skipWhenUnifiedProjectSelectorEnabled, hasNestedPipeline }) => {
  useSyncPreferredProject(routeProject, skipWhenUnifiedProjectSelectorEnabled);
  return (
    <>
      {hasNestedPipeline && <NestedPipelineConsumer routeProject={routeProject} />}
      <WorkingProjectName />
    </>
  );
};

const NestedPipelineConsumer: React.FC<{ routeProject: ProjectKind | null }> = ({
  routeProject,
}) => {
  useSyncPreferredProject(routeProject, true);
  return null;
};

const WorkingProjectName: React.FC = () => {
  const { preferredProject } = React.useContext(ProjectsContext);
  return <span data-testid="working-project-name">{preferredProject?.metadata.name}</span>;
};

const Harness: React.FC<{
  routeProject: ProjectKind | null;
  onUpdate: jest.Mock;
  initialPreferred?: ProjectKind | null;
  skipWhenUnifiedProjectSelectorEnabled?: boolean;
  hasNestedPipeline?: boolean;
}> = ({
  routeProject,
  onUpdate,
  initialPreferred = null,
  skipWhenUnifiedProjectSelectorEnabled,
  hasNestedPipeline,
}) => {
  const [preferred, setPreferred] = React.useState<ProjectKind | null>(initialPreferred);
  updateWorkingProject = React.useCallback(
    (project: ProjectKind | null) => {
      setPreferred(project);
      onUpdate(project);
    },
    [onUpdate],
  );
  const context: ProjectsContextType = React.useMemo(
    () => ({
      projects: [a, b],
      modelServingProjects: [a, b],
      nonActiveProjects: [],
      preferredProject: preferred,
      updatePreferredProject: updateWorkingProject,
      loaded: true,
      loadError: undefined,
      waitForProject: () => Promise.resolve(),
    }),
    [preferred],
  );
  return (
    <ProjectsContext.Provider value={context}>
      <RouteConsumer
        routeProject={routeProject}
        skipWhenUnifiedProjectSelectorEnabled={skipWhenUnifiedProjectSelectorEnabled}
        hasNestedPipeline={hasNestedPipeline}
      />
    </ProjectsContext.Provider>
  );
};

describe('useSyncPreferredProject', () => {
  const mockUseIsAreaAvailable = jest.mocked(useIsAreaAvailable);
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseIsAreaAvailable.mockImplementation((area) => {
      expect(area).toBe(SupportedArea.UNIFIED_PROJECT_SELECTOR);
      return { status: true } as ReturnType<typeof useIsAreaAvailable>;
    });
  });

  it('should preserve a different working project while viewing project details with a nested pipeline', () => {
    const onUpdate = jest.fn();
    const view = (routeProject: ProjectKind | null) => (
      <Harness
        routeProject={routeProject}
        onUpdate={onUpdate}
        initialPreferred={b}
        skipWhenUnifiedProjectSelectorEnabled
        hasNestedPipeline
      />
    );
    const { rerender } = render(view(a));
    expect(screen.getByTestId('working-project-name')).toHaveTextContent('b');
    expect(onUpdate).not.toHaveBeenCalled();

    // Refreshes and navigation between project detail pages must not change the working project.
    rerender(view(null));
    rerender(view(a));
    rerender(view(b));
    expect(screen.getByTestId('working-project-name')).toHaveTextContent('b');
    expect(onUpdate).not.toHaveBeenCalled();

    rerender(view(a));
    act(() => updateWorkingProject(a));
    expect(screen.getByTestId('working-project-name')).toHaveTextContent('a');
    expect(onUpdate).toHaveBeenCalledTimes(1);
  });

  it('should not restore the viewed project after an explicit masthead selection', () => {
    const onUpdate = jest.fn();
    render(
      <Harness
        routeProject={a}
        initialPreferred={a}
        onUpdate={onUpdate}
        skipWhenUnifiedProjectSelectorEnabled
        hasNestedPipeline
      />,
    );
    act(() => updateWorkingProject(b));
    expect(screen.getByTestId('working-project-name')).toHaveTextContent('b');
    expect(onUpdate).toHaveBeenCalledTimes(1);
  });

  it('should keep non-projects routes synchronized with their project even when UPS is enabled', () => {
    const onUpdate = jest.fn();
    render(<Harness routeProject={a} onUpdate={onUpdate} />);
    act(() => updateWorkingProject(b));
    expect(screen.getByTestId('working-project-name')).toHaveTextContent('a');
    expect(onUpdate).toHaveBeenCalledTimes(3);
  });

  it('should retain legacy route-preferred synchronization when the gate is off', () => {
    mockUseIsAreaAvailable.mockReturnValue({ status: false } as ReturnType<
      typeof useIsAreaAvailable
    >);
    const onUpdate = jest.fn();
    render(<Harness routeProject={a} onUpdate={onUpdate} skipWhenUnifiedProjectSelectorEnabled />);
    act(() => updateWorkingProject(b));
    expect(screen.getByTestId('working-project-name')).toHaveTextContent('a');
    expect(onUpdate).toHaveBeenCalledTimes(3);
  });
});
