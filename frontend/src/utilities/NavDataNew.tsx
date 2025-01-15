import * as React from 'react';
import { SupportedArea, useIsAreaAvailable } from '~/concepts/areas';
import {
  artifactsRootPath,
  executionsRootPath,
  experimentsRootPath,
  pipelinesRootPath,
} from '~/routes';

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

export const isNavDataHref = (navData: NavDataItem): navData is NavDataHref => 'href' in navData;
export const isNavDataGroup = (navData: NavDataItem): navData is NavDataGroup => 'group' in navData;

const useAreaCheck = <T,>(area: SupportedArea, success: T[]): T[] =>
  useIsAreaAvailable(area).status ? success : [];

const useHomeNav = (): NavDataItem[] =>
  useAreaCheck(SupportedArea.HOME, [{ id: 'home', label: 'Home', href: '/' }]);

const useProjectsNav = (): NavDataItem[] =>
  useAreaCheck(SupportedArea.DS_PROJECTS_VIEW, [
    { id: 'dsg', label: 'Projects', href: '/projects' },
  ]);

const useDevelopAndTrainNav = (): NavDataItem[] => [
  {
    id: 'developAndTrain',
    group: { id: 'developAndTrain', title: 'Develop and Train' },
    children: [
      { id: 'notebooks', label: 'Workbenches', href: '/workbenches' },
      { id: 'experimentsAndRuns', label: 'Experiments and runs', href: experimentsRootPath },
      { id: 'executions', label: 'Executions', href: executionsRootPath },
      { id: 'artifacts', label: 'Artifacts', href: artifactsRootPath },
    ],
  },
];

const useManageModelsNav = (): NavDataItem[] => [
  {
    id: 'manageModels',
    group: { id: 'manageModels', title: 'Manage models' },
    children: [
      { id: 'modelOverview', label: 'Model overview', href: '/model-overview' },
      { id: 'modelRegistry', label: 'Model registry', href: '/modelRegistry' },
      { id: 'modelDeployments', label: 'Model deployments', href: '/deployedModels' },
    ],
  },
];

const useAutomateNav = (): NavDataItem[] => [
  {
    id: 'automate',
    group: { id: 'automate', title: 'Automate' },
    children: [{ id: 'pipelines', label: 'Pipelines', href: pipelinesRootPath }],
  },
];

const useConfigureNav = (): NavDataItem[] => [
  {
    id: 'configure',
    group: { id: 'configure', title: 'Configure' },
    children: [
      { id: 'connections', label: 'Connections', href: '/connectionTypes' },
      { id: 'clusterStorage', label: 'Cluster storage', href: '/clusterStorage' },
      { id: 'applications', label: 'Applications', href: '/applications' },
    ],
  },
];

const useLearnNav = (): NavDataHref[] => [{ id: 'learn', label: 'Learn', href: '/resources' }];

const useCustomNotebooksNav = (): NavDataHref[] =>
  useAreaCheck<NavDataHref>(SupportedArea.BYON, [
    { id: 'settings-notebook-images', label: 'Notebook images', href: '/notebookImages' },
  ]);

const useClusterSettingsNav = (): NavDataHref[] =>
  useAreaCheck<NavDataHref>(SupportedArea.CLUSTER_SETTINGS, [
    { id: 'settings-cluster-settings', label: 'Cluster settings', href: '/clusterSettings' },
  ]);

const useCustomRuntimesNav = (): NavDataHref[] =>
  useAreaCheck<NavDataHref>(SupportedArea.CUSTOM_RUNTIMES, [
    { id: 'settings-custom-serving-runtimes', label: 'Serving runtimes', href: '/servingRuntimes' },
  ]);

const useUserManagementNav = (): NavDataHref[] =>
  useAreaCheck<NavDataHref>(SupportedArea.USER_MANAGEMENT, [
    { id: 'settings-group-settings', label: 'User management', href: '/groupSettings' },
  ]);

const useAcceleratorProfilesNav = (): NavDataHref[] =>
  useAreaCheck<NavDataHref>(SupportedArea.ACCELERATOR_PROFILES, [
    { id: 'accelerator-profiles', label: 'Accelerator profiles', href: '/acceleratorProfiles' },
  ]);

const useStorageClassesNav = (): NavDataHref[] =>
  useAreaCheck<NavDataHref>(SupportedArea.STORAGE_CLASSES, [
    { id: 'storage-classes', label: 'Storage classes', href: '/storageClasses' },
  ]);

const useSettingsNav = (): NavDataItem[] => [
  {
    id: 'settings',
    group: { id: 'settings', title: 'Settings' },
    children: [
      ...useCustomNotebooksNav(),
      ...useClusterSettingsNav(),
      ...useAcceleratorProfilesNav(),
      ...useCustomRuntimesNav(),
      ...useStorageClassesNav(),
      ...useUserManagementNav(),
    ],
  },
];
export const useBuildNavData = (): NavDataItem[] => [
  ...useHomeNav(),
  ...useProjectsNav(),
  ...useDevelopAndTrainNav(),
  ...useManageModelsNav(),
  ...useAutomateNav(),
  ...useConfigureNav(),
  ...useLearnNav(),
  ...useSettingsNav(),
];
