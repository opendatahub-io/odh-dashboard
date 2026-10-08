import type { ProjectIdentity } from './WorkingProjectContext';
import { PREFERRED_NAMESPACE_STORAGE_KEY } from './getStoredPreferredProject';

/** Accept the existing JSON-stringified format and older unquoted namespace values. */
export const parseStoredWorkingProjectName = (raw: string | null): string | null => {
  if (!raw) {
    return null;
  }
  let name: unknown;
  try {
    name = JSON.parse(raw);
  } catch {
    name = raw;
  }
  return typeof name === 'string' && name.length > 0 ? name : null;
};

export const readStoredWorkingProjectName = (storage: Pick<Storage, 'getItem'>): string | null => {
  try {
    return parseStoredWorkingProjectName(storage.getItem(PREFERRED_NAMESPACE_STORAGE_KEY));
  } catch {
    return null;
  }
};

/** Only a provider-known, accessible identity may be persisted. Never clear storage on a failed lookup. */
export const persistWorkingProject = <T extends ProjectIdentity>(
  storage: Pick<Storage, 'getItem' | 'setItem'>,
  project: ProjectIdentity,
  providerKnownProjects: readonly T[],
): boolean => {
  const known = providerKnownProjects.find(({ name }) => name === project.name);
  if (!known || !known.name) {
    return false;
  }
  try {
    // Avoid redundant writes, including when the existing value is a legacy raw string.
    if (
      parseStoredWorkingProjectName(storage.getItem(PREFERRED_NAMESPACE_STORAGE_KEY)) !== known.name
    ) {
      storage.setItem(PREFERRED_NAMESPACE_STORAGE_KEY, JSON.stringify(known.name));
    }
    return true;
  } catch {
    // Persistence must not block in-memory selection or navigation.
    return false;
  }
};
