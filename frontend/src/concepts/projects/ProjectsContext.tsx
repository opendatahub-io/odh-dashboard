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
  // ...the rest of the state variables
  loaded: ProjectFetchState[1];
  loadError: ProjectFetchState[2];
  refresh: ProjectFetchState[3];
};

export const ProjectsContext = React.createContext<ProjectsContext>({
  projects: [],
  modelServingProjects: [],
  nonActiveProjects: [],
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
            states.projects.push(project);
            if (project.metadata.labels?.[KnownLabels.MODEL_SERVING_PROJECT]) {
              states.modelServingProjects.push(project);
            }
          } else {
            states.nonActiveProjects.push(project);
          }

          return states;
        },
        { projects: [], modelServingProjects: [], nonActiveProjects: [] },
      ),
    [projectData],
  );

  const refresh = React.useCallback<ProjectsContext['refresh']>(
    () =>
      new Promise((resolve) => {
        refreshProjects();
        // Projects take a moment to appear in K8s due to their shell version of Namespaces
        // TODO: When we have webhooks -- remove this
        setTimeout(() => {
          refreshProjects().then(() => {
            resolve();
          });
        }, 500);
      }),
    [refreshProjects],
  );

  return (
    <ProjectsContext.Provider
      value={{
        projects,
        modelServingProjects,
        nonActiveProjects,
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
