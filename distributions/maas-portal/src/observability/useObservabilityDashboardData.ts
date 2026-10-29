import * as React from 'react';
import { useFeatureFlag } from '@openshift/dynamic-plugin-sdk';
import type { DashboardResource } from '@perses-dev/core';
import type { K8sAPIOptions, NamespaceKind } from '@odh-dashboard/k8s-core';
import { getAPIResource } from '@odh-dashboard/k8s-core/api/apiResource';
import useFetch from '@odh-dashboard/ui-core/hooks/useFetch';
import {
  type DashboardViewProps,
  usePersesDashboards,
} from '@odh-dashboard/observability/dashboard';
import { MAAS_NAMESPACES_PATH, MAAS_USAGE_DASHBOARDS_PATH, PERSES_PROXY_BASE_PATH } from './paths';
import { PORTAL_BASE_PATH } from '../portalPaths';
import { GRID } from '../featureFlags';

export type ObservabilityDashboardData = Pick<
  DashboardViewProps,
  | 'dashboards'
  | 'dashboardsLoaded'
  | 'dashboardsError'
  | 'projects'
  | 'projectsLoaded'
  | 'projectsLoadError'
  | 'requireProjectsForNamespaceDashboards'
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
  const [gridEnabled] = useFeatureFlag(GRID);
  const fetchDashboards = React.useCallback(
    (options: K8sAPIOptions) =>
      gridEnabled
        ? getAPIResource<DashboardResource[]>(
            PORTAL_BASE_PATH,
            MAAS_USAGE_DASHBOARDS_PATH,
            isDashboardList,
            { signal: options.signal },
          )
        : Promise.resolve<DashboardResource[]>([]),
    [gridEnabled],
  );
  const fetchProjects = React.useCallback(
    (options: K8sAPIOptions) =>
      gridEnabled
        ? Promise.resolve([])
        : getAPIResource<NamespaceKind[]>(PORTAL_BASE_PATH, MAAS_NAMESPACES_PATH, isNamespaceList, {
            signal: options.signal,
          }),
    [gridEnabled],
  );

  const {
    dashboards: persesDashboards,
    loaded: persesDashboardsLoaded,
    error: persesDashboardsError,
  } = usePersesDashboards({
    fetchDashboardList: !gridEnabled,
    persesProxyBasePath: PERSES_PROXY_BASE_PATH,
  });

  const {
    data: maasDashboards,
    loaded: maasDashboardsLoaded,
    error: maasDashboardsError,
  } = useFetch(fetchDashboards, [], { initialPromisePurity: true });

  const {
    data: namespaces,
    loaded: fetchedProjectsLoaded,
    error: fetchedProjectsLoadError,
  } = useFetch(fetchProjects, [], { initialPromisePurity: true });

  const projects = React.useMemo(
    () =>
      gridEnabled
        ? []
        : namespaces.map(({ name, displayName }) => ({
            name,
            label: displayName || name,
          })),
    [gridEnabled, namespaces],
  );

  return {
    dashboards: gridEnabled ? maasDashboards : persesDashboards,
    dashboardsLoaded: gridEnabled ? maasDashboardsLoaded : persesDashboardsLoaded,
    dashboardsError: gridEnabled ? maasDashboardsError : persesDashboardsError,
    projects,
    projectsLoaded: gridEnabled || fetchedProjectsLoaded,
    projectsLoadError: gridEnabled ? undefined : fetchedProjectsLoadError,
    requireProjectsForNamespaceDashboards: !gridEnabled,
  };
};
