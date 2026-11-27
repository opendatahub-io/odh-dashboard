import * as React from 'react';
import { parseStoredWorkingProjectName } from '../context/workingProjectStorage';

type RecentProjectsOptions<T> = {
  storageKey: string;
  enabled: boolean;
  /** Return null for confirmed unavailable entries; reject retryable failures. Keep stable. */
  validateProject: (name: string, signal: AbortSignal) => Promise<T | null>;
  /** Publish a validated resource without selecting it. Keep this callback stable. */
  onProjectRestored: (project: T) => void;
};

const MAX_RECENT_PROJECTS = 10;

const isProjectName = (name: unknown): name is string =>
  typeof name === 'string' && parseStoredWorkingProjectName(JSON.stringify(name)) === name;

const readRecentNames = (storageKey: string): string[] => {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(storageKey) ?? '[]');
    return Array.isArray(raw)
      ? [...new Set(raw.filter(isProjectName))].slice(0, MAX_RECENT_PROJECTS)
      : [];
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
  const rememberVersion = React.useRef(0);
  React.useEffect(() => {
    if (!enabled) {
      return;
    }
    const controller = new AbortController();
    let snapshot: string | null;
    try {
      snapshot = localStorage.getItem(storageKey);
    } catch {
      return;
    }
    const version = rememberVersion.current;
    const names = readRecentNames(storageKey);
    const stale = new Set<string>();
    void Promise.all(
      names.map(async (name) => {
        try {
          const project = await validateProject(name, controller.signal);
          if (!controller.signal.aborted) {
            if (project === null) {
              stale.add(name);
            } else {
              onProjectRestored(project);
            }
          }
        } catch {
          // Retry transient failures on a future load, without blocking other entries.
        }
      }),
    ).then(() => {
      if (controller.signal.aborted || stale.size === 0 || rememberVersion.current !== version) {
        return;
      }
      try {
        // Never overwrite additions made while restoration was in flight, including other tabs.
        if (localStorage.getItem(storageKey) === snapshot) {
          localStorage.setItem(
            storageKey,
            JSON.stringify(names.filter((name) => !stale.has(name))),
          );
        }
      } catch {
        // Storage cleanup is optional.
      }
    });
    return () => controller.abort();
  }, [enabled, storageKey, validateProject, onProjectRestored]);

  return React.useCallback(
    (name: string) => {
      if (!isProjectName(name)) {
        return;
      }
      rememberVersion.current += 1;
      try {
        localStorage.setItem(
          storageKey,
          JSON.stringify(
            [name, ...readRecentNames(storageKey).filter((item) => item !== name)].slice(
              0,
              MAX_RECENT_PROJECTS,
            ),
          ),
        );
      } catch {
        // Browser storage is optional; the provider retains its in-memory resource.
      }
    },
    [storageKey],
  );
};
