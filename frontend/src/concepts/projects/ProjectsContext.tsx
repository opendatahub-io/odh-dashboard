import * as React from 'react';
import useFetchState, { FetchState } from '~/utilities/useFetchState';
import { getDSGProjects } from '~/api';
import { KnownLabels, ProjectKind } from '~/k8sTypes';

type ProjectFetchState = FetchState<ProjectKind[]>;
type ProjectsContext = {
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
  updatePreferredProject: (project: ProjectKind) => void;
  refresh: (waitForName?: string) => Promise<void>;

  // ...the rest of the state variables
  loaded: ProjectFetchState[1];
  loadError: ProjectFetchState[2];
};

export const ProjectsContext = React.createContext<ProjectsContext>({
  projects: [],
  modelServingProjects: [],
  nonActiveProjects: [],
  preferredProject: null,
  updatePreferredProject: () => undefined,
  loaded: false,
  loadError: new Error('Not in project provider'),
  refresh: () => Promise.resolve(),
});

/** Allow for name to be not passed; won't match, but ease of use. */
type GetByName = (name?: string) => Parameters<Array<ProjectKind>['find']>[0];
export const byName: GetByName = (name) => (project) => project.metadata.name === name;

type ProjectsProviderProps = {
  children: React.ReactNode;
};

const ProjectsContextProvider: React.FC<ProjectsProviderProps> = ({ children }) => {
  const fetchProjects = React.useCallback(() => getDSGProjects(), []);
  const [preferredProject, setPreferredProject] =
    React.useState<ProjectsContext['preferredProject']>(null);
  const [projectData, loaded, loadError, refreshProjects] = useFetchState<ProjectKind[]>(
    fetchProjects,
    [],
  );

  const { projects, modelServingProjects, nonActiveProjects } = React.useMemo(
    () =>
      projectData.reduce<{
        projects: ProjectKind[];
        modelServingProjects: ProjectKind[];
        nonActiveProjects: ProjectKind[];
      }>(
        (states, project) => {
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

          return states;
        },
        { projects: [], modelServingProjects: [], nonActiveProjects: [] },
      ),
    [projectData],
  );

  const refresh = React.useCallback<ProjectsContext['refresh']>(
    (waitForName?: string) =>
      new Promise((resolve) => {
        // Projects take a moment to appear in K8s due to their shell version of Namespaces
        // TODO: When we have webhooks -- remove this
        const doRefreshAgain = () => {
          setTimeout(
            () =>
              // refresh until we find the name we are expecting
              refreshProjects().then((projects) => {
                if (!waitForName || projects?.find(byName(waitForName))) {
                  resolve();
                  return;
                }
                doRefreshAgain();
              }),
            500,
          );
        };
        doRefreshAgain();
      }),
    [refreshProjects],
  );

  const updatePreferredProject = React.useCallback<ProjectsContext['updatePreferredProject']>(
    (project) => {
      setPreferredProject(project);
    },
    [],
  );

  return (
    <ProjectsContext.Provider
      value={{
        projects,
        modelServingProjects,
        nonActiveProjects,
        preferredProject,
        updatePreferredProject,
        loaded,
        loadError,
        refresh,
      }}
    >
      {children}
    </ProjectsContext.Provider>
  );
};

export default ProjectsContextProvider;
