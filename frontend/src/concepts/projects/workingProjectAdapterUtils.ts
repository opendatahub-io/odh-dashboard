import type { ProjectKind } from '@odh-dashboard/k8s-core';
import { RouteProjectKindValue, type RouteProjectInput } from '@odh-dashboard/foundation';
import {
  type ProjectIdentity,
  type WorkingProjectStatus,
  WorkingProjectStatusValue,
} from '@odh-dashboard/ui-core/context/WorkingProjectContext';
import { readStoredWorkingProjectName } from '@odh-dashboard/ui-core/context/workingProjectStorage';

export const toWorkingProjectIdentity = (project: ProjectKind): ProjectIdentity => ({
  name: project.metadata.name,
  ...(project.metadata.annotations?.['openshift.io/display-name'] && {
    displayName: project.metadata.annotations['openshift.io/display-name'],
  }),
});

/** Read only the working-project entry; accessing storage itself can throw. */
export const getStoredWorkingProjectName = (): string | null => {
  try {
    return readStoredWorkingProjectName(window.localStorage);
  } catch {
    return null;
  }
};

export type AdapterWorkingProjectStatus = Exclude<
  WorkingProjectStatus,
  | typeof WorkingProjectStatusValue.ProviderAbsent
  | typeof WorkingProjectStatusValue.EmptyList
  | typeof WorkingProjectStatusValue.NoProjectSelected
>;

export const getWorkingProjectStatus = ({
  loaded,
  loadError,
  routeInvalid,
}: {
  loaded: boolean;
  loadError?: Error;
  routeInvalid: boolean;
}): AdapterWorkingProjectStatus => {
  if (loadError) {
    return WorkingProjectStatusValue.ProjectSourceError;
  }
  if (!loaded) {
    return WorkingProjectStatusValue.Loading;
  }
  return routeInvalid ? WorkingProjectStatusValue.RouteInvalid : WorkingProjectStatusValue.Listed;
};

export const getProjectDetailsRouteInput = (
  pathname: string,
  projectNames: ReadonlySet<string>,
  recover: (projectName: string) => void,
): RouteProjectInput | null => {
  const match = pathname.match(/^\/projects\/([^/]+)/);
  if (!match) {
    return null;
  }

  let namespace: string;
  try {
    namespace = decodeURIComponent(match[1]);
  } catch {
    return { kind: RouteProjectKindValue.Invalid, recover };
  }

  return projectNames.has(namespace) ? null : { kind: RouteProjectKindValue.Invalid, recover };
};
