import * as React from 'react';
import { useProjects } from '~/api';
import { FetchState } from '~/utilities/useFetchState';
import { KnownLabels, ProjectKind } from '~/k8sTypes';
import { useDashboardNamespace } from '~/redux/selectors';
import { getDisplayNameFromK8sResource } from '~/concepts/k8s/utils';
import { AppContext } from '~/app/AppContext';
import { isAvailableProject } from './utils';

const projectSorter = (projectA: ProjectKind, projectB: ProjectKind) =>
  getDisplayNameFromK8sResource(projectA).localeCompare(getDisplayNameFromK8sResource(projectB));

type ProjectFetchState = FetchState<ProjectKind[]>;
type ProjectsContextType = {
  projects: ProjectKind[];
  modelServingProjects: ProjectKind[];
  /** eg. Terminating state, etc */
  nonActiveProjects: ProjectKind[];

  /** Get the project last used for the given page] */
  getPreferredProject: (page: string) => ProjectKind | null;
  /**
   * Allows for navigation to be unimpeded by project selection
   * @see useSyncPreferredProject
   */
  updatePreferredProject: (page: string, projectName: string | null) => void;
  waitForProject: (projectName: string) => Promise<void>;

  // ...the rest of the state variables
  loaded: ProjectFetchState[1];
  loadError: ProjectFetchState[2];
};

export const ProjectsContext = React.createContext<ProjectsContextType>({
  projects: [],
  modelServingProjects: [],
  nonActiveProjects: [],
  getPreferredProject: () => null,
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  updatePreferredProject: () => {},
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
  const [projectData, loaded, loadError] = useProjects();
  const { dashboardNamespace } = useDashboardNamespace();
  const { altPreferredProject } = React.useContext(AppContext);
  const [pageProjects, setPageProjects] = React.useState<{ [key: string]: ProjectKind | null }>({});

  const getPreferredProject = React.useCallback(
    (page: string) => pageProjects[!altPreferredProject ? page : '__preferredProject'] ?? null,
    [altPreferredProject, pageProjects],
  );
  const updatePreferredProject = React.useCallback(
    (page: string, projectName: string | null) => {
      const project = projectData.find((p) => p.metadata.name === projectName);
      setPageProjects((prev) => {
        const projects = { ...prev };
        projects[!altPreferredProject ? page : '__preferredProject'] = project || null;
        return projects;
      });
    },
    [altPreferredProject, projectData],
  );

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
        { projects: [], modelServingProjects: [], nonActiveProjects: [] },
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

  const contextValue = React.useMemo(
    () => ({
      projects: projects.toSorted(projectSorter),
      modelServingProjects: modelServingProjects.toSorted(projectSorter),
      nonActiveProjects: nonActiveProjects.toSorted(projectSorter),
      getPreferredProject,
      updatePreferredProject,
      loaded,
      loadError,
      waitForProject,
    }),
    [
      projects,
      modelServingProjects,
      nonActiveProjects,
      getPreferredProject,
      updatePreferredProject,
      loaded,
      loadError,
      waitForProject,
    ],
  );

  return <ProjectsContext.Provider value={contextValue}>{children}</ProjectsContext.Provider>;
};

export default ProjectsContextProvider;
