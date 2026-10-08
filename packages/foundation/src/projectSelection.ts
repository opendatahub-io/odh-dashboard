export type ProjectSelectionCandidate = { status: 'absent' } | { status: 'present'; name: string };

export type ProjectSelectionAccessors<T> = {
  /** Returns a non-empty identity that is unique within a provider collection. */
  getName: (project: T) => string;
  getDisplayName: (project: T) => string | undefined;
};

export type ProjectSelectionList<T> =
  | { status: 'available'; projects: readonly T[] }
  | { status: 'list-unavailable'; providerValidatedProjects: readonly T[] };

export type ProjectSelectionResolution<T> =
  | {
      status: 'selected';
      activeProject: T;
      source: 'route' | 'storage' | 'fallback' | 'current';
    }
  | {
      status: 'pending-validation';
      activeProject: T | null;
      candidate: string;
    }
  | { status: 'invalid-route'; activeProject: T | null; candidate: string }
  | { status: 'none'; activeProject: null };

type ResolveProjectSelectionOptions<T> = {
  list: ProjectSelectionList<T>;
  routeCandidate: ProjectSelectionCandidate;
  storedProjectName: string | null;
  activeProject: T | null;
  getName: (project: T) => string;
  isAiProject: (project: T) => boolean;
};

// A fixed locale keeps ordering deterministic across browser locales.
const labelCollator = new Intl.Collator('en', { numeric: true, sensitivity: 'base' });

const getLabel = <T>(project: T, accessors: ProjectSelectionAccessors<T>): string =>
  accessors.getDisplayName(project)?.trim() || accessors.getName(project);

export const orderProjectSelectionProjects = <T>(
  projects: readonly T[],
  accessors: ProjectSelectionAccessors<T>,
): T[] =>
  // eslint-disable-next-line no-restricted-properties -- The copy keeps sorting immutable for consumers without ES2023 types.
  [...projects].sort((projectA, projectB) => {
    const labelComparison = labelCollator.compare(
      getLabel(projectA, accessors),
      getLabel(projectB, accessors),
    );
    if (labelComparison !== 0) {
      return labelComparison;
    }

    const nameA = accessors.getName(projectA);
    const nameB = accessors.getName(projectB);
    return labelCollator.compare(nameA, nameB) || (nameA < nameB ? -1 : nameA > nameB ? 1 : 0);
  });

const findByName = <T>(
  projects: readonly T[],
  name: string,
  getName: (project: T) => string,
): T | undefined => projects.find((project) => getName(project) === name);

export const resolveProjectSelection = <T>({
  list,
  routeCandidate,
  storedProjectName,
  activeProject,
  getName,
  isAiProject,
}: ResolveProjectSelectionOptions<T>): ProjectSelectionResolution<T> => {
  const projects = list.status === 'available' ? list.projects : list.providerValidatedProjects;
  const current = activeProject
    ? findByName(projects, getName(activeProject), getName) ?? null
    : null;

  const candidate =
    routeCandidate.status === 'present'
      ? { name: routeCandidate.name, source: 'route' as const }
      : storedProjectName
      ? { name: storedProjectName, source: 'storage' as const }
      : null;

  if (candidate) {
    const match = findByName(projects, candidate.name, getName);
    if (match) {
      return { status: 'selected', activeProject: match, source: candidate.source };
    }
    if (list.status === 'list-unavailable') {
      return {
        status: 'pending-validation',
        activeProject: current,
        candidate: candidate.name,
      };
    }
    if (candidate.source === 'route') {
      return { status: 'invalid-route', activeProject: current, candidate: candidate.name };
    }
  }

  if (list.status === 'available') {
    const fallback = projects.find(isAiProject) ?? projects[0];
    return fallback
      ? { status: 'selected', activeProject: fallback, source: 'fallback' }
      : { status: 'none', activeProject: null };
  }

  return current
    ? { status: 'selected', activeProject: current, source: 'current' }
    : { status: 'none', activeProject: null };
};
