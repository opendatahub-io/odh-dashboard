import * as React from 'react';
import type { ProjectKind } from '@odh-dashboard/k8s-core';
import { getDisplayNameFromK8sResource, byName, isAiProject } from '@odh-dashboard/k8s-core';
import {
  ProjectsContext,
  type ProjectsContextType,
} from '@odh-dashboard/ui-core/context/ProjectsContext';
import {
  type ProjectIdentity,
  type ProvidedWorkingProjectState,
  WorkingProjectProvider,
} from '@odh-dashboard/ui-core/context/WorkingProjectContext';
import {
  type ProjectSelectionCandidate,
  useProjectSelection,
} from '@odh-dashboard/ui-core/context/useProjectSelection';
import {
  getStoredPreferredProject,
  PREFERRED_NAMESPACE_STORAGE_KEY,
} from '@odh-dashboard/ui-core/context/getStoredPreferredProject';
import { useProjects } from '#~/api';
import { useDashboardNamespace } from '#~/redux/selectors';
import { isAvailableProject } from './utils';

// Re-export shared definitions for backward compatibility
// eslint-disable-next-line @odh-dashboard/no-restricted-imports -- re-exporting shared context
export { ProjectsContext } from '@odh-dashboard/ui-core/context/ProjectsContext';
// eslint-disable-next-line @odh-dashboard/no-restricted-imports -- re-exporting shared utility
export { byName } from '@odh-dashboard/k8s-core';

const projectSorter = (projectA: ProjectKind, projectB: ProjectKind) =>
  getDisplayNameFromK8sResource(projectA).localeCompare(getDisplayNameFromK8sResource(projectB));
const projectSelectionAccessors = {
  getName: (project: ProjectKind) => project.metadata.name,
  getDisplayName: (project: ProjectKind) => getDisplayNameFromK8sResource(project),
};
const toProjectIdentity = (project: ProjectKind): ProjectIdentity => ({
  name: projectSelectionAccessors.getName(project),
  displayName: projectSelectionAccessors.getDisplayName(project),
});

type ProjectsProviderProps = {
  children: React.ReactNode;
  routeCandidate?: ProjectSelectionCandidate;
};

const ProjectsContextProvider: React.FC<ProjectsProviderProps> = ({ children, routeCandidate }) => {
  const [preferredProject, setPreferredProject] =
    React.useState<ProjectsContextType['preferredProject']>(null);
  const initializedFromStorage = React.useRef(false);
  const [projectData, loaded, loadError] = useProjects();
  const { dashboardNamespace } = useDashboardNamespace();

  const updatePreferredProject = React.useCallback((project: ProjectKind | null) => {
    setPreferredProject(project);
    if (project?.metadata.name) {
      localStorage.setItem(PREFERRED_NAMESPACE_STORAGE_KEY, JSON.stringify(project.metadata.name));
    } else {
      localStorage.removeItem(PREFERRED_NAMESPACE_STORAGE_KEY);
    }
  }, []);

  const { projects, modelServingProjects, nonActiveProjects } = React.useMemo(
    () =>
      projectData.reduce<{
        projects: ProjectKind[];
        modelServingProjects: ProjectKind[];
        nonActiveProjects: ProjectKind[];
      }>(
        (states, project) => {
          if (isAvailableProject(project.metadata.name, dashboardNamespace)) {
            if (project.status?.phase === 'Active') {
              // Project that is active
              states.projects.push(project);
              states.modelServingProjects.push(project);
            } else {
              // Non 'Active' -- aka terminating
              states.nonActiveProjects.push(project);
            }
          }

          return states;
        },
        { projects: [], modelServingProjects: [], nonActiveProjects: [] },
      ),
    [projectData, dashboardNamespace],
  );

  React.useEffect(() => {
    if (!loaded || projects.length === 0 || initializedFromStorage.current) {
      return;
    }
    initializedFromStorage.current = true;
    const match = getStoredPreferredProject(projects);
    if (match) {
      setPreferredProject(match);
    }
  }, [loaded, projects]);

  const {
    orderedProjects: orderedWorkingProjects,
    activeProject: activeWorkingProject,
    resolution: workingProjectResolution,
    selectProject: selectWorkingProject,
  } = useProjectSelection({
    projects: loaded && !loadError ? projects : null,
    providerValidatedProjects: projects,
    routeCandidate,
    accessors: projectSelectionAccessors,
    isAiProject,
    enablePersistence: routeCandidate !== undefined,
  });

  const projectIdentities = React.useMemo(
    () => orderedWorkingProjects.map(toProjectIdentity),
    [orderedWorkingProjects],
  );
  const workingProjectSelectionState = React.useMemo<ProvidedWorkingProjectState>(() => {
    const firstProject = projectIdentities.at(0);
    const activeProject = activeWorkingProject
      ? projectIdentities.find(({ name }) => name === activeWorkingProject.metadata.name) ?? null
      : null;
    if (!loaded) {
      return { status: 'loading' };
    }
    if (loadError) {
      return { status: 'provider-error', error: loadError };
    }
    if (workingProjectResolution.status === 'invalid-route') {
      return {
        status: 'invalid-route',
        candidate: workingProjectResolution.candidate,
        projects: projectIdentities,
        activeProject,
      };
    }
    if (!firstProject) {
      return { status: 'no-accessible-projects', projects: [], activeProject: null };
    }
    if (!activeProject) {
      return { status: 'loading' };
    }
    return {
      status: 'ready',
      projects: [firstProject, ...projectIdentities.slice(1)],
      activeProject,
    };
  }, [activeWorkingProject, loadError, loaded, projectIdentities, workingProjectResolution]);
  const updateWorkingProject = React.useCallback(
    ({ name }: ProjectIdentity) => {
      const project = orderedWorkingProjects.find(byName(name));
      if (project) {
        selectWorkingProject(project);
      }
    },
    [orderedWorkingProjects, selectWorkingProject],
  );

  const isMounted = React.useRef(true);
  React.useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);
  const projectsRef = React.useRef(projects);
  projectsRef.current = projects;

  // The ability to wait for a project to be present is still necessary even with web sockets
  // so long as we continue to rely on a single context to own all  project data.
  const waitForProject = React.useCallback<ProjectsContextType['waitForProject']>(
    (projectName) =>
      new Promise((resolve) => {
        // Projects take a moment to appear in K8s due to their shell version of Namespaces
        const doCheckAgain = () => {
          setTimeout(() => {
            if (projectsRef.current.find(byName(projectName))) {
              resolve();
              return;
            }
            if (isMounted.current) {
              doCheckAgain();
            }
          }, 200);
        };
        doCheckAgain();
      }),
    [],
  );

  const contextValue = React.useMemo(
    () => ({
      projects: projects.toSorted(projectSorter),
      modelServingProjects: modelServingProjects.toSorted(projectSorter),
      nonActiveProjects: nonActiveProjects.toSorted(projectSorter),
      preferredProject,
      updatePreferredProject,
      loaded,
      loadError,
      waitForProject,
    }),
    [
      projects,
      modelServingProjects,
      nonActiveProjects,
      preferredProject,
      updatePreferredProject,
      loaded,
      loadError,
      waitForProject,
    ],
  );

  return (
    <WorkingProjectProvider
      state={workingProjectSelectionState}
      onProjectChange={updateWorkingProject}
    >
      <ProjectsContext.Provider value={contextValue}>{children}</ProjectsContext.Provider>
    </WorkingProjectProvider>
  );
};

export default ProjectsContextProvider;
