import * as React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

export type WorkingProjectRouteSyncOptions = {
  activeProjectName?: string;
  routeProjectName?: string;
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
  enabled,
  getProjectLocation,
}: WorkingProjectRouteSyncOptions): void => {
  const navigate = useNavigate();
  const location = useLocation();

  React.useEffect(() => {
    if (
      !enabled ||
      !routeProjectName ||
      !activeProjectName ||
      routeProjectName === activeProjectName
    ) {
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
  }, [activeProjectName, enabled, getProjectLocation, location, navigate, routeProjectName]);
};
