import * as React from 'react';
import { ExclamationCircleIcon } from '@patternfly/react-icons';
import { Icon, Split, SplitItem } from '@patternfly/react-core';
import { DashboardConfig } from '~/types';
import { featureFlagEnabled } from './utils';

type NavDataCommon = {
  id: string;
};

export type NavDataHref = NavDataCommon & {
  label: React.ReactNode;
  href: string;
};

export type NavDataGroup = NavDataCommon & {
  group: {
    id: string;
    title: string;
  };
  children: NavDataHref[];
};

export type NavDataItem = NavDataHref | NavDataGroup;

export const isNavDataHref = (navData: NavDataItem): navData is NavDataHref =>
  !!(navData as NavDataHref)?.href;
export const isNavDataGroup = (navData: NavDataItem): navData is NavDataGroup =>
  !!(navData as NavDataGroup)?.children;

const getSettingsNav = (
  isAdmin: boolean,
  dashboardConfig: DashboardConfig,
): NavDataGroup | null => {
  if (!isAdmin) {
    return null;
  }

  const settingsNavs: NavDataHref[] = [];
  if (featureFlagEnabled(dashboardConfig.spec.dashboardConfig.disableBYONImageStream)) {
    settingsNavs.push({
      id: 'settings-notebook-images',
      label: 'Notebook images',
      href: '/notebookImages',
    });
  }

  if (featureFlagEnabled(dashboardConfig.spec.dashboardConfig.disableClusterManager)) {
    settingsNavs.push({
      id: 'settings-cluster-settings',
      label: 'Cluster settings',
      href: '/clusterSettings',
    });
  }

  if (
    featureFlagEnabled(dashboardConfig.spec.dashboardConfig.disableCustomServingRuntimes) &&
    featureFlagEnabled(dashboardConfig.spec.dashboardConfig.disableModelServing)
  ) {
    settingsNavs.push({
      id: 'settings-custom-serving-runtimes',
      label: 'Serving runtimes',
      href: '/servingRuntimes',
    });
  }

  if (featureFlagEnabled(dashboardConfig.spec.dashboardConfig.disableUserManagement)) {
    settingsNavs.push({
      id: 'settings-group-settings',
      label: 'User management',
      href: '/groupSettings',
    });
  }

  if (settingsNavs.length === 0) {
    return null;
  }

  return {
    id: 'settings',
    group: { id: 'settings', title: 'Settings' },
    children: settingsNavs,
  };
};

export const getNavBarData = (
  isAdmin: boolean,
  dashboardConfig: DashboardConfig,
): NavDataItem[] => {
  const navItems: NavDataItem[] = [];

  navItems.push({
    id: 'applications',
    group: { id: 'apps', title: 'Applications' },
    children: [
      { id: 'apps-installed', label: 'Enabled', href: '/' },
      { id: 'apps-explore', label: 'Explore', href: '/explore' },
    ],
  });

  if (featureFlagEnabled(dashboardConfig.spec.dashboardConfig.disableProjects)) {
    navItems.push({ id: 'dsg', label: 'Data Science Projects', href: '/projects' });
  }

  if (featureFlagEnabled(dashboardConfig.spec.dashboardConfig.disablePipelines)) {
    const operatorAvailable =
      dashboardConfig.status.dependencyOperators.redhatOpenshiftPipelines.available;

    if (operatorAvailable) {
      navItems.push({
        id: 'pipelines',
        group: { id: 'pipelines', title: 'Data Science Pipelines' },
        children: [
          { id: 'global-pipelines', label: 'Pipelines', href: '/pipelines' },
          { id: 'global-pipeline-runs', label: 'Runs', href: '/pipelineRuns' },
        ],
      });
    } else {
      navItems.push({
        id: 'pipelines',
        label: (
          <Split hasGutter>
            <SplitItem>Data Science Pipelines</SplitItem>
            <SplitItem>
              <Icon status="danger" isInline>
                <ExclamationCircleIcon />
              </Icon>
            </SplitItem>
          </Split>
        ),
        href: `/dependency-missing/pipelines`,
      });
    }
  }

  if (featureFlagEnabled(dashboardConfig.spec.dashboardConfig.disableModelServing)) {
    navItems.push({ id: 'modelServing', label: 'Model Serving', href: '/modelServing' });
  }

  navItems.push({ id: 'resources', label: 'Resources', href: '/resources' });

  const settingsNav = getSettingsNav(isAdmin, dashboardConfig);
  if (settingsNav) {
    navItems.push(settingsNav);
  }

  return navItems;
};
