import * as React from 'react';
import type { WorkingProjectIdentity } from '@odh-dashboard/foundation';

/** The existing ui-core contract shares the platform-neutral identity with the resolution policy. */
export type ProjectIdentity = WorkingProjectIdentity;

/** `listing-unavailable` means projects cannot be listed; access to specific projects is unknown. */
export type WorkingProjectStatus =
  | 'absent'
  | 'loading'
  | 'listed'
  | 'empty'
  | 'listing-unavailable'
  | 'error';

export type WorkingProjectContextType = {
  status: WorkingProjectStatus;
  projects: readonly ProjectIdentity[];
  activeProject: ProjectIdentity | null;
  selectProject: (project: ProjectIdentity) => void;
};

export type WorkingProjectProviderProps = {
  children: React.ReactNode;
  projects: readonly ProjectIdentity[];
  activeProject: ProjectIdentity | null;
  onProjectChange: (project: ProjectIdentity) => void;
  /** Omit for a successfully listed source; only a host adapter knows its lifecycle. */
  status?: 'loading' | 'listed' | 'listing-unavailable' | 'error';
};

export const WorkingProjectContext = React.createContext<WorkingProjectContextType>({
  status: 'absent',
  projects: [],
  activeProject: null,
  selectProject: () => undefined,
});

const noProjects: readonly ProjectIdentity[] = [];

export const WorkingProjectProvider: React.FC<WorkingProjectProviderProps> = ({
  children,
  projects,
  activeProject,
  onProjectChange,
  status: sourceStatus = 'listed',
}) => {
  // A list supplied while loading or after an error may be stale. With listing unavailable,
  // only identities explicitly supplied by the host have been validated.
  const knownProjects =
    sourceStatus === 'loading' || sourceStatus === 'error' ? noProjects : projects;
  const status: WorkingProjectStatus =
    sourceStatus === 'listed' && knownProjects.length === 0 ? 'empty' : sourceStatus;
  const knownActiveProject =
    knownProjects.find(({ name }) => name === activeProject?.name) ??
    (status === 'listed' ? knownProjects[0] : null) ??
    null;

  const selectProject = React.useCallback(
    (project: ProjectIdentity): void => {
      const selectableProject = knownProjects.find(({ name }) => name === project.name);

      if (selectableProject) {
        onProjectChange(selectableProject);
      }
    },
    [onProjectChange, knownProjects],
  );

  const value = React.useMemo(
    () => ({ status, projects: knownProjects, activeProject: knownActiveProject, selectProject }),
    [status, knownProjects, knownActiveProject, selectProject],
  );

  return <WorkingProjectContext.Provider value={value}>{children}</WorkingProjectContext.Provider>;
};

export const useWorkingProject = (): WorkingProjectContextType =>
  React.useContext(WorkingProjectContext);
