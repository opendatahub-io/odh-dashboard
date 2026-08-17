import * as React from 'react';
import {
  ProjectsContext,
  type ProjectsContextType,
} from '@odh-dashboard/ui-core/context/ProjectsContext';
import type { ProjectKind } from '@odh-dashboard/k8s-core';
import { byName, isAvailableProject } from '@odh-dashboard/k8s-core';
import { useBrowserStorage } from '@odh-dashboard/ui-core/hooks/useBrowserStorage';
import { PREFERRED_NAMESPACE_STORAGE_KEY } from '@odh-dashboard/ui-core/context/getStoredPreferredProject';
import fetchNamespaces, { FETCH_TIMEOUT_MS } from './fetchNamespaces';
/** Dashboard install namespace — excluded from the selectable project list. */
const DASHBOARD_NAMESPACE = 'opendatahub';

const WAIT_FOR_PROJECT_TIMEOUT_MS = 30_000;
const WAIT_FOR_PROJECT_POLL_MS = 2_000;

type ProjectsContextProviderProps = {
  children: React.ReactNode;
};

/**
 * Host-side ProjectsContext for RHAII / xKS.
 * Loads namespaces via Core BFF and exposes them as ProjectKind-shaped values
 * so model-serving (and other packages) can consume ProjectsContext without
 * the OpenShift Project watch used by the main ODH frontend.
 */
const ProjectsContextProvider: React.FC<ProjectsContextProviderProps> = ({ children }) => {
  const [projectData, setProjectData] = React.useState<ProjectKind[]>([]);
  const [loaded, setLoaded] = React.useState(false);
  const [loadError, setLoadError] = React.useState<Error | undefined>(undefined);
  const [storedPreferredName, setStoredPreferredName] = useBrowserStorage<string>(
    PREFERRED_NAMESPACE_STORAGE_KEY,
    '',
  );
  const [preferredProject, setPreferredProject] =
    React.useState<ProjectsContextType['preferredProject']>(null);
  const initializedFromStorage = React.useRef(false);

  // Fetch once on mount. The BFF exposes a REST endpoint (not a watch),
  // so there is no streaming refresh. waitForProject handles the case
  // where a newly-created namespace needs to appear.
  React.useEffect(() => {
    let unmounted = false;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    const load = async (): Promise<void> => {
      try {
        const projects = await fetchNamespaces(controller.signal);
        if (!unmounted) {
          setProjectData(projects);
          setLoadError(undefined);
        }
      } catch (err) {
        if (!unmounted) {
          setProjectData([]);
          setLoadError(err instanceof Error ? err : new Error(String(err)));
        }
      } finally {
        clearTimeout(timer);
        if (!unmounted) {
          setLoaded(true);
        }
      }
    };

    setLoaded(false);
    void load();

    return () => {
      unmounted = true;
      clearTimeout(timer);
      controller.abort();
    };
  }, []);

  const updatePreferredProject = React.useCallback(
    (project: ProjectKind | null) => {
      setPreferredProject(project);
      setStoredPreferredName(project?.metadata.name ?? '');
    },
    [setStoredPreferredName],
  );

  const { projects, modelServingProjects, nonActiveProjects } = React.useMemo(() => {
    const active: ProjectKind[] = [];
    const terminating: ProjectKind[] = [];
    for (const project of projectData) {
      if (!isAvailableProject(project.metadata.name, DASHBOARD_NAMESPACE)) {
        continue;
      }
      if (project.status?.phase === 'Active') {
        active.push(project);
      } else {
        terminating.push(project);
      }
    }
    const sorted = active.toSorted((a, b) => a.metadata.name.localeCompare(b.metadata.name));
    return {
      projects: sorted,
      // On xKS every available namespace is a valid deployment target.
      modelServingProjects: sorted,
      nonActiveProjects: terminating.toSorted((a, b) =>
        a.metadata.name.localeCompare(b.metadata.name),
      ),
    };
  }, [projectData]);

  React.useEffect(() => {
    if (!loaded || projects.length === 0 || initializedFromStorage.current) {
      return;
    }
    initializedFromStorage.current = true;
    if (storedPreferredName) {
      const match = projects.find(byName(storedPreferredName));
      if (match) {
        setPreferredProject(match);
      }
    }
  }, [loaded, projects, storedPreferredName]);

  const waitControllerRef = React.useRef<AbortController | null>(null);
  const waitTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const waitRejectRef = React.useRef<((reason: Error) => void) | null>(null);

  const cancelActiveWait = React.useCallback(() => {
    waitRejectRef.current?.(new DOMException('The operation was aborted.', 'AbortError'));
    waitRejectRef.current = null;
    waitControllerRef.current?.abort();
    waitControllerRef.current = null;
    if (waitTimerRef.current != null) {
      clearTimeout(waitTimerRef.current);
      waitTimerRef.current = null;
    }
  }, []);

  React.useEffect(() => () => cancelActiveWait(), [cancelActiveWait]);

  const waitForProject = React.useCallback<ProjectsContextType['waitForProject']>(
    (projectName) =>
      new Promise((resolve, reject) => {
        cancelActiveWait();
        const controller = new AbortController();
        waitControllerRef.current = controller;
        waitRejectRef.current = reject;

        const timer = setTimeout(() => {
          waitRejectRef.current = null;
          controller.abort();
          reject(new Error(`Timed out waiting for project "${projectName}"`));
        }, WAIT_FOR_PROJECT_TIMEOUT_MS);
        waitTimerRef.current = timer;

        const poll = async (): Promise<void> => {
          if (controller.signal.aborted) {
            return;
          }
          try {
            const fresh = await fetchNamespaces(controller.signal);
            // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- signal may change during await
            if (controller.signal.aborted) {
              return;
            }
            if (fresh.find(byName(projectName))) {
              clearTimeout(timer);
              waitRejectRef.current = null;
              setProjectData(fresh);
              resolve();
              return;
            }
          } catch {
            // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- signal may change during await
            if (controller.signal.aborted) {
              return;
            }
          }
          setTimeout(() => void poll(), WAIT_FOR_PROJECT_POLL_MS);
        };
        void poll();
      }),
    [cancelActiveWait],
  );

  const contextValue = React.useMemo<ProjectsContextType>(
    () => ({
      projects,
      modelServingProjects,
      nonActiveProjects,
      preferredProject,
      updatePreferredProject,
      loaded,
      loadError,
      waitForProject,
    }),
    [
      projects,
      modelServingProjects,
      nonActiveProjects,
      preferredProject,
      updatePreferredProject,
      loaded,
      loadError,
      waitForProject,
    ],
  );

  return <ProjectsContext.Provider value={contextValue}>{children}</ProjectsContext.Provider>;
};

export default ProjectsContextProvider;
