import * as React from 'react';
import type { DashboardResource } from '@perses-dev/core';
import type { K8sAPIOptions, NamespaceKind } from '@odh-dashboard/k8s-core';
import { getAPIResource } from '@odh-dashboard/k8s-core/api/apiResource';
import useFetch from '@odh-dashboard/ui-core/hooks/useFetch';
import type { DashboardViewProps } from '@odh-dashboard/observability/dashboard';
import { MAAS_NAMESPACES_PATH, MAAS_USAGE_DASHBOARDS_PATH } from './paths';
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

const isNamespaceList = (value: unknown): value is NamespaceKind[] =>
  Array.isArray(value) &&
  value.every(
    (namespace): namespace is NamespaceKind =>
      typeof namespace === 'object' &&
      namespace !== null &&
      typeof namespace.name === 'string' &&
      (namespace.displayName === undefined || typeof namespace.displayName === 'string'),
  );

const isDashboardList = (value: unknown): value is DashboardResource[] =>
  Array.isArray(value) &&
  value.every(
    (dashboard) =>
      typeof dashboard === 'object' &&
      dashboard !== null &&
      dashboard.kind === 'Dashboard' &&
      typeof dashboard.metadata?.name === 'string' &&
      typeof dashboard.metadata?.project === 'string' &&
      typeof dashboard.spec === 'object' &&
      dashboard.spec !== null,
  );

export const useObservabilityDashboardData = (): ObservabilityDashboardData => {
  const fetchDashboards = React.useCallback(
    (options: K8sAPIOptions) =>
      getAPIResource<DashboardResource[]>(
        PORTAL_BASE_PATH,
        MAAS_USAGE_DASHBOARDS_PATH,
        isDashboardList,
        { signal: options.signal },
      ),
    [],
  );
  const fetchProjects = React.useCallback(
    (options: K8sAPIOptions) =>
      getAPIResource<NamespaceKind[]>(PORTAL_BASE_PATH, MAAS_NAMESPACES_PATH, isNamespaceList, {
        signal: options.signal,
      }),
    [],
  );

  const {
    data: dashboards,
    loaded: dashboardsLoaded,
    error: dashboardsError,
  } = useFetch(fetchDashboards, [], { initialPromisePurity: true });

  const {
    data: namespaces,
    loaded: projectsLoaded,
    error: projectsLoadError,
  } = useFetch(fetchProjects, [], { initialPromisePurity: true });

  const projects = React.useMemo(
    () =>
      namespaces.map(({ name, displayName }) => ({
        name,
        label: displayName || name,
      })),
    [namespaces],
  );

  return {
    dashboards,
    dashboardsLoaded,
    dashboardsError,
    projects,
    projectsLoaded,
    projectsLoadError,
  };
};
