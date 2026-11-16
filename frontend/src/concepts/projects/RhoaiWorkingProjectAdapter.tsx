import * as React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  resolveWorkingProject,
  RouteProjectKindValue,
  WorkingProjectListStatusValue,
  type RouteProjectInput,
} from '@odh-dashboard/foundation';
import { isAiProject } from '@odh-dashboard/k8s-core';
import {
  type ProjectIdentity,
  type WorkingProjectNavigation,
  WorkingProjectStatusValue,
  WorkingProjectProvider,
} from '@odh-dashboard/ui-core/context/WorkingProjectContext';
import { ProjectsContext } from '@odh-dashboard/ui-core/context/ProjectsContext';
import {
  useWorkingProjectSynchronization,
  type WorkingProjectChange,
} from '@odh-dashboard/ui-core/hooks/useWorkingProjectSynchronization';
import {
  getProjectDetailsRouteInput,
  getStoredWorkingProjectName,
  getWorkingProjectStatus,
  toWorkingProjectIdentity,
} from './workingProjectAdapterUtils';

type Props = { children: React.ReactNode };

/** Mount inside the opted-in RHOAI ProjectsContextProvider, above the Page and its masthead. */
const RhoaiWorkingProjectAdapter: React.FC<Props> = ({ children }) => {
  const { projects, preferredProject, updatePreferredProject, loaded, loadError } =
    React.useContext(ProjectsContext);
  const available = loaded && !loadError;
  const location = useLocation();
  const navigate = useNavigate();
  const navigation = React.useRef(new Map<symbol, WorkingProjectNavigation>());
  const routeSyncCount = React.useRef(0);
  // Re-render when mounted route-sync registrations change.
  const [, setRouteSyncVersion] = React.useState(0);

  const routeSyncs = React.useRef(new Map<symbol, RouteProjectInput>());
  const registerProjectRouteSync = React.useCallback((route?: RouteProjectInput) => {
    const owner = Symbol('project-route-sync');
    routeSyncCount.current += 1;
    if (route !== undefined) {
      routeSyncs.current.set(owner, route);
      setRouteSyncVersion((version) => version + 1);
    }
    return () => {
      routeSyncCount.current -= 1;
      if (route !== undefined) {
        routeSyncs.current.delete(owner);
        setRouteSyncVersion((version) => version + 1);
      }
    };
  }, []);
  const pendingNavigation = React.useRef<{ token: symbol; owner: symbol } | null>(null);
  const navigationBlockers = React.useRef(new Set<() => void>());
  const registerProjectNavigationBlocker = React.useCallback((reset: () => void) => {
    navigationBlockers.current.add(reset);
    return () => {
      navigationBlockers.current.delete(reset);
    };
  }, []);
  const cancelProjectNavigation = React.useCallback(() => {
    const pending = pendingNavigation.current;
    pendingNavigation.current = null;
    if (pending) {
      navigationBlockers.current.forEach((reset) => reset());
    }
  }, []);
  const registerProjectNavigation = React.useCallback(
    (navigateProject: WorkingProjectNavigation) => {
      const owner = Symbol('project-navigation');
      navigation.current.set(owner, navigateProject);
      return () => {
        navigation.current.delete(owner);
        if (pendingNavigation.current?.owner === owner) {
          cancelProjectNavigation();
        }
      };
    },
    [cancelProjectNavigation],
  );
  const latestSource = React.useRef({ available, projects, updatePreferredProject });
  React.useLayoutEffect(() => {
    latestSource.current = { available, projects, updatePreferredProject };
    if (!available) {
      cancelProjectNavigation();
    }
  }, [available, projects, updatePreferredProject, cancelProjectNavigation]);
  React.useEffect(() => cancelProjectNavigation, [cancelProjectNavigation]);
  const { identities, projectByName } = React.useMemo(
    () => ({
      identities: projects.map(toWorkingProjectIdentity),
      projectByName: new Map(projects.map((project) => [project.metadata.name, project])),
    }),
    [projects],
  );
  const preferredName = preferredProject?.metadata.name;
  const registeredRouteInput = Array.from(routeSyncs.current.values()).at(-1);
  const initialProjectDetailsRoute = React.useMemo<RouteProjectInput | null>(() => {
    if (!available) {
      return null;
    }

    return getProjectDetailsRouteInput(location.pathname, new Set(projectByName.keys()), (name) =>
      navigate(`/projects/${name}`, { replace: true }),
    );
  }, [available, location.pathname, navigate, projectByName]);
  const route = registeredRouteInput ?? initialProjectDetailsRoute;
  const routeInvalid = route?.kind === RouteProjectKindValue.Invalid;
  const workingProjectStatus = getWorkingProjectStatus({ loaded, loadError, routeInvalid });
  // Route-invalid is a provider/UI state. Synchronization must retain its previous
  // source status so it does not treat an invalid route as a project-source failure.
  const synchronizationStatus =
    workingProjectStatus === WorkingProjectStatusValue.RouteInvalid
      ? WorkingProjectStatusValue.Listed
      : workingProjectStatus;
  const knownPreferred = available ? projectByName.get(preferredName ?? '') : undefined;
  const storedName = available && !knownPreferred ? getStoredWorkingProjectName() : null;
  const resolution = resolveWorkingProject({
    list: available
      ? { status: WorkingProjectListStatusValue.Listed, projects: identities }
      : {
          status: loadError
            ? WorkingProjectListStatusValue.Error
            : WorkingProjectListStatusValue.Loading,
        },
    route,
    storedName: knownPreferred?.metadata.name ?? storedName,
    isAiProject: ({ name }) => {
      const source = projectByName.get(name);
      return source ? isAiProject(source) : false;
    },
  });
  const resolvedName = resolution.activeProject?.name;
  React.useEffect(() => {
    const invalidRouteRegistered = Array.from(routeSyncs.current.values()).some(
      (routeInput) => routeInput?.kind === RouteProjectKindValue.Invalid,
    );
    if (!available || !resolvedName || resolvedName === preferredName || invalidRouteRegistered) {
      return;
    }
    const resolved = projectByName.get(resolvedName);
    if (resolved) {
      updatePreferredProject(resolved);
    }
  }, [available, preferredName, projectByName, resolvedName, updatePreferredProject]);

  const selectProject = React.useCallback(
    (identity: ProjectIdentity, change?: WorkingProjectChange) => {
      if (!available) {
        return;
      }
      const source = projectByName.get(identity.name);
      if (source) {
        const routeSelectionChanged =
          route?.kind === RouteProjectKindValue.Invalid ||
          (route?.kind === RouteProjectKindValue.Project && route.name !== identity.name);
        if (routeSelectionChanged) {
          const routeOwner = Array.from(routeSyncs.current.entries()).find(
            ([, routeInput]) => routeInput === route,
          )?.[0];
          if (routeOwner) {
            routeSyncs.current.delete(routeOwner);
            setRouteSyncVersion((version) => version + 1);
          }
          updatePreferredProject(source);
          if (route.kind === RouteProjectKindValue.Invalid && route.recover) {
            route.recover(source.metadata.name);
          }
          return;
        }
        const registration = Array.from(navigation.current.entries()).pop();
        if (change?.source === 'storage' && !registration && routeSyncCount.current > 0) {
          // A route that syncs its URL project cannot follow an external selection
          // without navigation. Do not let it write its old project back to storage.
          cancelProjectNavigation();
          return;
        }
        if (change?.source === 'storage' && change.replace && registration) {
          const [owner, navigateProject] = registration;
          cancelProjectNavigation();
          // The mounted surface supplies its own builder; the host never parses feature routes.
          const token = Symbol('project-switch');
          pendingNavigation.current = { token, owner };
          navigateProject(toWorkingProjectIdentity(source), {
            commit: () => {
              if (pendingNavigation.current?.token !== token) {
                return;
              }
              pendingNavigation.current = null;
              const latest = latestSource.current;
              const known = latest.projects.find(({ metadata }) => metadata.name === identity.name);
              if (latest.available && known) {
                latest.updatePreferredProject(known);
              }
            },
            cancel: () => {
              if (pendingNavigation.current?.token === token) {
                cancelProjectNavigation();
              }
            },
          });
          return;
        }
        cancelProjectNavigation();
        if (source.metadata.name !== preferredName) {
          updatePreferredProject(source);
        }
      }
    },
    [
      available,
      projectByName,
      preferredName,
      updatePreferredProject,
      cancelProjectNavigation,
      route,
    ],
  );

  useWorkingProjectSynchronization({
    projects: resolution.orderedProjects,
    activeProject: resolution.activeProject,
    status: synchronizationStatus,
    onProjectChange: selectProject,
  });

  return (
    <WorkingProjectProvider
      status={workingProjectStatus}
      projects={resolution.orderedProjects}
      activeProject={resolution.activeProject}
      onProjectChange={selectProject}
      registerProjectNavigation={registerProjectNavigation}
      registerProjectRouteSync={registerProjectRouteSync}
      cancelProjectNavigation={cancelProjectNavigation}
      registerProjectNavigationBlocker={registerProjectNavigationBlocker}
    >
      {children}
    </WorkingProjectProvider>
  );
};

export default RhoaiWorkingProjectAdapter;
