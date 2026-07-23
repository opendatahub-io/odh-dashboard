import * as React from 'react';
import {
  ProjectsContext,
  type ProjectsContextType,
} from '@odh-dashboard/ui-core/context/ProjectsContext';
import type { ProjectKind } from '@odh-dashboard/k8s-core';
import { byName, isAvailableProject } from '@odh-dashboard/k8s-core';

const PREFERRED_NAMESPACE_STORAGE_KEY = 'mod-arch.namespace.lastUsed';
/** Dashboard install namespace — excluded from the selectable project list. */
const DASHBOARD_NAMESPACE = 'opendatahub';

type K8sNamespaceItem = {
  metadata?: { name?: string };
  status?: { phase?: string };
};

type K8sNamespaceList = {
  items?: K8sNamespaceItem[];
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const parseNamespaceList = (value: unknown): K8sNamespaceList => {
  if (!isRecord(value)) {
    return { items: [] };
  }
  const { items } = value;
  if (!Array.isArray(items)) {
    return { items: [] };
  }
  return {
    items: items.filter((item): item is K8sNamespaceItem => isRecord(item)),
  };
};

const namespaceToProject = (name: string, phase?: string): ProjectKind => ({
  apiVersion: 'v1',
  kind: 'Namespace',
  metadata: { name },
  status: {
    phase: phase === 'Terminating' ? 'Terminating' : 'Active',
  },
});

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
    let cancelled = false;

    const loadNamespaces = async (): Promise<void> => {
      try {
        const resp = await fetch('/api/k8s/api/v1/namespaces');
        if (!resp.ok) {
          throw new Error(`Failed to list namespaces (HTTP ${resp.status})`);
        }
        const data = parseNamespaceList(await resp.json());
        if (cancelled) {
          return;
        }
        const projects = (data.items ?? [])
          .map((item) => {
            const name = item.metadata?.name;
            if (!name) {
              return null;
            }
            return namespaceToProject(name, item.status?.phase);
          })
          .filter((project): project is ProjectKind => project !== null);
        setProjectData(projects);
        setLoadError(undefined);
      } catch (err) {
        if (!cancelled) {
          setProjectData([]);
          setLoadError(err instanceof Error ? err : new Error(String(err)));
        }
      } finally {
        if (!cancelled) {
          setLoaded(true);
        }
      }
    };

    setLoaded(false);
    void loadNamespaces();

    return () => {
      cancelled = true;
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

  const projectsRef = React.useRef(projects);
  projectsRef.current = projects;

  const waitForProject = React.useCallback<ProjectsContextType['waitForProject']>(
    (projectName) =>
      new Promise((resolve) => {
        const doCheckAgain = (): void => {
          setTimeout(() => {
            if (projectsRef.current.find(byName(projectName))) {
              resolve();
              return;
            }
            if (isMounted.current) {
              doCheckAgain();
            }
          }, 200);
        };
        doCheckAgain();
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
