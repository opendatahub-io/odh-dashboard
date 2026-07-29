import * as React from 'react';
import type { ProjectKind } from '@odh-dashboard/k8s-core';
import { getDisplayNameFromK8sResource, byName } from '@odh-dashboard/k8s-core';
import {
  ProjectsContext,
  type ProjectsContextType,
} from '@odh-dashboard/ui-core/context/ProjectsContext';
import { useProjects } from '#~/api';
import { useDashboardNamespace } from '#~/redux/selectors';
import { isAvailableProject } from './utils';
import { PREFERRED_NAMESPACE_STORAGE_KEY } from './getStoredPreferredProject';

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
    const raw = localStorage.getItem(PREFERRED_NAMESPACE_STORAGE_KEY);
    if (raw) {
      let stored: string | null = null;
      try {
        const parsed = JSON.parse(raw);
        if (typeof parsed === 'string') {
          stored = parsed;
        }
      } catch {
        if (typeof raw === 'string' && raw.length > 0) {
          stored = raw;
        }
      }
      if (stored) {
        const match = projects.find(byName(stored));
        if (match) {
          setPreferredProject(match);
        }
      }
    }
  }, [loaded, projects]);

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

  return <ProjectsContext.Provider value={contextValue}>{children}</ProjectsContext.Provider>;
};

export default ProjectsContextProvider;
