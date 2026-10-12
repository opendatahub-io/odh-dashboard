import * as React from 'react';
import type { WorkingProjectIdentity } from '@odh-dashboard/foundation';

/** The existing ui-core contract shares the platform-neutral identity with the resolution policy. */
export type ProjectIdentity = WorkingProjectIdentity;

export type WorkingProjectContextType = {
  projects: readonly ProjectIdentity[];
  activeProject: ProjectIdentity | null;
  selectProject: (project: ProjectIdentity) => void;
};

export type WorkingProjectProviderProps = {
  children: React.ReactNode;
  projects: readonly ProjectIdentity[];
  activeProject: ProjectIdentity | null;
  onProjectChange: (project: ProjectIdentity) => void;
};

export const WorkingProjectContext = React.createContext<WorkingProjectContextType>({
  projects: [],
  activeProject: null,
  selectProject: () => undefined,
});

export const WorkingProjectProvider: React.FC<WorkingProjectProviderProps> = ({
  children,
  projects,
  activeProject,
  onProjectChange,
}) => {
  const knownActiveProject = projects.find(({ name }) => name === activeProject?.name) ?? null;

  const selectProject = React.useCallback(
    (project: ProjectIdentity): void => {
      const selectableProject = projects.find(({ name }) => name === project.name);

      if (selectableProject) {
        onProjectChange(selectableProject);
      }
    },
    [onProjectChange, projects],
  );

  const value = React.useMemo(
    () => ({ projects, activeProject: knownActiveProject, selectProject }),
    [projects, knownActiveProject, selectProject],
  );

  return <WorkingProjectContext.Provider value={value}>{children}</WorkingProjectContext.Provider>;
};

export const useWorkingProject = (): WorkingProjectContextType =>
  React.useContext(WorkingProjectContext);
