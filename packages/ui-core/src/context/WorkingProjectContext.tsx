import * as React from 'react';
import type { WorkingProjectIdentity } from '@odh-dashboard/foundation';

/** The existing ui-core contract shares the platform-neutral identity with the resolution policy. */
export type ProjectIdentity = WorkingProjectIdentity;

/** Lifecycle of the host's project source as exposed through the working-project context. */
export type WorkingProjectStatus =
  /** No working-project provider is mounted above the consumer. */
  | 'provider-absent'
  /** The host's project source is loading; previously supplied projects may be stale. */
  | 'loading'
  /** Listing succeeded and the supplied list contains at least one project. */
  | 'listed'
  /** Listing succeeded with an empty supplied list; this is not an authorization verdict. */
  | 'empty-list'
  /** Projects cannot be listed; individually validated projects may still be available. */
  | 'listing-unavailable'
  /** The host's project source failed, not the React provider itself. */
  | 'project-source-error';

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
  status?: 'loading' | 'listed' | 'listing-unavailable' | 'project-source-error';
};

export const WorkingProjectContext = React.createContext<WorkingProjectContextType>({
  status: 'provider-absent',
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
    sourceStatus === 'loading' || sourceStatus === 'project-source-error' ? noProjects : projects;
  const status: WorkingProjectStatus =
    sourceStatus === 'listed' && knownProjects.length === 0 ? 'empty-list' : sourceStatus;
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
