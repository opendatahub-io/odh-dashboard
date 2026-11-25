import * as React from 'react';
import { parseStoredWorkingProjectName } from '../context/workingProjectStorage';

type RecentProjectsOptions<T> = {
  storageKey: string;
  enabled: boolean;
  /** The provider owns lookup, authorization, and resource eligibility. Keep this callback stable. */
  validateProject: (name: string, signal: AbortSignal) => Promise<T>;
  /** Publish a validated resource without selecting it. Keep this callback stable. */
  onProjectRestored: (project: T) => void;
};

const isProjectName = (name: unknown): name is string =>
  typeof name === 'string' && parseStoredWorkingProjectName(JSON.stringify(name)) === name;

const readRecentNames = (storageKey: string): string[] => {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(storageKey) ?? '[]');
    return Array.isArray(raw) ? [...new Set(raw.filter(isProjectName))] : [];
  } catch {
    return [];
  }
};

/**
 * Stored names are candidates, never evidence of access. Restoration does not change selection.
 * Call the returned remember function only after the provider has validated an addition.
 */
export const useRecentProjects = <T>({
  storageKey,
  enabled,
  validateProject,
  onProjectRestored,
}: RecentProjectsOptions<T>): ((name: string) => void) => {
  React.useEffect(() => {
    if (!enabled) {
      return;
    }
    const controller = new AbortController();
    readRecentNames(storageKey).forEach((name) => {
      void Promise.resolve()
        .then(() =>
          controller.signal.aborted ? undefined : validateProject(name, controller.signal),
        )
        .then((project) => {
          if (!controller.signal.aborted && project !== undefined) {
            onProjectRestored(project);
          }
        })
        .catch(() => {
          // An inaccessible or missing recent entry must not prevent restoring other entries.
        });
    });
    return () => controller.abort();
  }, [enabled, storageKey, validateProject, onProjectRestored]);

  return React.useCallback(
    (name: string) => {
      if (!isProjectName(name)) {
        return;
      }
      try {
        localStorage.setItem(
          storageKey,
          JSON.stringify([name, ...readRecentNames(storageKey).filter((item) => item !== name)]),
        );
      } catch {
        // Browser storage is optional; the provider retains its in-memory resource.
      }
    },
    [storageKey],
  );
};
