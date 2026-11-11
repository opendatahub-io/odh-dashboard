import * as React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { ProjectIdentity } from '@odh-dashboard/ui-core/context/WorkingProjectContext';

export type WorkingProjectRouteSyncOptions = {
  activeProjectName?: string;
  routeProjectName?: string;
  projects: readonly ProjectIdentity[];
  selectProject: (project: ProjectIdentity) => void;
  enabled: boolean;
  getProjectLocation: (projectName: string) => ProjectRouteLocation | null;
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
  getProjectLocation,
}: WorkingProjectRouteSyncOptions): void => {
  const navigate = useNavigate();
  const location = useLocation();
  const handledRouteProject = React.useRef<string | undefined>();
  const pendingRouteProject = React.useRef<string | undefined>();

  React.useLayoutEffect(() => {
    if (!enabled || !routeProjectName) {
      handledRouteProject.current = undefined;
      pendingRouteProject.current = undefined;
      return;
    }

    const routeProject = projects.find(({ name }) => name === routeProjectName);
    if (!routeProject) {
      handledRouteProject.current = undefined;
      pendingRouteProject.current = undefined;
      return;
    }

    if (handledRouteProject.current !== routeProjectName) {
      handledRouteProject.current = routeProjectName;
      if (routeProjectName !== activeProjectName) {
        pendingRouteProject.current = routeProjectName;
        selectProject(routeProject);
        return;
      }
    }

    if (pendingRouteProject.current) {
      if (pendingRouteProject.current !== activeProjectName) {
        return;
      }
      pendingRouteProject.current = undefined;
      return;
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
