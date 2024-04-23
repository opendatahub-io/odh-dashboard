import * as React from 'react';
import { useProjects } from '~/api';
import { FetchState } from '~/utilities/useFetchState';
import { KnownLabels, ProjectKind } from '~/k8sTypes';
import { useDashboardNamespace } from '~/redux/selectors';
import { getProjectDisplayName, isAvailableProject } from '~/concepts/projects/utils';

const projectSorter = (projectA: ProjectKind, projectB: ProjectKind) =>
  getProjectDisplayName(projectA).localeCompare(getProjectDisplayName(projectB));

type ProjectFetchState = FetchState<ProjectKind[]>;
type ProjectsContextType = {
  projects: ProjectKind[];
  dataScienceProjects: ProjectKind[];
  modelServingProjects: ProjectKind[];
  /** eg. Terminating state, etc */
  nonActiveProjects: ProjectKind[];

  /** Some component set this value, you should use this instead of projects[0] */
  preferredProject: ProjectKind | null;
  /**
   * Allows for navigation to be unimpeded by project selection
   * @see useSyncPreferredProject
   */
  updatePreferredProject: (project: ProjectKind | null) => void;
  waitForProject: (projectName: string) => Promise<void>;

  // ...the rest of the state variables
  loaded: ProjectFetchState[1];
  loadError: ProjectFetchState[2];
};

export const ProjectsContext = React.createContext<ProjectsContextType>({
  projects: [],
  dataScienceProjects: [],
  modelServingProjects: [],
  nonActiveProjects: [],
  preferredProject: null,
  updatePreferredProject: () => undefined,
  loaded: false,
  loadError: new Error('Not in project provider'),
  waitForProject: () => Promise.resolve(),
});

/** Allow for name to be not passed; won't match, but ease of use. */
type GetByName = (name?: string) => Parameters<Array<ProjectKind>['find']>[0];
export const byName: GetByName = (name) => (project) => project.metadata.name === name;

type ProjectsProviderProps = {
  children: React.ReactNode;
};

const ProjectsContextProvider: React.FC<ProjectsProviderProps> = ({ children }) => {
  const [preferredProject, setPreferredProject] =
    React.useState<ProjectsContextType['preferredProject']>(null);
  const [projectData, loaded, error] = useProjects();
  const loadError = error as Error | undefined;
  const { dashboardNamespace } = useDashboardNamespace();

  const { projects, dataScienceProjects, modelServingProjects, nonActiveProjects } = React.useMemo(
    () =>
      projectData.reduce<{
        projects: ProjectKind[];
        dataScienceProjects: ProjectKind[];
        modelServingProjects: ProjectKind[];
        nonActiveProjects: ProjectKind[];
      }>(
        (states, project) => {
          if (isAvailableProject(project.metadata.name, dashboardNamespace)) {
            if (project.status?.phase === 'Active') {
              // Project that is active
              states.projects.push(project);
              if (project.metadata.labels?.[KnownLabels.DASHBOARD_RESOURCE]) {
                states.dataScienceProjects.push(project);
              }
              if (project.metadata.labels?.[KnownLabels.MODEL_SERVING_PROJECT]) {
                // Model Serving active projects
                states.modelServingProjects.push(project);
              }
            } else {
              // Non 'Active' -- aka terminating
              states.nonActiveProjects.push(project);
            }
          }

          return states;
        },
        { projects: [], dataScienceProjects: [], modelServingProjects: [], nonActiveProjects: [] },
      ),
    [projectData, dashboardNamespace],
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

  const updatePreferredProject = React.useCallback<ProjectsContextType['updatePreferredProject']>(
    (project) => {
      setPreferredProject(project);
    },
    [],
  );

  const contextValue = React.useMemo(
    () => ({
      projects: projects.sort(projectSorter),
      dataScienceProjects: dataScienceProjects.sort(projectSorter),
      modelServingProjects: modelServingProjects.sort(projectSorter),
      nonActiveProjects: nonActiveProjects.sort(projectSorter),
      preferredProject,
      updatePreferredProject,
      loaded,
      loadError,
      waitForProject,
    }),
    [
      projects,
      dataScienceProjects,
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
