import { DashboardConfig } from '../types';
export type NavDataItem = {
  id?: string;
  label?: string;
  href?: string;
  group?: {
    id: string;
    title: string;
  };
  children?: NavDataItem[];
};

const baseNavData: NavDataItem[] = [
  {
    id: 'applications',
    group: { id: 'apps', title: 'Applications' },
    children: [
      { id: 'apps-installed', label: 'Enabled', href: '/' },
      { id: 'apps-explore', label: 'Explore', href: '/explore' },
    ],
  },
  { id: 'dsg', label: 'Data Science Projects', href: '/projects' },
  { id: 'resources', label: 'Resources', href: '/resources' },
];

export const getNavBarData = (
  isAdmin: boolean,
  dashboardConfig: DashboardConfig,
): NavDataItem[] => {
  if (!isAdmin) return baseNavData;

  const enabledFeatures: NavDataItem[] = [];

  if (!dashboardConfig.spec.dashboardConfig.disableBYONImageStream)
    enabledFeatures.push({
      id: 'settings-notebook-images',
      label: 'Notebook Images',
      href: '/notebookImages',
    });

  if (!dashboardConfig.spec.dashboardConfig.disableClusterManager)
    enabledFeatures.push({
      id: 'settings-cluster-settings',
      label: 'Cluster settings',
      href: '/clusterSettings',
    });

  if (!dashboardConfig.spec.dashboardConfig.disableUserManagement)
    enabledFeatures.push({
      id: 'settings-group-settings',
      label: 'User management',
      href: '/groupSettings',
    });

  if (enabledFeatures.length > 0) {
    return [
      ...baseNavData,
      {
        id: 'settings',
        group: { id: 'settings', title: 'Settings' },
        children: enabledFeatures,
      },
    ];
  }

  return baseNavData;
};
