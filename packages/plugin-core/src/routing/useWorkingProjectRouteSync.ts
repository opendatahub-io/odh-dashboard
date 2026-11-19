import * as React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { RouteProjectKindValue, type RouteProjectInput } from '@odh-dashboard/foundation';

type RouteProjectIdentity = {
  name: string;
};

export type WorkingProjectRouteSyncOptions = {
  activeProjectName?: string;
  routeProjectName?: string;
  projects: readonly RouteProjectIdentity[];
  selectProject: (project: RouteProjectIdentity) => void;
  enabled: boolean;
  getProjectPath: ((projectName: string) => string) | null;
  registerProjectRouteSync?: (route?: RouteProjectInput) => () => void;
};

export type ProjectRouteLocation = {
  pathname: string;
  search?: string;
  hash?: string;
};

export const getProjectRouteWithSuffix = (
  pathname: string,
  namespace: string,
  projectName: string,
  getProjectPath: (name: string) => string,
): string => {
  if (!namespace) {
    return getProjectPath(projectName);
  }

  const currentProjectPath = namespace ? getProjectPath(namespace).replace(/\/+$/, '') : '';

  if (!currentProjectPath) {
    return getProjectPath(projectName);
  }

  const hasPathBoundary =
    pathname === currentProjectPath || pathname.startsWith(`${currentProjectPath}/`);
  const suffix = hasPathBoundary ? pathname.slice(currentProjectPath.length) : '';
  const targetProjectPath = getProjectPath(projectName);
  const normalizedTargetPath =
    suffix && targetProjectPath.endsWith('/')
      ? targetProjectPath.replace(/\/+$/, '')
      : targetProjectPath;

  return `${normalizedTargetPath}${suffix}`;
};

export const updateProjectQueryParam = (
  search: string,
  parameterName: string,
  projectName: string,
): string => {
  const params = new URLSearchParams(search);
  params.set(parameterName, projectName);
  const nextSearch = params.toString();

  return nextSearch ? `?${nextSearch}` : '';
};

/** Synchronize a project-scoped route with the shared working-project selection. */
export const useWorkingProjectRouteSync = ({
  activeProjectName,
  routeProjectName,
  projects,
  selectProject,
  enabled,
  getProjectPath,
  registerProjectRouteSync,
}: WorkingProjectRouteSyncOptions): void => {
  const navigate = useNavigate();
  const location = useLocation();
  const recoverInvalidRoute = React.useCallback(
    (projectName: string) => {
      if (getProjectPath) {
        navigate(getProjectPath(projectName), { replace: true });
      }
    },
    [getProjectPath, navigate],
  );
  const getProjectLocation = React.useCallback(
    (projectName: string): ProjectRouteLocation | null => {
      if (!getProjectPath) {
        return null;
      }

      return {
        pathname: getProjectRouteWithSuffix(
          location.pathname,
          routeProjectName ?? '',
          projectName,
          getProjectPath,
        ),
        search: location.search,
        hash: location.hash,
      };
    },
    [getProjectPath, location.hash, location.pathname, location.search, routeProjectName],
  );
  const handledRouteProject = React.useRef<string | undefined>();
  const pendingRouteSelection = React.useRef<
    | {
        routeProjectName: string;
        activeProjectNameAtSelection?: string;
      }
    | undefined
  >();
  const projectNames = projects.map(({ name }) => name).join('\u0000');

  const registeredRoute = React.useMemo<RouteProjectInput | undefined>(() => {
    if (!enabled || !routeProjectName || !getProjectPath || !registerProjectRouteSync) {
      return undefined;
    }

    if (projectNames.split('\u0000').includes(routeProjectName)) {
      return { kind: RouteProjectKindValue.Project, name: routeProjectName };
    }

    return {
      kind: RouteProjectKindValue.Invalid,
      recover: recoverInvalidRoute,
    };
  }, [
    enabled,
    getProjectPath,
    projectNames,
    recoverInvalidRoute,
    registerProjectRouteSync,
    routeProjectName,
  ]);

  React.useLayoutEffect(
    () => registerProjectRouteSync?.(registeredRoute),
    [registerProjectRouteSync, registeredRoute],
  );

  React.useLayoutEffect(() => {
    if (!enabled || !routeProjectName) {
      handledRouteProject.current = undefined;
      pendingRouteSelection.current = undefined;
      return;
    }

    const routeProject = projects.find(({ name }) => name === routeProjectName);
    if (!routeProject) {
      handledRouteProject.current = undefined;
      pendingRouteSelection.current = undefined;
      return;
    }

    // A null location opts this consumer out of both route-driven selection and navigation.
    if (!getProjectLocation(routeProjectName)) {
      handledRouteProject.current = undefined;
      pendingRouteSelection.current = undefined;
      return;
    }

    if (handledRouteProject.current !== routeProjectName) {
      handledRouteProject.current = routeProjectName;
      if (routeProjectName !== activeProjectName) {
        pendingRouteSelection.current = {
          routeProjectName,
          activeProjectNameAtSelection: activeProjectName,
        };
        selectProject(routeProject);
        return;
      }
    }

    if (pendingRouteSelection.current) {
      if (pendingRouteSelection.current.routeProjectName === activeProjectName) {
        pendingRouteSelection.current = undefined;
        return;
      }

      if (pendingRouteSelection.current.activeProjectNameAtSelection === activeProjectName) {
        return;
      }

      pendingRouteSelection.current = undefined;
    }

    if (!activeProjectName || routeProjectName === activeProjectName) {
      return;
    }

    const nextLocation = getProjectLocation(activeProjectName);
    if (!nextLocation) {
      return;
    }

    const isCurrentLocation =
      nextLocation.pathname === location.pathname &&
      (nextLocation.search ?? '') === location.search &&
      (nextLocation.hash ?? '') === location.hash;

    if (!isCurrentLocation) {
      navigate(nextLocation, { replace: true });
    }
  }, [
    activeProjectName,
    enabled,
    getProjectLocation,
    location,
    navigate,
    projects,
    routeProjectName,
    selectProject,
  ]);
};
