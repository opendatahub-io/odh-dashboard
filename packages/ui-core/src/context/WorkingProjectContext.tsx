import * as React from 'react';

export type ProjectIdentity = {
  name: string;
  displayName?: string;
};

export type WorkingProjectSelectionState =
  | { status: 'provider-absent' }
  | { status: 'loading' }
  | {
      status: 'ready';
      projects: [ProjectIdentity, ...ProjectIdentity[]];
      activeProject: ProjectIdentity;
    }
  | { status: 'no-accessible-projects'; projects: []; activeProject: null }
  | {
      status: 'invalid-route';
      candidate: string;
      projects: ProjectIdentity[];
      activeProject: ProjectIdentity | null;
    }
  | {
      status: 'list-unavailable';
      /** Identities individually validated by the provider; not a complete project list. */
      providerValidatedProjects: ProjectIdentity[];
      activeProject: ProjectIdentity | null;
    }
  | { status: 'provider-error'; error: Error };

export type ProvidedWorkingProjectState = Exclude<
  WorkingProjectSelectionState,
  { status: 'provider-absent' }
>;

export type WorkingProjectContextType = {
  state: WorkingProjectSelectionState;
  selectProject: (project: ProjectIdentity) => void;
};

export type WorkingProjectProviderProps = {
  children: React.ReactNode;
  state: ProvidedWorkingProjectState;
  onProjectChange: (project: ProjectIdentity) => void;
};

const providerAbsentState: WorkingProjectSelectionState = { status: 'provider-absent' };

export const WorkingProjectContext = React.createContext<WorkingProjectContextType>({
  state: providerAbsentState,
  selectProject: () => undefined,
});

const getSelectableProjects = (state: WorkingProjectSelectionState): ProjectIdentity[] => {
  switch (state.status) {
    case 'ready':
    case 'invalid-route':
      return state.projects;
    case 'list-unavailable':
      return state.providerValidatedProjects;
    case 'provider-absent':
    case 'loading':
    case 'no-accessible-projects':
    case 'provider-error':
      return [];
  }
};

export const WorkingProjectProvider: React.FC<WorkingProjectProviderProps> = ({
  children,
  state,
  onProjectChange,
}) => {
  const providerState = React.useMemo<WorkingProjectSelectionState>(() => {
    if (state.status === 'ready') {
      const activeProject = state.projects.find(({ name }) => name === state.activeProject.name);

      if (!activeProject) {
        return {
          status: 'provider-error',
          error: new Error('The active project must belong to the provider-known project set.'),
        };
      }

      return activeProject === state.activeProject ? state : { ...state, activeProject };
    }

    if (
      (state.status === 'list-unavailable' || state.status === 'invalid-route') &&
      state.activeProject
    ) {
      const projects =
        state.status === 'list-unavailable' ? state.providerValidatedProjects : state.projects;
      const activeProject = projects.find(({ name }) => name === state.activeProject?.name);

      if (!activeProject) {
        return { ...state, activeProject: null };
      }

      return activeProject === state.activeProject ? state : { ...state, activeProject };
    }

    return state;
  }, [state]);

  const selectProject = React.useCallback(
    (project: ProjectIdentity): void => {
      const selectableProject = getSelectableProjects(providerState).find(
        ({ name }) => name === project.name,
      );

      if (selectableProject) {
        onProjectChange(selectableProject);
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
