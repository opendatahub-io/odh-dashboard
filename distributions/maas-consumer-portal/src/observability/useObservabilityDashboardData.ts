import * as React from 'react';
import type { K8sAPIOptions, NamespaceKind } from '@odh-dashboard/k8s-core';
import { getAPIResource } from '@odh-dashboard/k8s-core/api/apiResource';
import useFetch from '@odh-dashboard/ui-core/hooks/useFetch';
import {
  type DashboardViewProps,
  usePersesDashboards,
} from '@odh-dashboard/observability/dashboard';
import { MAAS_NAMESPACES_PATH, PERSES_PROXY_BASE_PATH } from './paths';
import { PORTAL_BASE_PATH } from '../portalPaths';

export type ObservabilityDashboardData = Pick<
  DashboardViewProps,
  | 'dashboards'
  | 'dashboardsLoaded'
  | 'dashboardsError'
  | 'projects'
  | 'projectsLoaded'
  | 'projectsLoadError'
>;

export const useObservabilityDashboardData = (): ObservabilityDashboardData => {
  const fetchProjects = React.useCallback(
    (options: K8sAPIOptions) =>
      getAPIResource<NamespaceKind[]>(PORTAL_BASE_PATH, MAAS_NAMESPACES_PATH, {
        signal: options.signal,
      }),
    [],
  );

  const {
    dashboards,
    loaded: dashboardsLoaded,
    error: dashboardsError,
  } = usePersesDashboards({
    persesProxyBasePath: PERSES_PROXY_BASE_PATH,
  });

  const {
    data: namespaces,
    loaded: projectsLoaded,
    error: projectsLoadError,
  } = useFetch(fetchProjects, [], { initialPromisePurity: true });

  const projects = namespaces.map(({ name, displayName }) => ({
    name,
    label: displayName || name,
  }));

  return {
    dashboards,
    dashboardsLoaded,
    dashboardsError,
    projects,
    projectsLoaded,
    projectsLoadError,
  };
};
