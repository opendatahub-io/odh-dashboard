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
import { FindProjectNotice } from '@odh-dashboard/ui-core/context/ProjectsContext';
import { useBrowserStorage } from '@odh-dashboard/ui-core/hooks/useBrowserStorage';
import { PREFERRED_NAMESPACE_STORAGE_KEY } from '@odh-dashboard/ui-core/context/getStoredPreferredProject';
import { parseStoredWorkingProjectName } from '@odh-dashboard/ui-core/context/workingProjectStorage';
import { WorkingProjectProvider } from '@odh-dashboard/ui-core/context/WorkingProjectContext';
import { useWorkingProjectSynchronization } from '@odh-dashboard/ui-core/hooks/useWorkingProjectSynchronization';
import fetchNamespaces, {
  FETCH_TIMEOUT_MS,
  NamespaceListUnavailableError,
  ProjectAccessDeniedError,
  fetchNamespaceByName,
  type RhaiiProject,
} from './fetchNamespaces';
import { DashboardNamespaceContext } from './DashboardNamespaceContext';
import { KnownProjectsContext } from './KnownProjectsContext';

const WAIT_FOR_PROJECT_TIMEOUT_MS = 30_000;
const WAIT_FOR_PROJECT_POLL_MS = 2_000;
const RECENT_NAMESPACES_KEY = 'rhaii-recent-namespaces';
// Without the unified selector, names listed while discovery was unavailable
// are looked up by name before they are offered: at most this many, this many
// at a time.
const VERIFY_LISTED_LIMIT = 50;
const VERIFY_LISTED_CONCURRENCY = 4;
// Recent projects kept in browser storage; each is looked up again after a
// discovery failure, so the list stays short.
const MAX_RECENT_NAMES = 10;

const readRecentNames = (): string[] => {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(RECENT_NAMESPACES_KEY) ?? '[]');
    return Array.isArray(raw)
      ? raw
          .filter(
            (name): name is string =>
              typeof name === 'string' &&
              parseStoredWorkingProjectName(JSON.stringify(name)) === name,
          )
          .slice(0, MAX_RECENT_NAMES)
      : [];
  } catch {
    return [];
  }
};

/**
 * Merges by name; entries from `incoming` replace earlier ones, except that a
 * name listed without verified actions (a discovery outage) never replaces a
 * project a lookup already verified.
 */
const mergeProjects = (previous: RhaiiProject[], incoming: RhaiiProject[]): RhaiiProject[] => {
  const byProjectName = new Map(previous.map((project) => [project.metadata.name, project]));
  incoming.forEach((project) => {
    const known = byProjectName.get(project.metadata.name);
    if (project.actionsUnverified && known && !known.actionsUnverified) {
      return;
    }
    byProjectName.set(project.metadata.name, project);
  });
  return [...byProjectName.values()];
};

type ProjectsContextProviderProps = {
  children: React.ReactNode;
};

/**
 * Host-side ProjectsContext for RHAII / xKS.
 * Loads namespaces via Core BFF and exposes them as ProjectKind-shaped values
 * so model-serving (and other packages) can consume ProjectsContext without
 * the OpenShift Project watch used by the main ODH frontend. On xKS they come
 * from the BFF's authorized namespace discovery; where that endpoint is absent
 * the namespace list is used.
 */
const ProjectsContextProvider: React.FC<ProjectsContextProviderProps> = ({ children }) => {
  const unifiedProjectSelectorEnabled = useIsAreaAvailable(
    SupportedArea.UNIFIED_PROJECT_SELECTOR,
  ).status;
  const dashboardNamespace = React.useContext(DashboardNamespaceContext);
  const [projectData, setProjectData] = React.useState<RhaiiProject[]>([]);
  const [loaded, setLoaded] = React.useState(false);
  const [loadError, setLoadError] = React.useState<Error | undefined>(undefined);
  const [listingUnavailable, setListingUnavailable] = React.useState(false);
  const [listedLookupsSettled, setListedLookupsSettled] = React.useState(false);
  // Whether the initial load was partial. Only then does the page wait for the
  // lookups below: a listing that turns partial later (a waitForProject poll)
  // never takes back a page that already reported itself loaded.
  const [initialListingUnavailable, setInitialListingUnavailable] = React.useState(false);
  // Recent projects as of mount: looked up after a discovery failure.
  const [recentNamesAtMount] = React.useState(readRecentNames);
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
          // A partial listing still carries the namespaces the BFF authorized.
          setProjectData(err instanceof NamespaceListUnavailableError ? err.projects ?? [] : []);
          setListingUnavailable(err instanceof NamespaceListUnavailableError);
          setInitialListingUnavailable(err instanceof NamespaceListUnavailableError);
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
      // A project the caller may not browse is never the working project: the
      // pages read the preference through `projects`, which leaves it out.
      if (project && 'canView' in project && project.canView === false) {
        return;
      }
      setPreferredProject(project);
      if (project) {
        setStoredPreferredName(project.metadata.name);
      } else if (!unifiedProjectSelectorEnabled) {
        setStoredPreferredName('');
      }
    },
    [setStoredPreferredName, unifiedProjectSelectorEnabled],
  );

  const { projects, modelServingProjects, deploymentTargetProjects, nonActiveProjects } =
    React.useMemo(() => {
      const active: RhaiiProject[] = [];
      const terminating: RhaiiProject[] = [];
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
      // Only projects where the caller may list deployments are browsed and
      // watched: listing models in a create-only project would fail with 403
      // and put the deployments page into its error state.
      const viewable = sorted.filter((project) => project.canView !== false);
      return {
        projects: viewable,
        modelServingProjects: viewable,
        // Namespace discovery marks where the caller may deploy. A create-only
        // project is still a deployment target; a view-only one never is.
        deploymentTargetProjects: sorted.filter((project) => project.canDeploy !== false),
        nonActiveProjects: terminating.toSorted((a, b) =>
          a.metadata.name.localeCompare(b.metadata.name),
        ),
      };
    }, [dashboardNamespace, projectData]);

  // Names listed while discovery was unavailable are offered for selection
  // too. Selecting one while the listing is partial looks it up by name first,
  // so it is watched only once the lookup confirms what the caller may do.
  const unverifiedProjects = React.useMemo(
    () =>
      projectData.filter(
        (project) =>
          project.actionsUnverified &&
          project.status?.phase === NamespacePhase.Active &&
          isAvailableProject(project.metadata.name, dashboardNamespace),
      ),
    [projectData, dashboardNamespace],
  );
  // Without the unified selector, names listed while discovery was
  // unavailable are looked up before the page reports itself loaded (see the
  // lookups below). Derived during render, so no commit reports the page
  // loaded with none of them yet.
  const awaitingListedLookups =
    !unifiedProjectSelectorEnabled &&
    loaded &&
    !loadError &&
    initialListingUnavailable &&
    (unverifiedProjects.length > 0 || !!storedPreferredName || recentNamesAtMount.length > 0) &&
    !listedLookupsSettled;

  React.useEffect(() => {
    if (
      !loaded ||
      awaitingListedLookups ||
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
    awaitingListedLookups,
    listingUnavailable,
    unifiedProjectSelectorEnabled,
    loadError,
    projects,
    storedPreferredName,
  ]);

  // validateProject is defined below; the wait reads the latest one.
  const validateProjectRef = React.useRef<
    (name: string, signal?: AbortSignal) => Promise<RhaiiProject>
  >(() => Promise.reject(new Error('Not ready')));
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
          let listed: RhaiiProject[] | undefined;
          let partial = false;
          try {
            listed = await fetchNamespaces(controller.signal);
          } catch (err) {
            if (err instanceof NamespaceListUnavailableError) {
              listed = err.projects ?? [];
              partial = true;
            }
          }
          // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- signal may change during await
          if (controller.signal.aborted) {
            return;
          }
          // A name listed while discovery was unavailable is not usable yet.
          let found = listed?.find(
            (project) => project.metadata.name === projectName && !project.actionsUnverified,
          );
          if (!found && partial) {
            // A partial listing is bounded to its candidates; look the project
            // up by name, through the revision-checked lookup so a newer
            // decision wins. A failed or not-yet-ready lookup is retried.
            found = await validateProjectRef
              .current(projectName, controller.signal)
              .catch(() => undefined);
            // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- signal may change during await
            if (controller.signal.aborted) {
              return;
            }
          }
          if (found && listed) {
            clearTimeout(timer);
            waitRejectRef.current = null;
            if (partial) {
              // Keep projects added by manual entry or remembered selections.
              const incoming = [...listed, found];
              setProjectData((previous) => mergeProjects(previous, incoming));
            } else {
              setProjectData(listed);
            }
            setListingUnavailable(partial);
            if (!partial) {
              // A complete listing ends the initial episode, so a later partial
              // one never sends the page back to waiting.
              setInitialListingUnavailable(false);
            }
            resolve();
            return;
          }
          setTimeout(() => void poll(), WAIT_FOR_PROJECT_POLL_MS);
        };
        void poll();
      }),
    [cancelActiveWait],
  );

  const addProject = React.useCallback(
    (project: RhaiiProject, remember = true) => {
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
            JSON.stringify(
              [name, ...readRecentNames().filter((item) => item !== name)].slice(
                0,
                MAX_RECENT_NAMES,
              ),
            ),
          );
        } catch {
          // Browser storage is optional; keep the in-memory entry.
        }
      }
    },
    [dashboardNamespace],
  );

  // The latest lookup per project: an older one that resolves later must not
  // undo what a newer one decided.
  const lookupRevisionsRef = React.useRef(new Map<string, number>());

  // Projects a lookup denied this session. They get no action, rather than
  // the "unknown, so allowed" an absent project gets, until a lookup allows
  // them again.
  const [deniedNames, setDeniedNames] = React.useState<ReadonlySet<string>>(() => new Set());

  const forgetProject = React.useCallback((name: string) => {
    setProjectData((previous) => previous.filter((p) => p.metadata.name !== name));
    setDeniedNames((previous) => new Set(previous).add(name));
    // A denied or missing project is not looked up again on the next visit.
    try {
      localStorage.setItem(
        RECENT_NAMESPACES_KEY,
        JSON.stringify(readRecentNames().filter((item) => item !== name)),
      );
    } catch {
      // Browser storage is optional.
    }
  }, []);

  const validateProject = React.useCallback(
    async (name: string, signal?: AbortSignal) => {
      const revision = (lookupRevisionsRef.current.get(name) ?? 0) + 1;
      lookupRevisionsRef.current.set(name, revision);
      const isLatest = () => lookupRevisionsRef.current.get(name) === revision;
      const project = await fetchNamespaceByName(name, signal).catch((err: unknown) => {
        // A definitive denial revokes what this session cached for the
        // project, so it stops being offered as a target. A lookup that could
        // not be completed keeps it.
        if (err instanceof ProjectAccessDeniedError && isLatest()) {
          forgetProject(name);
        }
        throw err;
      });
      if (signal?.aborted || !isLatest()) {
        throw new DOMException('The operation was aborted.', 'AbortError');
      }
      if (!isAvailableProject(project.metadata.name, dashboardNamespace)) {
        throw new Error('No access to that project, or it does not exist.');
      }
      setDeniedNames((previous) => {
        if (!previous.has(name)) {
          return previous;
        }
        const next = new Set(previous);
        next.delete(name);
        return next;
      });
      return project;
    },
    [dashboardNamespace, forgetProject],
  );
  React.useEffect(() => {
    validateProjectRef.current = validateProject;
  }, [validateProject]);

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
      [...projects, ...unverifiedProjects]
        .map((project) => ({
          name: project.metadata.name,
          displayName: getDisplayNameFromK8sResource(project),
        }))
        .toSorted((a, b) => a.name.localeCompare(b.name)),
    [projects, unverifiedProjects],
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

  const validatedProjects = React.useRef(new WeakMap<object, ProjectKind>());
  const onProjectValidated = React.useCallback(
    (identity: { name: string; displayName?: string }) => {
      // Only a project this provider just validated is added, with what the BFF
      // reported for it (deploy access included); persisted data grants nothing.
      const project = validatedProjects.current.get(identity);
      if (project) {
        addProject(project, false);
        validatedProjects.current.delete(identity);
      }
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
        const project = await validateProject(name, signal);
        const identity = { name, displayName: getDisplayNameFromK8sResource(project) };
        validatedProjects.current.set(identity, project);
        return identity;
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
    // Through validateProject, so a newer lookup's decision wins over an
    // older restoration.
    readRecentNames().forEach((name) => {
      void validateProject(name, controller.signal)
        .then((project) => {
          if (!controller.signal.aborted) {
            addProject(project, false);
          }
        })
        .catch(() => undefined);
    });
    return () => controller.abort();
  }, [status, unifiedProjectSelectorEnabled, addProject, validateProject]);

  // Without the unified selector the page's own selector offers only verified
  // projects and has no manual entry, so after a discovery failure it would
  // show none. The names the fallback listed are looked up by name instead,
  // the stored preference first, and each one the lookup verifies is added
  // with its actions. The page waits for these lookups rather than reporting
  // no projects meanwhile.
  // Read when a discovery failure starts the lookups, not as dependencies:
  // each verified project changes them, and must not restart the lookups.
  const listedInputsRef = React.useRef({
    unverifiedProjects,
    storedPreferredName,
    addProject,
    projectData,
    deniedNames,
  });
  React.useEffect(() => {
    listedInputsRef.current = {
      unverifiedProjects,
      storedPreferredName,
      addProject,
      projectData,
      deniedNames,
    };
  }, [unverifiedProjects, storedPreferredName, addProject, projectData, deniedNames]);
  // Once the page has stopped waiting for these lookups, a restart (for
  // example the dashboard namespace arriving late) runs them in the
  // background instead of taking the loaded page back.
  const listedLookupsSettledOnceRef = React.useRef(false);
  const settleListedLookups = React.useCallback(() => {
    listedLookupsSettledOnceRef.current = true;
    setListedLookupsSettled(true);
  }, []);
  React.useEffect(() => {
    if (unifiedProjectSelectorEnabled || status !== 'listing-unavailable') {
      return undefined;
    }
    const {
      unverifiedProjects: listed,
      storedPreferredName: preferred,
      projectData: known,
      deniedNames: denied,
    } = listedInputsRef.current;
    // The stored preference and recent projects too: where the caller cannot
    // list namespaces, nothing is listed, but an exact lookup still works.
    const verified = new Set(
      known.filter((project) => !project.actionsUnverified).map(({ metadata }) => metadata.name),
    );
    const names = [
      ...new Set([
        ...(preferred ? [preferred] : []),
        ...recentNamesAtMount,
        ...listed.map((project) => project.metadata.name),
      ]),
    ]
      .filter(
        (name) =>
          !verified.has(name) && !denied.has(name) && isAvailableProject(name, dashboardNamespace),
      )
      .slice(0, VERIFY_LISTED_LIMIT);
    if (names.length === 0) {
      settleListedLookups();
      return undefined;
    }
    const controller = new AbortController();
    if (!listedLookupsSettledOnceRef.current) {
      setListedLookupsSettled(false);
    }
    // The page waits at most this long; later lookups still add projects.
    const deadline = setTimeout(settleListedLookups, FETCH_TIMEOUT_MS);
    let next = 0;
    const worker = async (): Promise<void> => {
      while (!controller.signal.aborted && next < names.length) {
        const name = names[next];
        next += 1;
        try {
          // Through validateProject, so a newer lookup's decision wins; it
          // rejects once the lookups are cancelled.
          // eslint-disable-next-line no-await-in-loop
          const project = await validateProjectRef.current(name, controller.signal);
          listedInputsRef.current.addProject(project, false);
        } catch {
          // A denial forgets the name; a lookup that failed leaves it unverified.
        }
      }
    };
    void Promise.all(Array.from({ length: VERIFY_LISTED_CONCURRENCY }, worker)).then(() => {
      if (!controller.signal.aborted) {
        clearTimeout(deadline);
        settleListedLookups();
      }
    });
    return () => {
      controller.abort();
      clearTimeout(deadline);
    };
  }, [
    unifiedProjectSelectorEnabled,
    status,
    recentNamesAtMount,
    dashboardNamespace,
    settleListedLookups,
  ]);

  // The deployments page's empty state looks a project up by name while the
  // listing is incomplete and the unified selector, which offers manual entry,
  // is off.
  const findProject = React.useCallback(
    async (name: string) => {
      const project = await validateProject(name);
      addProject(project);
      if (project.canView === false) {
        // Kept as a deployment target, but the deployments page cannot list
        // it, so opening it would show it as not found.
        throw new FindProjectNotice(
          `You can deploy models to ${name}, but not view its deployments. It is offered when you deploy a model.`,
        );
      }
      updatePreferredProject(project);
      return project;
    },
    [validateProject, addProject, updatePreferredProject],
  );
  const offerFindProject = !unifiedProjectSelectorEnabled && status === 'listing-unavailable';

  const getProjectDeploymentActions = React.useCallback<
    NonNullable<ProjectsContextType['getProjectDeploymentActions']>
  >(
    (name) => {
      const project = projectData.find(byName(name));
      // A project a lookup denied, and that no listing has brought back since.
      if (!project && deniedNames.has(name)) {
        return {
          canEdit: false,
          canStartStop: false,
          canDelete: false,
          canCreateTokenAuth: false,
          canManageTokenAuth: false,
        };
      }
      if (
        !project ||
        (project.canEdit === undefined &&
          project.canStartStop === undefined &&
          project.canDelete === undefined &&
          project.canCreateTokenAuth === undefined &&
          project.canManageTokenAuth === undefined)
      ) {
        return undefined;
      }
      return {
        canEdit: project.canEdit !== false,
        canStartStop: project.canStartStop !== false,
        canDelete: project.canDelete !== false,
        canCreateTokenAuth: project.canCreateTokenAuth !== false,
        canManageTokenAuth: project.canManageTokenAuth !== false,
      };
    },
    [projectData, deniedNames],
  );

  const contextValue = React.useMemo<ProjectsContextType>(
    () => ({
      projects,
      modelServingProjects,
      deploymentTargetProjects,
      getProjectDeploymentActions,
      ...(offerFindProject && { findProject }),
      nonActiveProjects,
      preferredProject:
        loaded && !loadError
          ? projects.find(byName(preferredProject?.metadata.name)) ?? null
          : null,
      updatePreferredProject,
      loaded: loaded && !awaitingListedLookups,
      loadError,
      waitForProject,
    }),
    [
      awaitingListedLookups,
      offerFindProject,
      findProject,
      projects,
      modelServingProjects,
      deploymentTargetProjects,
      getProjectDeploymentActions,
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
      <KnownProjectsContext.Provider value={projectData}>
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
      </KnownProjectsContext.Provider>
    </ProjectsContext.Provider>
  );
};

export default ProjectsContextProvider;
