import * as React from 'react';
import { SupportedArea, useIsAreaAvailable } from '@odh-dashboard/plugin-core/areas';
import type { ProjectKind } from '@odh-dashboard/k8s-core';
import { getDisplayNameFromK8sResource, byName } from '@odh-dashboard/k8s-core';
import {
  ProjectsContext,
  type ProjectsContextType,
} from '@odh-dashboard/ui-core/context/ProjectsContext';
import {
  getStoredPreferredProject,
  PREFERRED_NAMESPACE_STORAGE_KEY,
} from '@odh-dashboard/ui-core/context/getStoredPreferredProject';
import { persistWorkingProject } from '@odh-dashboard/ui-core/context/workingProjectStorage';
import { useProjects } from '#~/api';
import { useDashboardNamespace } from '#~/redux/selectors';
import RhoaiWorkingProjectAdapter from './RhoaiWorkingProjectAdapter';
import { isAvailableProject } from './utils';

// Re-export shared definitions for backward compatibility
// eslint-disable-next-line @odh-dashboard/no-restricted-imports -- re-exporting shared context
export { ProjectsContext } from '@odh-dashboard/ui-core/context/ProjectsContext';
// eslint-disable-next-line @odh-dashboard/no-restricted-imports -- re-exporting shared utility
export { byName } from '@odh-dashboard/k8s-core';

const projectSorter = (projectA: ProjectKind, projectB: ProjectKind) =>
  getDisplayNameFromK8sResource(projectA).localeCompare(getDisplayNameFromK8sResource(projectB));

type ProjectsProviderProps = {
  children: React.ReactNode;
};

const ProjectsContextProvider: React.FC<ProjectsProviderProps> = ({ children }) => {
  const unifiedProjectSelectorEnabled = useIsAreaAvailable(
    SupportedArea.UNIFIED_PROJECT_SELECTOR,
  ).status;
  const [preferredProject, setPreferredProject] =
    React.useState<ProjectsContextType['preferredProject']>(null);
  const initializedFromStorage = React.useRef(false);
  const [projectData, loaded, loadError] = useProjects();
  const { dashboardNamespace } = useDashboardNamespace();

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

  const projectsRef = React.useRef(projects);
  projectsRef.current = projects;

  const updateUnifiedPreferredProject = React.useCallback(
    (project: ProjectKind | null) => {
      // A legacy route consumer may clear its route-specific preference; UPS keeps
      // the working project until a provider-known replacement is committed.
      if (project === null) {
        return;
      }
      const knownProject =
        loaded && !loadError
          ? projects.find(({ metadata }) => metadata.name === project.metadata.name)
          : undefined;
      if (!knownProject) {
        return;
      }
      setPreferredProject(knownProject);
      try {
        persistWorkingProject(
          localStorage,
          { name: knownProject.metadata.name },
          projects.map(({ metadata }) => ({ name: metadata.name })),
        );
      } catch {
        // Accessing localStorage itself can throw; selection must still succeed.
      }
    },
    [loaded, loadError, projects],
  );

  const updateLegacyPreferredProject = React.useCallback((project: ProjectKind | null) => {
    setPreferredProject(project);
    try {
      if (project?.metadata.name) {
        localStorage.setItem(
          PREFERRED_NAMESPACE_STORAGE_KEY,
          JSON.stringify(project.metadata.name),
        );
      } else {
        localStorage.removeItem(PREFERRED_NAMESPACE_STORAGE_KEY);
      }
    } catch {
      // Persistence must not block in-memory selection or navigation.
    }
  }, []);
  const updatePreferredProject = unifiedProjectSelectorEnabled
    ? updateUnifiedPreferredProject
    : updateLegacyPreferredProject;

  React.useEffect(() => {
    if (
      unifiedProjectSelectorEnabled ||
      !loaded ||
      projects.length === 0 ||
      initializedFromStorage.current
    ) {
      return;
    }
    initializedFromStorage.current = true;
    const match = getStoredPreferredProject(projects);
    if (match) {
      setPreferredProject(match);
    }
  }, [loaded, projects, unifiedProjectSelectorEnabled]);

  const isMounted = React.useRef(true);
  React.useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);
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
      preferredProject: unifiedProjectSelectorEnabled
        ? loaded && !loadError
          ? projects.find(byName(preferredProject?.metadata.name)) ?? null
          : null
        : preferredProject,
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
      unifiedProjectSelectorEnabled,
      updatePreferredProject,
      loaded,
      loadError,
      waitForProject,
    ],
  );

  return (
    <ProjectsContext.Provider value={contextValue}>
      {unifiedProjectSelectorEnabled ? (
        <RhoaiWorkingProjectAdapter>{children}</RhoaiWorkingProjectAdapter>
      ) : (
        children
      )}
    </ProjectsContext.Provider>
  );
};

export default ProjectsContextProvider;
