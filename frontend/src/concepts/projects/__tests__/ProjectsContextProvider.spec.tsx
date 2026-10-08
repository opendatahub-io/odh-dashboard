import * as React from 'react';
import { act, render, waitFor } from '@testing-library/react';
import { KnownLabels, type ProjectKind } from '@odh-dashboard/k8s-core';
import { PREFERRED_NAMESPACE_STORAGE_KEY } from '@odh-dashboard/ui-core/context/getStoredPreferredProject';
import {
  type WorkingProjectContextType,
  useWorkingProject,
} from '@odh-dashboard/ui-core/context/WorkingProjectContext';
import ProjectsContextProvider, { ProjectsContext } from '#~/concepts/projects/ProjectsContext';
import useSyncPreferredProject from '#~/concepts/projects/useSyncPreferredProject';

const mockUseProjects = jest.fn();
jest.mock('#~/api', () => ({
  useProjects: () => mockUseProjects(),
}));
jest.mock('#~/redux/selectors', () => ({
  useDashboardNamespace: () => ({ dashboardNamespace: 'redhat-ods-applications' }),
}));

const makeProject = (
  name: string,
  options: { displayName?: string; ai?: boolean; phase?: 'Active' | 'Terminating' } = {},
): ProjectKind => ({
  apiVersion: 'project.openshift.io/v1',
  kind: 'Project',
  metadata: {
    name,
    annotations: options.displayName
      ? { 'openshift.io/display-name': options.displayName }
      : undefined,
    labels: options.ai ? { [KnownLabels.DASHBOARD_RESOURCE]: 'true' } : undefined,
  },
  status: { phase: options.phase ?? 'Active' },
});

describe('ProjectsContextProvider project selection', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  it('should use route precedence, shared ordering, and existing AI classification', async () => {
    const routeProject = makeProject('route-project', { displayName: 'Project 10' });
    const aiProject = makeProject('ai-project', { displayName: 'Project 2', ai: true });
    mockUseProjects.mockReturnValue([[routeProject, aiProject], true, undefined]);
    localStorage.setItem(PREFERRED_NAMESPACE_STORAGE_KEY, JSON.stringify(aiProject.metadata.name));
    let context: React.ContextType<typeof ProjectsContext> | undefined;
    let workingProject: WorkingProjectContextType | undefined;
    const Consumer: React.FC = () => {
      context = React.useContext(ProjectsContext);
      workingProject = useWorkingProject();
      return null;
    };

    render(
      <ProjectsContextProvider
        routeCandidate={{ status: 'present', name: routeProject.metadata.name }}
      >
        <Consumer />
      </ProjectsContextProvider>,
    );

    await waitFor(() =>
      expect(
        workingProject?.state.status === 'ready' && workingProject.state.activeProject,
      ).toEqual({
        name: routeProject.metadata.name,
        displayName: 'Project 10',
      }),
    );
    expect(context?.preferredProject).toBe(aiProject);
    expect(context?.projects).toEqual([routeProject, aiProject]);
    expect(localStorage.getItem(PREFERRED_NAMESPACE_STORAGE_KEY)).toBe(
      JSON.stringify(routeProject.metadata.name),
    );
    expect(workingProject?.state).toStrictEqual({
      status: 'ready',
      projects: [
        { name: aiProject.metadata.name, displayName: 'Project 2' },
        { name: routeProject.metadata.name, displayName: 'Project 10' },
      ],
      activeProject: { name: routeProject.metadata.name, displayName: 'Project 10' },
    });
  });

  it('should keep legacy selection separate from working-project fallback', async () => {
    const regularProject = makeProject('regular-project', { displayName: 'Project 10' });
    const aiProject = makeProject('ai-project', { displayName: 'Project 2', ai: true });
    mockUseProjects.mockReturnValue([[regularProject, aiProject], true, undefined]);
    let context: React.ContextType<typeof ProjectsContext> | undefined;
    let workingProject: WorkingProjectContextType | undefined;
    const Consumer: React.FC = () => {
      context = React.useContext(ProjectsContext);
      workingProject = useWorkingProject();
      return null;
    };

    render(
      <ProjectsContextProvider>
        <Consumer />
      </ProjectsContextProvider>,
    );

    await waitFor(() => expect(workingProject?.state.status).toBe('ready'));
    expect(context?.preferredProject).toBeNull();
    expect(workingProject?.state).toStrictEqual({
      status: 'ready',
      projects: [
        { name: aiProject.metadata.name, displayName: 'Project 2' },
        { name: regularProject.metadata.name, displayName: 'Project 10' },
      ],
      activeProject: { name: aiProject.metadata.name, displayName: 'Project 2' },
    });
    expect(localStorage.getItem(PREFERRED_NAMESPACE_STORAGE_KEY)).toBeNull();
  });

  it('should reject an invalid route without replacing the legacy stored project', async () => {
    const storedProject = makeProject('stored-project');
    const terminatingProject = makeProject('terminating-project', { phase: 'Terminating' });
    const aiProject = makeProject('ai-project', { ai: true });
    mockUseProjects.mockReturnValue([
      [storedProject, terminatingProject, aiProject],
      true,
      undefined,
    ]);
    localStorage.setItem(
      PREFERRED_NAMESPACE_STORAGE_KEY,
      JSON.stringify(storedProject.metadata.name),
    );
    let context: React.ContextType<typeof ProjectsContext> | undefined;
    let workingProject: WorkingProjectContextType | undefined;
    const Consumer: React.FC = () => {
      context = React.useContext(ProjectsContext);
      workingProject = useWorkingProject();
      return null;
    };

    render(
      <ProjectsContextProvider
        routeCandidate={{ status: 'present', name: terminatingProject.metadata.name }}
      >
        <Consumer />
      </ProjectsContextProvider>,
    );

    await waitFor(() => expect(context?.preferredProject).toBe(storedProject));
    expect(context?.preferredProject).toBe(storedProject);
    expect(workingProject?.state).toStrictEqual({
      status: 'invalid-route',
      candidate: terminatingProject.metadata.name,
      projects: [
        { name: aiProject.metadata.name, displayName: aiProject.metadata.name },
        { name: storedProject.metadata.name, displayName: storedProject.metadata.name },
      ],
      activeProject: null,
    });
    expect(localStorage.getItem(PREFERRED_NAMESPACE_STORAGE_KEY)).toBe(
      JSON.stringify(storedProject.metadata.name),
    );
  });

  it('should leave persistence with the legacy route controller until route integration mounts', async () => {
    const fallbackProject = makeProject('project-a', { ai: true });
    const routeProject = makeProject('project-b');
    mockUseProjects.mockReturnValue([[], false, undefined]);
    const Consumer: React.FC = () => {
      useSyncPreferredProject(routeProject);
      return null;
    };
    const { rerender } = render(
      <ProjectsContextProvider>
        <Consumer />
      </ProjectsContextProvider>,
    );
    await waitFor(() =>
      expect(localStorage.getItem(PREFERRED_NAMESPACE_STORAGE_KEY)).toBe(
        JSON.stringify(routeProject.metadata.name),
      ),
    );

    mockUseProjects.mockReturnValue([[fallbackProject, routeProject], true, undefined]);
    rerender(
      <ProjectsContextProvider>
        <Consumer />
      </ProjectsContextProvider>,
    );

    await waitFor(() =>
      expect(localStorage.getItem(PREFERRED_NAMESPACE_STORAGE_KEY)).toBe(
        JSON.stringify(routeProject.metadata.name),
      ),
    );
  });

  it('should not feed a working-project storage update back through route synchronization', async () => {
    const routeProject = makeProject('route-project');
    const externalProject = makeProject('external-project');
    mockUseProjects.mockReturnValue([[routeProject, externalProject], true, undefined]);
    localStorage.setItem(
      PREFERRED_NAMESPACE_STORAGE_KEY,
      JSON.stringify(routeProject.metadata.name),
    );
    let syncedPreferredProject: ProjectKind | null = null;
    let workingProject: WorkingProjectContextType | undefined;
    const SyncedProjectConsumer: React.FC<{ routeProject: ProjectKind | null }> = ({
      routeProject: project,
    }) => {
      useSyncPreferredProject(project);
      syncedPreferredProject = React.useContext(ProjectsContext).preferredProject;
      workingProject = useWorkingProject();
      return null;
    };

    const { rerender } = render(
      <ProjectsContextProvider>
        <SyncedProjectConsumer routeProject={routeProject} />
      </ProjectsContextProvider>,
    );
    await waitFor(() => expect(syncedPreferredProject).toBe(routeProject));

    const externalStoredProjectName = JSON.stringify(externalProject.metadata.name);
    act(() => {
      localStorage.setItem(PREFERRED_NAMESPACE_STORAGE_KEY, externalStoredProjectName);
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: PREFERRED_NAMESPACE_STORAGE_KEY,
          newValue: externalStoredProjectName,
          storageArea: localStorage,
        }),
      );
    });

    await waitFor(() =>
      expect(
        workingProject?.state.status === 'ready' && workingProject.state.activeProject.name,
      ).toBe(externalProject.metadata.name),
    );
    expect(syncedPreferredProject).toBe(routeProject);
    expect(localStorage.getItem(PREFERRED_NAMESPACE_STORAGE_KEY)).toBe(externalStoredProjectName);

    rerender(
      <ProjectsContextProvider>
        <SyncedProjectConsumer routeProject={null} />
      </ProjectsContextProvider>,
    );
    await waitFor(() => expect(syncedPreferredProject).toBeNull());

    rerender(
      <ProjectsContextProvider>
        <SyncedProjectConsumer routeProject={routeProject} />
      </ProjectsContextProvider>,
    );
    await waitFor(() => expect(syncedPreferredProject).toBe(routeProject));
  });
});
