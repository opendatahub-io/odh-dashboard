import * as React from 'react';
import { useSearchParams } from 'react-router-dom';
import { useProjects } from '~/api';
import { FetchState } from '~/utilities/useFetchState';
import { KnownLabels, ProjectKind } from '~/k8sTypes';
import { useDashboardNamespace } from '~/redux/selectors';
import { getDisplayNameFromK8sResource } from '~/concepts/k8s/utils';
import { useBrowserStorage } from '~/components/browserStorage';
import { isAvailableProject } from './utils';

const projectSorter = (projectA: ProjectKind, projectB: ProjectKind) =>
  getDisplayNameFromK8sResource(projectA).localeCompare(getDisplayNameFromK8sResource(projectB));

type ProjectFetchState = FetchState<ProjectKind[]>;
type ProjectsContextType = {
  projects: ProjectKind[];
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
  altProjectNav: boolean;
};

export const ProjectsContext = React.createContext<ProjectsContextType>({
  projects: [],
  modelServingProjects: [],
  nonActiveProjects: [],
  preferredProject: null,
  updatePreferredProject: () => undefined,
  loaded: false,
  loadError: new Error('Not in project provider'),
  waitForProject: () => Promise.resolve(),
  altProjectNav: false,
});

/** Allow for name to be not passed; won't match, but ease of use. */
type GetByName = (name?: string) => Parameters<Array<ProjectKind>['find']>[0];
export const byName: GetByName = (name) => (project) => project.metadata.name === name;

const ALT_NAV_PARAM = 'altNav';
const POC_SESSION_KEY = 'odh-poc-flags';

type PocConfigType = {
  altNav?: boolean;
};

type ProjectsProviderProps = {
  children: React.ReactNode;
};

const ProjectsContextProvider: React.FC<ProjectsProviderProps> = ({ children }) => {
  const [preferredProject, setPreferredProject] =
    React.useState<ProjectsContextType['preferredProject']>(null);
  const [projectData, loaded, loadError] = useProjects();
  const { dashboardNamespace } = useDashboardNamespace();
  const [searchParams, setSearchParams] = useSearchParams();
  const [altProjectNav, setAltProjectNav] = React.useState<boolean>(false);
  const firstLoad = React.useRef(true);
  const [pocConfig, setPocConfig] = useBrowserStorage<PocConfigType | null>(
    POC_SESSION_KEY,
    null,
    true,
    true,
  );

  React.useEffect(() => {
    if (firstLoad.current && pocConfig?.altNav) {
      setAltProjectNav(true);
    }
    firstLoad.current = false;
  }, [pocConfig]);

  React.useEffect(() => {
    if (searchParams.has(ALT_NAV_PARAM)) {
      const updated = searchParams.get(ALT_NAV_PARAM) === 'true';
      setAltProjectNav(updated);
      setPocConfig({ altNav: updated });

      // clean up query string
      searchParams.delete(ALT_NAV_PARAM);
      setSearchParams(searchParams, { replace: true });
    }
    // do not react to changes to setters
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

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
      preferredProject,
      updatePreferredProject: setPreferredProject,
      loaded,
      loadError,
      waitForProject,
      altProjectNav,
    }),
    [
      projects,
      modelServingProjects,
      nonActiveProjects,
      preferredProject,
      setPreferredProject,
      loaded,
      loadError,
      waitForProject,
      altProjectNav,
    ],
  );

  return <ProjectsContext.Provider value={contextValue}>{children}</ProjectsContext.Provider>;
};

export default ProjectsContextProvider;
