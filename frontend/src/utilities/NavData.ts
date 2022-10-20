import { DashboardConfig } from '../types';

type NavDataCommon = {
  id: string;
};

export type NavDataHref = NavDataCommon & {
  label: string;
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
  if (!isAdmin) return null;

  const settingsNavs: NavDataHref[] = [];
  if (!dashboardConfig.spec.dashboardConfig.disableBYONImageStream)
    settingsNavs.push({
      id: 'settings-notebook-images',
      label: 'Notebook Images',
      href: '/notebookImages',
    });

  if (!dashboardConfig.spec.dashboardConfig.disableClusterManager)
    settingsNavs.push({
      id: 'settings-cluster-settings',
      label: 'Cluster settings',
      href: '/clusterSettings',
    });

  if (!dashboardConfig.spec.dashboardConfig.disableUserManagement)
    settingsNavs.push({
      id: 'settings-group-settings',
      label: 'User management',
      href: '/groupSettings',
    });

  if (settingsNavs.length === 0) return null;

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

  if (!dashboardConfig.spec.dashboardConfig.disableProjects) {
    navItems.push({ id: 'dsg', label: 'Data Science Projects', href: '/projects' });
  }

  if (!dashboardConfig.spec.dashboardConfig.disableModelServing) {
    navItems.push({ id: 'modelServing', label: 'Model Serving', href: '/modelServing' });
  }

  navItems.push({ id: 'resources', label: 'Resources', href: '/resources' });

  const settingsNav = getSettingsNav(isAdmin, dashboardConfig);
  if (settingsNav) {
    navItems.push(settingsNav);
  }

  return navItems;
};
