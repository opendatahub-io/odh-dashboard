import { resolveWorkingProject } from '@odh-dashboard/foundation';
import type {
  ResolveWorkingProjectInput,
  WorkingProjectIdentity,
  WorkingProjectList,
  WorkingProjectResolution,
} from '@odh-dashboard/foundation';
import { persistWorkingProject, readStoredWorkingProjectName } from './workingProjectStorage';

type ResolvePersistedWorkingProjectInput<T extends WorkingProjectIdentity> = Omit<
  ResolveWorkingProjectInput<T>,
  'storedName'
> & {
  storage: Pick<Storage, 'getItem'>;
};

/**
 * Resolve against stored input without writing. Route adapters supply the candidate
 * and own URL changes. Persist only after the host commits the result.
 */
export const resolvePersistedWorkingProject = <T extends WorkingProjectIdentity>({
  storage,
  ...input
}: ResolvePersistedWorkingProjectInput<T>): WorkingProjectResolution<T> =>
  resolveWorkingProject({
    ...input,
    storedName: input.route === null ? readStoredWorkingProjectName(storage) : null,
  });

/**
 * Call only after the host confirms that this result still matches its route and selection.
 * Recheck the provider's current known set so an old result cannot persist a removed project.
 */
export const persistResolvedWorkingProject = <T extends WorkingProjectIdentity>(
  storage: Pick<Storage, 'getItem' | 'setItem'>,
  result: WorkingProjectResolution<T>,
  list: WorkingProjectList<T>,
): boolean => {
  if (!result.activeProject) {
    return false;
  }

  const providerKnownProjects = list.status === 'listed' ? list.projects : [];
  return persistWorkingProject(storage, result.activeProject, providerKnownProjects);
};
