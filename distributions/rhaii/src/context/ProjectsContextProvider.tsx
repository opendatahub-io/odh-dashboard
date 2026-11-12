import * as React from 'react';
import { SupportedArea, useIsAreaAvailable } from '@odh-dashboard/plugin-core/areas';
import { ProjectsContext, type ProjectsContextType } from '@odh-dashboard/ui-core';
import type { ProjectKind } from '@odh-dashboard/k8s-core';
import {
  byName,
  getDisplayNameFromK8sResource,
  isAvailableProject,
  NamespacePhase,
} from '@odh-dashboard/k8s-core';
import { useBrowserStorage } from '@odh-dashboard/ui-core/hooks/useBrowserStorage';
import { PREFERRED_NAMESPACE_STORAGE_KEY } from '@odh-dashboard/ui-core/context/getStoredPreferredProject';
import { parseStoredWorkingProjectName } from '@odh-dashboard/ui-core/context/workingProjectStorage';
import { WorkingProjectProvider } from '@odh-dashboard/ui-core/context/WorkingProjectContext';
import { useWorkingProjectSynchronization } from '@odh-dashboard/ui-core/hooks/useWorkingProjectSynchronization';
import fetchNamespaces, {
  FETCH_TIMEOUT_MS,
  NamespaceListUnavailableError,
  fetchNamespaceByName,
} from './fetchNamespaces';
import { DashboardNamespaceContext } from './DashboardNamespaceContext';

const WAIT_FOR_PROJECT_TIMEOUT_MS = 30_000;
const WAIT_FOR_PROJECT_POLL_MS = 2_000;
const RECENT_NAMESPACES_KEY = 'rhaii-recent-namespaces';

const readRecentNames = (): string[] => {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(RECENT_NAMESPACES_KEY) ?? '[]');
    return Array.isArray(raw)
      ? raw.filter(
          (name): name is string =>
            typeof name === 'string' &&
            parseStoredWorkingProjectName(JSON.stringify(name)) === name,
        )
      : [];
  } catch {
    return [];
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
  const unifiedProjectSelectorEnabled = useIsAreaAvailable(
    SupportedArea.UNIFIED_PROJECT_SELECTOR,
  ).status;
  const dashboardNamespace = React.useContext(DashboardNamespaceContext);
  const [projectData, setProjectData] = React.useState<ProjectKind[]>([]);
  const [loaded, setLoaded] = React.useState(false);
  const [loadError, setLoadError] = React.useState<Error | undefined>(undefined);
  const [listingUnavailable, setListingUnavailable] = React.useState(false);
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
          setListingUnavailable(false);
        }
      } catch (err) {
        if (!unmounted) {
          setProjectData([]);
          setListingUnavailable(err instanceof NamespaceListUnavailableError);
          setLoadError(
            err instanceof NamespaceListUnavailableError
              ? undefined
              : err instanceof Error
              ? err
              : new Error(String(err)),
          );
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
      if (project) {
        setStoredPreferredName(project.metadata.name);
      } else if (!unifiedProjectSelectorEnabled) {
        setStoredPreferredName('');
      }
    },
    [setStoredPreferredName, unifiedProjectSelectorEnabled],
  );

  const { projects, modelServingProjects, nonActiveProjects } = React.useMemo(() => {
    const active: ProjectKind[] = [];
    const terminating: ProjectKind[] = [];
    for (const project of projectData) {
      if (!isAvailableProject(project.metadata.name, dashboardNamespace)) {
        continue;
      }
      if (project.status?.phase === NamespacePhase.Active) {
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
  }, [dashboardNamespace, projectData]);

  React.useEffect(() => {
    if (
      !loaded ||
      (listingUnavailable && unifiedProjectSelectorEnabled) ||
      loadError ||
      projects.length === 0 ||
      initializedFromStorage.current
    ) {
      return;
    }
    initializedFromStorage.current = true;
    if (storedPreferredName) {
      const match = projects.find(byName(storedPreferredName));
      if (match) {
        setPreferredProject(match);
      }
    }
  }, [
    loaded,
    listingUnavailable,
    unifiedProjectSelectorEnabled,
    loadError,
    projects,
    storedPreferredName,
  ]);

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

  const addProject = React.useCallback(
    (project: ProjectKind, remember = true) => {
      const { name } = project.metadata;
      if (
        !isAvailableProject(name, dashboardNamespace) ||
        project.status?.phase !== NamespacePhase.Active
      ) {
        return;
      }
      setProjectData((previous) => [...previous.filter((p) => p.metadata.name !== name), project]);
      if (remember) {
        try {
          localStorage.setItem(
            RECENT_NAMESPACES_KEY,
            JSON.stringify([name, ...readRecentNames().filter((item) => item !== name)]),
          );
        } catch {
          // Browser storage is optional; keep the in-memory entry.
        }
      }
    },
    [dashboardNamespace],
  );

  const validateProject = React.useCallback(
    async (name: string, signal?: AbortSignal) => {
      const project = await fetchNamespaceByName(name, signal);
      if (signal?.aborted) {
        throw new DOMException('The operation was aborted.', 'AbortError');
      }
      if (!isAvailableProject(project.metadata.name, dashboardNamespace)) {
        throw new Error('No access to that project, or it does not exist.');
      }
      return project;
    },
    [dashboardNamespace],
  );

  const discoverProject = React.useCallback(
    async (name: string, signal: AbortSignal) => {
      const project = await validateProject(name, signal);
      return { name, displayName: getDisplayNameFromK8sResource(project) };
    },
    [validateProject],
  );

  const rememberProject = React.useCallback(
    async (name: string, signal: AbortSignal) => {
      const project = await validateProject(name, signal);
      addProject(project);
      if (listingUnavailable && projects.length === 0 && !preferredProject) {
        updatePreferredProject(project);
      }
    },
    [
      addProject,
      validateProject,
      listingUnavailable,
      projects.length,
      preferredProject,
      updatePreferredProject,
    ],
  );

  const status = !loaded
    ? 'loading'
    : loadError
    ? 'project-source-error'
    : listingUnavailable
    ? 'listing-unavailable'
    : 'listed';
  const identities = React.useMemo(
    () =>
      projects.map((project) => ({
        name: project.metadata.name,
        displayName: getDisplayNameFromK8sResource(project),
      })),
    [projects],
  );
  const selectProject = React.useCallback(
    (identity: { name: string }) => {
      const project = projects.find(byName(identity.name));
      if (project && !loadError && loaded) {
        updatePreferredProject(project);
      }
    },
    [projects, loaded, loadError, updatePreferredProject],
  );

  const onProjectValidated = React.useCallback(
    (identity: { name: string; displayName?: string }) => {
      // The synchronization hook publishes a provider-validated identity before activation.
      // Preserve its display name, but do not infer access from persisted browser data.
      addProject(
        {
          apiVersion: 'v1',
          kind: 'Namespace',
          metadata: {
            name: identity.name,
            ...(identity.displayName && {
              annotations: { 'openshift.io/display-name': identity.displayName },
            }),
          },
          status: { phase: NamespacePhase.Active },
        },
        false,
      );
    },
    [addProject],
  );
  useWorkingProjectSynchronization({
    projects: identities,
    activeProject: preferredProject ? { name: preferredProject.metadata.name } : null,
    status: unifiedProjectSelectorEnabled ? status : 'project-source-error',
    onProjectChange: selectProject,
    validateCandidate: async (name, signal) => {
      try {
        return await discoverProject(name, signal);
      } catch {
        return null;
      }
    },
    onProjectValidated,
  });

  const changeWorkingProject = React.useCallback(
    (identity: { name: string }) => {
      if (status !== 'listing-unavailable') {
        selectProject(identity);
        return;
      }
      return validateProject(identity.name).then((project) => {
        addProject(project, false);
        updatePreferredProject(project);
      });
    },
    [status, selectProject, validateProject, addProject, updatePreferredProject],
  );

  React.useEffect(() => {
    if (!unifiedProjectSelectorEnabled || status !== 'listing-unavailable') {
      return;
    }
    const controller = new AbortController();
    readRecentNames().forEach((name) => {
      void fetchNamespaceByName(name, controller.signal)
        .then((project) => {
          if (!controller.signal.aborted) {
            addProject(project, false);
          }
        })
        .catch(() => undefined);
    });
    return () => controller.abort();
  }, [status, unifiedProjectSelectorEnabled, addProject]);

  const contextValue = React.useMemo<ProjectsContextType>(
    () => ({
      projects,
      modelServingProjects,
      nonActiveProjects,
      preferredProject:
        loaded && !loadError
          ? projects.find(byName(preferredProject?.metadata.name)) ?? null
          : null,
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

  return (
    <ProjectsContext.Provider value={contextValue}>
      {unifiedProjectSelectorEnabled ? (
        <WorkingProjectProvider
          status={status}
          projects={identities}
          activeProject={preferredProject ? { name: preferredProject.metadata.name } : null}
          onProjectChange={changeWorkingProject}
          discoverProject={status === 'listing-unavailable' ? discoverProject : undefined}
          rememberProject={status === 'listing-unavailable' ? rememberProject : undefined}
        >
          {children}
        </WorkingProjectProvider>
      ) : (
        children
      )}
    </ProjectsContext.Provider>
  );
};

export default ProjectsContextProvider;
