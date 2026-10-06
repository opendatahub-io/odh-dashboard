import * as React from 'react';

export type ProjectIdentity = {
  name: string;
  displayName?: string;
};

export type WorkingProjectState =
  | { status: 'absent' }
  | { status: 'loading' }
  | {
      status: 'ready';
      projects: [ProjectIdentity, ...ProjectIdentity[]];
      activeProject: ProjectIdentity;
    }
  | { status: 'empty'; projects: []; activeProject: null }
  | {
      status: 'list-unavailable';
      knownProjects: ProjectIdentity[];
      activeProject: ProjectIdentity | null;
    }
  | { status: 'error'; error: Error };

export type ProvidedWorkingProjectState = Exclude<WorkingProjectState, { status: 'absent' }>;

export type WorkingProjectContextType = {
  state: WorkingProjectState;
  selectProject: (project: ProjectIdentity) => void;
};

export type WorkingProjectProviderProps = {
  children: React.ReactNode;
  state: ProvidedWorkingProjectState;
  onProjectChange: (project: ProjectIdentity) => void;
};

const absentState: WorkingProjectState = { status: 'absent' };

export const WorkingProjectContext = React.createContext<WorkingProjectContextType>({
  state: absentState,
  selectProject: () => undefined,
});

const getKnownProjects = (state: WorkingProjectState): ProjectIdentity[] => {
  switch (state.status) {
    case 'ready':
      return state.projects;
    case 'list-unavailable':
      return state.knownProjects;
    case 'absent':
    case 'loading':
    case 'empty':
    case 'error':
      return [];
  }
};

export const WorkingProjectProvider: React.FC<WorkingProjectProviderProps> = ({
  children,
  state,
  onProjectChange,
}) => {
  const providerState = React.useMemo<WorkingProjectState>(() => {
    if (state.status === 'ready') {
      const activeProject = state.projects.find(({ name }) => name === state.activeProject.name);

      if (!activeProject) {
        return {
          status: 'error',
          error: new Error('The active project must belong to the provider-known project set.'),
        };
      }

      return activeProject === state.activeProject ? state : { ...state, activeProject };
    }

    if (state.status === 'list-unavailable' && state.activeProject) {
      const activeProject = state.knownProjects.find(
        ({ name }) => name === state.activeProject?.name,
      );

      if (!activeProject) {
        return { ...state, activeProject: null };
      }

      return activeProject === state.activeProject ? state : { ...state, activeProject };
    }

    return state;
  }, [state]);

  const selectProject = React.useCallback(
    (project: ProjectIdentity): void => {
      const knownProject = getKnownProjects(providerState).find(
        ({ name }) => name === project.name,
      );

      if (knownProject) {
        onProjectChange(knownProject);
      }
    },
    [onProjectChange, providerState],
  );

  const value = React.useMemo(
    () => ({ state: providerState, selectProject }),
    [providerState, selectProject],
  );

  return <WorkingProjectContext.Provider value={value}>{children}</WorkingProjectContext.Provider>;
};

export const useWorkingProject = (): WorkingProjectContextType =>
  React.useContext(WorkingProjectContext);
