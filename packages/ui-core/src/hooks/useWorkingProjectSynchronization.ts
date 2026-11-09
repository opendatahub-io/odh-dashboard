import * as React from 'react';
import type { RouteProjectInput } from '@odh-dashboard/foundation';
import type {
  ProjectIdentity,
  WorkingProjectStatus,
} from '@odh-dashboard/ui-core/context/WorkingProjectContext';
import { PREFERRED_NAMESPACE_STORAGE_KEY } from '@odh-dashboard/ui-core/context/getStoredPreferredProject';
import {
  parseStoredWorkingProjectName,
  readStoredWorkingProjectName,
} from '@odh-dashboard/ui-core/context/workingProjectStorage';

export type WorkingProjectChangeSource = 'selection' | 'route' | 'stored' | 'storage';

export type WorkingProjectChange = {
  source: WorkingProjectChangeSource;
  /** The navigation adapter, not this hook, owns route reconciliation. */
  replace: boolean;
};

export type WorkingProjectSynchronizationOptions = {
  projects: readonly ProjectIdentity[];
  activeProject: ProjectIdentity | null;
  status: WorkingProjectStatus;
  route?: RouteProjectInput;
  onProjectChange: (project: ProjectIdentity, change: WorkingProjectChange) => void;
  /** Required for every switch/restore without a current list, including previously known names. */
  validateCandidate?: (name: string, signal: AbortSignal) => Promise<ProjectIdentity | null>;
  /** Publish the validated identity in projects before activation. */
  onProjectValidated?: (project: ProjectIdentity) => void;
};

/**
 * Coordinate untrusted candidates without performing discovery or authorization. The host
 * remains the only owner of both the known identity set and the active selection.
 */
export const useWorkingProjectSynchronization = ({
  projects,
  activeProject,
  status,
  route,
  onProjectChange,
  validateCandidate,
  onProjectValidated,
}: WorkingProjectSynchronizationOptions): ((name: string) => void) => {
  const latest = React.useRef({
    projects,
    activeProject,
    status,
    onProjectChange,
    validateCandidate,
    onProjectValidated,
  });
  React.useLayoutEffect(() => {
    latest.current = {
      projects,
      activeProject,
      status,
      onProjectChange,
      validateCandidate,
      onProjectValidated,
    };
  });
  const request = React.useRef<AbortController | null>(null);
  const [validated, setValidated] = React.useState<{
    name: string;
    source: WorkingProjectChangeSource;
    controller: AbortController;
    identity: ProjectIdentity;
  } | null>(null);

  const cancel = React.useCallback(() => {
    request.current?.abort();
    request.current = null;
  }, []);

  const choose = React.useCallback(
    (name: string, source: WorkingProjectChangeSource) => {
      cancel();
      if (parseStoredWorkingProjectName(JSON.stringify(name)) !== name) {
        return;
      }
      const { current } = latest;
      if (current.status !== 'listed' && current.status !== 'listing-unavailable') {
        return;
      }
      const known = current.projects.find((project) => project.name === name);
      if (known && current.status === 'listed') {
        if (known.name !== current.activeProject?.name || source === 'storage') {
          current.onProjectChange(known, { source, replace: source === 'storage' });
        }
        return;
      }
      if (
        current.status !== 'listing-unavailable' ||
        !current.validateCandidate ||
        !current.onProjectValidated
      ) {
        return;
      }
      const controller = new AbortController();
      request.current = controller;
      // Catch synchronous provider failures as well as rejected lookups.
      void Promise.resolve()
        .then(() =>
          controller.signal.aborted ? null : current.validateCandidate?.(name, controller.signal),
        )
        .then((identity) => {
          if (controller.signal.aborted || identity?.name !== name) {
            return;
          }
          if (source === 'storage' || source === 'stored') {
            try {
              if (readStoredWorkingProjectName(window.localStorage) !== name) {
                return;
              }
            } catch {
              return;
            }
          }
          latest.current.onProjectValidated?.(identity);
          setValidated({ name, source, controller, identity });
        })
        .catch(() => {
          // Failed candidates never replace a valid selection or write persistence.
        });
    },
    [cancel],
  );

  // A newer committed selection, route, or source lifecycle invalidates outstanding work.
  const routeKind = route?.kind;
  const routeName = route?.kind === 'project' ? route.name : undefined;
  const canValidate = Boolean(validateCandidate && onProjectValidated);
  React.useLayoutEffect(() => {
    cancel();
    return cancel;
  }, [activeProject?.name, status, routeKind, routeName, canValidate, cancel]);

  React.useEffect(() => {
    if (!validated || validated.controller.signal.aborted) {
      return;
    }
    const publishedProject = projects.find(({ name }) => name === validated.name);
    if (!publishedProject || publishedProject.displayName !== validated.identity.displayName) {
      return;
    }
    if (status === 'listed' || status === 'listing-unavailable') {
      if (validated.source === 'storage' || validated.source === 'stored') {
        try {
          if (readStoredWorkingProjectName(window.localStorage) !== validated.name) {
            return;
          }
        } catch {
          return;
        }
      }
      request.current = null;
      setValidated(null);
      onProjectChange(publishedProject, {
        source: validated.source,
        replace: validated.source === 'storage',
      });
    }
  }, [validated, projects, status, onProjectChange]);

  React.useEffect(() => {
    if (status !== 'listing-unavailable') {
      return;
    }
    if (routeKind === 'project' && routeName) {
      choose(routeName, 'route');
    } else if (routeKind === undefined && !latest.current.activeProject) {
      try {
        const storedName = readStoredWorkingProjectName(window.localStorage);
        if (storedName) {
          choose(storedName, 'stored');
        }
      } catch {
        // Accessing localStorage itself can throw.
      }
    }
  }, [status, routeKind, routeName, canValidate, choose]);

  React.useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== PREFERRED_NAMESPACE_STORAGE_KEY) {
        return;
      }
      try {
        const storage = window.localStorage;
        if (event.storageArea !== storage || storage.getItem(event.key) !== event.newValue) {
          return;
        }
        // Even a deletion or malformed newer value supersedes an in-flight request.
        cancel();
        const name = parseStoredWorkingProjectName(event.newValue);
        if (name) {
          choose(name, 'storage');
        }
      } catch {
        // Storage failure must not interrupt in-memory selection.
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [cancel, choose]);

  return React.useCallback((name: string) => choose(name, 'selection'), [choose]);
};
