import * as React from 'react';
import type { RouteProjectInput, WorkingProjectIdentity } from '@odh-dashboard/foundation';

/** The existing ui-core contract shares the platform-neutral identity with the resolution policy. */
export type ProjectIdentity = WorkingProjectIdentity;

/** A mounted surface owns the destination URL for an externally synchronized selection. */
export type WorkingProjectNavigationTransaction = {
  commit: () => void;
  cancel: () => void;
};

export type WorkingProjectNavigation = (
  project: ProjectIdentity,
  transaction: WorkingProjectNavigationTransaction,
) => void;

/** Lifecycle of the host's project source as exposed through the working-project context. */
export const WorkingProjectStatusValue = {
  /** No working-project provider is mounted above the consumer. */
  ProviderAbsent: 'provider-absent',
  /** The host is still loading the project source. */
  Loading: 'loading',
  /** The project source is available and an active project is selected. */
  Listed: 'listed',
  /** The project source loaded successfully, but no projects are available. */
  EmptyList: 'empty-list',
  /** Projects are available, but no project is currently selected. */
  NoProjectSelected: 'no-project-selected',
  /** The host cannot list projects, but may provide individually validated identities. */
  ListingUnavailable: 'listing-unavailable',
  /** The host project source failed to load. */
  ProjectSourceError: 'project-source-error',
  /** The current route names a project that is not available. */
  RouteInvalid: 'route-invalid',
} as const;

export type WorkingProjectStatus =
  (typeof WorkingProjectStatusValue)[keyof typeof WorkingProjectStatusValue];

export const WorkingProjectStatusLabelValue: Record<WorkingProjectStatus, string> = {
  /** Displayed when no provider is mounted or the project source is unavailable. */
  [WorkingProjectStatusValue.ProviderAbsent]: 'Projects unavailable',
  /** Displayed while the host is loading projects. */
  [WorkingProjectStatusValue.Loading]: 'Loading projects',
  /** Active projects use a dynamic `Project: <name>` label instead. */
  [WorkingProjectStatusValue.Listed]: '',
  /** Displayed when the project list is empty. */
  [WorkingProjectStatusValue.EmptyList]: 'No projects',
  /** Displayed when projects exist but no project is selected. */
  [WorkingProjectStatusValue.NoProjectSelected]: 'No project selected',
  /** Displayed when the host cannot list projects but has not reported a source error. */
  [WorkingProjectStatusValue.ListingUnavailable]: 'Projects unavailable',
  /** Displayed when the host project source fails. */
  [WorkingProjectStatusValue.ProjectSourceError]: 'Projects unavailable',
  /** Invalid routes do not select the unavailable project. */
  [WorkingProjectStatusValue.RouteInvalid]: 'No project selected',
};

export const WorkingProjectSelectorLabelValue = {
  /** Title used by the project-selection modal. */
  ModalTitle: 'Working project',
} as const;

export type WorkingProjectContextType = {
  status: WorkingProjectStatus;
  projects: readonly ProjectIdentity[];
  activeProject: ProjectIdentity | null;
  /** Hosts may return a promise when selection requires access validation. */
  selectProject: (project: ProjectIdentity) => void | Promise<void>;
  /** Optional host-owned discovery; no API or persistence behavior lives in ui-core. */
  discoverProject?: (name: string, signal: AbortSignal) => Promise<ProjectIdentity>;
  rememberProject?: (name: string, signal: AbortSignal) => Promise<void>;
  registerProjectNavigation?: (navigate: WorkingProjectNavigation) => () => void;
  /** Mark a route that writes its URL project into the preference. */
  registerProjectRouteSync?: (route?: RouteProjectInput) => () => void;
  cancelProjectNavigation?: () => void;
  /** Register the mounted unsaved-change blocker's reset, without sharing route shapes. */
  registerProjectNavigationBlocker?: (reset: () => void) => () => void;
};

export type WorkingProjectProviderProps = {
  children: React.ReactNode;
  projects: readonly ProjectIdentity[];
  activeProject: ProjectIdentity | null;
  onProjectChange: WorkingProjectContextType['selectProject'];
  discoverProject?: WorkingProjectContextType['discoverProject'];
  rememberProject?: WorkingProjectContextType['rememberProject'];
  registerProjectNavigation?: (navigate: WorkingProjectNavigation) => () => void;
  registerProjectRouteSync?: (route?: RouteProjectInput) => () => void;
  cancelProjectNavigation?: () => void;
  registerProjectNavigationBlocker?: (reset: () => void) => () => void;
  /** Omit for a successfully listed source; only a host adapter knows its lifecycle. */
  status?: Exclude<WorkingProjectStatus, 'provider-absent' | 'empty-list' | 'no-project-selected'>;
};

export const WorkingProjectContext = React.createContext<WorkingProjectContextType>({
  status: WorkingProjectStatusValue.ProviderAbsent,
  projects: [],
  activeProject: null,
  selectProject: () => undefined,
});

const noProjects: readonly ProjectIdentity[] = [];

const getWorkingProjectStatus = (
  sourceStatus: NonNullable<WorkingProjectProviderProps['status']>,
  projects: readonly ProjectIdentity[],
  activeProject: ProjectIdentity | null,
): WorkingProjectStatus => {
  if (sourceStatus !== WorkingProjectStatusValue.Listed) {
    return sourceStatus;
  }

  if (projects.length === 0) {
    return WorkingProjectStatusValue.EmptyList;
  }

  return activeProject && projects.some(({ name }) => name === activeProject.name)
    ? WorkingProjectStatusValue.Listed
    : WorkingProjectStatusValue.NoProjectSelected;
};

export const WorkingProjectProvider: React.FC<WorkingProjectProviderProps> = ({
  children,
  projects,
  activeProject,
  onProjectChange,
  discoverProject,
  rememberProject,
  registerProjectNavigation,
  registerProjectRouteSync,
  cancelProjectNavigation,
  registerProjectNavigationBlocker,
  status: sourceStatus = WorkingProjectStatusValue.Listed,
}) => {
  // A list supplied while loading or after an error may be stale. With listing unavailable,
  // only identities explicitly supplied by the host have been validated.
  const knownProjects =
    sourceStatus === WorkingProjectStatusValue.Loading ||
    sourceStatus === WorkingProjectStatusValue.ProjectSourceError
      ? noProjects
      : projects;
  const status = getWorkingProjectStatus(sourceStatus, knownProjects, activeProject);
  const knownActiveProject = knownProjects.find(({ name }) => name === activeProject?.name) ?? null;

  const selectProject = React.useCallback(
    (project: ProjectIdentity): void | Promise<void> => {
      const selectableProject = knownProjects.find(({ name }) => name === project.name);

      if (selectableProject) {
        return onProjectChange(selectableProject);
      }
    },
    [onProjectChange, knownProjects],
  );

  const value = React.useMemo(
    () => ({
      status,
      projects: knownProjects,
      activeProject: knownActiveProject,
      selectProject,
      discoverProject,
      rememberProject,
      ...(registerProjectNavigation && { registerProjectNavigation }),
      ...(registerProjectRouteSync && { registerProjectRouteSync }),
      ...(cancelProjectNavigation && { cancelProjectNavigation }),
      ...(registerProjectNavigationBlocker && { registerProjectNavigationBlocker }),
    }),
    [
      status,
      knownProjects,
      knownActiveProject,
      selectProject,
      discoverProject,
      rememberProject,
      registerProjectNavigation,
      registerProjectRouteSync,
      cancelProjectNavigation,
      registerProjectNavigationBlocker,
    ],
  );

  return <WorkingProjectContext.Provider value={value}>{children}</WorkingProjectContext.Provider>;
};

export const useWorkingProject = (): WorkingProjectContextType =>
  React.useContext(WorkingProjectContext);
