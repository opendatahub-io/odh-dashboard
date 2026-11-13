/** Platform-neutral resource identity. Hosts decide accessibility. */
export interface WorkingProjectIdentity {
  name: string;
  displayName?: string;
}

export const RouteProjectKindValue = {
  Invalid: 'invalid',
  Project: 'project',
} as const;

export type RouteProjectKind = (typeof RouteProjectKindValue)[keyof typeof RouteProjectKindValue];

export const WorkingProjectListStatusValue = {
  /** The host successfully listed the available projects. */
  Listed: 'listed',
  /** Only individually validated identities are known; no default can be inferred. */
  ListingUnavailable: 'listing-unavailable',
  /** The host is still loading the project source. */
  Loading: 'loading',
  /** The host failed to load the project source. */
  Error: 'error',
} as const;

export type WorkingProjectListStatus =
  (typeof WorkingProjectListStatusValue)[keyof typeof WorkingProjectListStatusValue];

/**
 * Route parsing belongs to the surface; a viewed-project URL is not a working-project route.
 * A route project name is not active until the provider confirms existence and access.
 */
export type RouteProjectInput =
  | null
  | { kind: typeof RouteProjectKindValue.Invalid; recover?: (projectName: string) => void }
  | { kind: typeof RouteProjectKindValue.Project; name: string };

export type WorkingProjectList<T extends WorkingProjectIdentity> =
  | { status: typeof WorkingProjectListStatusValue.Listed; projects: readonly T[] }
  | {
      status: typeof WorkingProjectListStatusValue.ListingUnavailable;
      projects: readonly T[];
    }
  | { status: typeof WorkingProjectListStatusValue.Loading }
  | { status: typeof WorkingProjectListStatusValue.Error };

export interface WorkingProjectResolution<T extends WorkingProjectIdentity> {
  /** The same ordered collection should be used by the selector and default selection. */
  orderedProjects: T[];
  activeProject: T | null;
  /** Recovery state to carry until the route adapter replaces a removed-project URL. */
  removedRouteFallback: { routeName: string; projectName: string } | null;
}

const labelCollator = new Intl.Collator('en', { sensitivity: 'base', numeric: true });
const nameCollator = new Intl.Collator('en', { sensitivity: 'variant', numeric: true });

export const orderWorkingProjects = <T extends WorkingProjectIdentity>(
  projects: readonly T[],
): T[] =>
  // The backend TS lib does not expose toSorted; sort only a copy of the input.
  // eslint-disable-next-line no-restricted-properties -- copying preserves the caller's array
  [...projects].sort(
    (a, b) =>
      labelCollator.compare(a.displayName || a.name, b.displayName || b.name) ||
      nameCollator.compare(a.name, b.name) ||
      // A stable, total order even for names that collate as equivalent.
      (a.name < b.name ? -1 : a.name > b.name ? 1 : 0),
  );

export interface ResolveWorkingProjectInput<T extends WorkingProjectIdentity> {
  list: WorkingProjectList<T>;
  route: RouteProjectInput;
  storedName?: string | null;
  /** Hosts classify provider-known projects; RHOAI supplies its existing isAiProject behavior. */
  isAiProject?: (project: T) => boolean;
  /** Identifies a route project that was removed after being active in this session. */
  currentName?: string | null;
  /** Recovery state returned by the previous resolution while the route is still stale. */
  removedRouteFallback?: { routeName: string; projectName: string } | null;
}

export const resolveWorkingProject = <T extends WorkingProjectIdentity>({
  list,
  route,
  storedName,
  isAiProject,
  currentName,
  removedRouteFallback,
}: ResolveWorkingProjectInput<T>): WorkingProjectResolution<T> => {
  const orderedProjects =
    list.status === WorkingProjectListStatusValue.Listed ||
    list.status === WorkingProjectListStatusValue.ListingUnavailable
      ? orderWorkingProjects(list.projects)
      : [];
  const find = (name: string | null | undefined): T | null =>
    orderedProjects.find((project) => project.name === name) ?? null;
  const requestedName =
    route?.kind === RouteProjectKindValue.Project ? route.name : route === null ? storedName : null;

  if (route?.kind === RouteProjectKindValue.Invalid) {
    return {
      orderedProjects,
      activeProject: null,
      removedRouteFallback: null,
    };
  }

  if (list.status === WorkingProjectListStatusValue.ListingUnavailable) {
    return {
      orderedProjects,
      activeProject: find(requestedName) ?? find(currentName),
      removedRouteFallback: null,
    };
  }

  if (list.status !== WorkingProjectListStatusValue.Listed) {
    return {
      orderedProjects,
      activeProject: null,
      removedRouteFallback: null,
    };
  }

  // A missing deep link is not a request for another project's data. The only
  // exception is removal of the project that was already active in this session.
  if (route?.kind === RouteProjectKindValue.Project && !find(route.name)) {
    if (removedRouteFallback?.routeName === route.name) {
      const fallback = find(removedRouteFallback.projectName);
      if (fallback) {
        return {
          orderedProjects,
          activeProject: fallback,
          removedRouteFallback,
        };
      }
    }

    if (currentName !== route.name) {
      return {
        orderedProjects,
        activeProject: null,
        removedRouteFallback: null,
      };
    }
  }

  const match = find(requestedName);
  if (match) {
    return {
      orderedProjects,
      activeProject: match,
      removedRouteFallback: null,
    };
  }
  // AI preference applies only to fallback; a valid route or stored non-AI project still wins.
  const defaultProject = orderedProjects.length
    ? orderedProjects.find((project) => isAiProject?.(project)) ?? orderedProjects[0]
    : null;
  const shouldRetainRemovedRoute =
    route?.kind === RouteProjectKindValue.Project &&
    !find(route.name) &&
    currentName === route.name;
  return {
    orderedProjects,
    activeProject: defaultProject,
    removedRouteFallback:
      shouldRetainRemovedRoute && defaultProject
        ? { routeName: route.name, projectName: defaultProject.name }
        : null,
  };
};
