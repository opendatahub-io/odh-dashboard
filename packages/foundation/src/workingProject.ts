/** Platform-neutral resource identity. Hosts decide accessibility. */
export interface WorkingProjectIdentity {
  name: string;
  displayName?: string;
}

/**
 * Route parsing belongs to the surface; a viewed-project URL is not a working-project route.
 * A route project name is not active until the provider confirms existence and access.
 */
export type RouteProjectInput = null | { kind: 'invalid' } | { kind: 'project'; name: string };

export type WorkingProjectList<T extends WorkingProjectIdentity> =
  | { status: 'listed'; projects: readonly T[] }
  | { status: 'loading' }
  | { status: 'error' };

export interface WorkingProjectResolution<T extends WorkingProjectIdentity> {
  /** The same ordered collection should be used by the selector and default selection. */
  orderedProjects: T[];
  activeProject: T | null;
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
}

export const resolveWorkingProject = <T extends WorkingProjectIdentity>({
  list,
  route,
  storedName,
  isAiProject,
  currentName,
}: ResolveWorkingProjectInput<T>): WorkingProjectResolution<T> => {
  const orderedProjects = list.status === 'listed' ? orderWorkingProjects(list.projects) : [];
  const find = (name: string | null | undefined): T | null =>
    orderedProjects.find((project) => project.name === name) ?? null;
  const requestedName = route?.kind === 'project' ? route.name : route === null ? storedName : null;

  if (route?.kind === 'invalid') {
    return {
      orderedProjects,
      activeProject: null,
    };
  }

  if (list.status !== 'listed') {
    return {
      orderedProjects,
      activeProject: null,
    };
  }

  // A missing deep link is not a request for another project's data. The only
  // exception is removal of the project that was already active in this session.
  if (route?.kind === 'project' && !find(route.name) && currentName !== route.name) {
    return {
      orderedProjects,
      activeProject: null,
    };
  }

  const match = find(requestedName);
  if (match) {
    return {
      orderedProjects,
      activeProject: match,
    };
  }
  // AI preference applies only to fallback; a valid route or stored non-AI project still wins.
  const defaultProject = orderedProjects.length
    ? orderedProjects.find((project) => isAiProject?.(project)) ?? orderedProjects[0]
    : null;
  return {
    orderedProjects,
    activeProject: defaultProject,
  };
};
