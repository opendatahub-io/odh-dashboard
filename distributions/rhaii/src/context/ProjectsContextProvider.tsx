import * as React from 'react';
import {
  ProjectsContext,
  type ProjectsContextType,
} from '@odh-dashboard/ui-core/context/ProjectsContext';
import type { ProjectKind } from '@odh-dashboard/k8s-core';
import { byName, isAvailableProject } from '@odh-dashboard/k8s-core';
import fetchNamespaces, { FETCH_TIMEOUT_MS } from './fetchNamespaces';

const PREFERRED_NAMESPACE_STORAGE_KEY = 'mod-arch.namespace.lastUsed';
/** Dashboard install namespace — excluded from the selectable project list. */
const DASHBOARD_NAMESPACE = 'opendatahub';

const WAIT_FOR_PROJECT_TIMEOUT_MS = 30_000;
const WAIT_FOR_PROJECT_POLL_MS = 2_000;

const readStoredPreferredName = (): string | null => {
  let raw: string | null;
  try {
    raw = localStorage.getItem(PREFERRED_NAMESPACE_STORAGE_KEY);
  } catch {
    return null;
  }
  if (!raw) {
    return null;
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    return typeof parsed === 'string' ? parsed : null;
  } catch {
    return raw.length > 0 ? raw : null;
  }
};

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
  const [preferredProject, setPreferredProject] =
    React.useState<ProjectsContextType['preferredProject']>(null);
  const initializedFromStorage = React.useRef(false);

  React.useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    const load = async (): Promise<void> => {
      try {
        const projects = await fetchNamespaces(controller.signal);
        if (!controller.signal.aborted) {
          setProjectData(projects);
          setLoadError(undefined);
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          setProjectData([]);
          setLoadError(err instanceof Error ? err : new Error(String(err)));
        }
      } finally {
        clearTimeout(timer);
        if (!controller.signal.aborted) {
          setLoaded(true);
        }
      }
    };

    setLoaded(false);
    void load();

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, []);

  const updatePreferredProject = React.useCallback((project: ProjectKind | null) => {
    setPreferredProject(project);
    try {
      if (project?.metadata.name) {
        localStorage.setItem(
          PREFERRED_NAMESPACE_STORAGE_KEY,
          JSON.stringify(project.metadata.name),
        );
      } else {
        localStorage.removeItem(PREFERRED_NAMESPACE_STORAGE_KEY);
      }
    } catch {
      // Ignore storage failures (private mode, quota, etc.)
    }
  }, []);

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
    const stored = readStoredPreferredName();
    if (stored) {
      const match = projects.find(byName(stored));
      if (match) {
        setPreferredProject(match);
      }
    }
  }, [loaded, projects]);

  const isMounted = React.useRef(true);
  React.useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const waitForProject = React.useCallback<ProjectsContextType['waitForProject']>(
    (projectName) =>
      new Promise((resolve, reject) => {
        const deadline = Date.now() + WAIT_FOR_PROJECT_TIMEOUT_MS;
        const poll = async (): Promise<void> => {
          if (!isMounted.current) {
            return;
          }
          try {
            const fresh = await fetchNamespaces();
            // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- ref may change during await
            if (!isMounted.current) {
              return;
            }
            if (fresh.find(byName(projectName))) {
              setProjectData(fresh);
              resolve();
              return;
            }
          } catch {
            // fetch failed — keep polling until timeout
          }
          if (Date.now() >= deadline) {
            reject(new Error(`Timed out waiting for project "${projectName}"`));
            return;
          }
          setTimeout(() => void poll(), WAIT_FOR_PROJECT_POLL_MS);
        };
        void poll();
      }),
    [],
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
