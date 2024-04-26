import * as React from 'react';
import { SupportedArea, useIsAreaAvailable } from '~/concepts/areas';
import { useUser } from '~/redux/selectors';
import {
  artifactsRootPath,
  executionsRootPath,
  experimentsRootPath,
  routePipelineRuns,
  routePipelines,
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

export const isNavDataHref = (navData: NavDataItem): navData is NavDataHref =>
  !!(navData as NavDataHref).href;
export const isNavDataGroup = (navData: NavDataItem): navData is NavDataGroup =>
  !!(navData as NavDataGroup).children;

const useAreaCheck = <T,>(area: SupportedArea, success: T[]): T[] =>
  useIsAreaAvailable(area).status ? success : [];

const useApplicationsNav = (): NavDataItem[] => {
  const isHomeAvailable = useIsAreaAvailable(SupportedArea.HOME).status;

  return [
    {
      id: 'applications',
      group: { id: 'apps', title: 'Applications' },
      children: [
        { id: 'apps-installed', label: 'Enabled', href: isHomeAvailable ? '/enabled' : '/' },
        { id: 'apps-explore', label: 'Explore', href: '/explore' },
      ],
    },
  ];
};

const useHomeNav = (): NavDataItem[] =>
  useAreaCheck(SupportedArea.HOME, [{ id: 'home', label: 'Home', href: '/' }]);

const useDSProjectsNav = (): NavDataItem[] =>
  useAreaCheck(SupportedArea.DS_PROJECTS_VIEW, [
    { id: 'dsg', label: 'Data Science Projects', href: '/projects' },
  ]);

const useDSPipelinesNav = (): NavDataItem[] => {
  const isAvailable = useIsAreaAvailable(SupportedArea.DS_PIPELINES).status;
  const isExperimentsAvailable = useIsAreaAvailable(SupportedArea.PIPELINE_EXPERIMENTS).status;

  if (!isAvailable) {
    return [];
  }

  return [
    {
      id: 'pipelines',
      group: { id: 'pipelines', title: 'Data Science Pipelines' },
      children: [
        { id: 'global-pipelines', label: 'Pipelines', href: routePipelines() },
        { id: 'global-pipeline-runs', label: 'Runs', href: routePipelineRuns() },
      ],
    },
    ...(isExperimentsAvailable
      ? [
          {
            id: 'experiments',
            group: { id: 'experiments', title: 'Experiments' },
            children: [
              {
                id: 'experiments-and-runs',
                label: 'Experiments and runs',
                href: experimentsRootPath,
              },
              {
                id: 'executions',
                label: 'Executions',
                href: executionsRootPath,
              },
              {
                id: 'artifacts',
                label: 'Artifacts',
                href: artifactsRootPath,
              },
            ],
          },
        ]
      : []),
  ];
};

const useDistributedWorkloadsNav = (): NavDataItem[] =>
  useAreaCheck(SupportedArea.DISTRIBUTED_WORKLOADS, [
    { id: 'workloadMetrics', label: 'Distributed Workload Metrics', href: '/distributedWorkloads' },
  ]);

const useModelServingNav = (): NavDataItem[] =>
  useAreaCheck(SupportedArea.MODEL_SERVING, [
    { id: 'modelServing', label: 'Model Serving', href: '/modelServing' },
  ]);

const useModelRegistrySectionNav = (): NavDataItem[] =>
  useAreaCheck(SupportedArea.MODEL_REGISTRY, [
    { id: 'modelRegistry', label: 'Model Registry', href: '/modelRegistry' },
  ]);

const useResourcesNav = (): NavDataHref[] => [
  { id: 'resources', label: 'Resources', href: '/resources' },
];

const useCustomNotebooksNav = (): NavDataHref[] =>
  useAreaCheck<NavDataHref>(SupportedArea.BYON, [
    {
      id: 'settings-notebook-images',
      label: 'Notebook images',
      href: '/notebookImages',
    },
  ]);

const useClusterSettingsNav = (): NavDataHref[] =>
  useAreaCheck<NavDataHref>(SupportedArea.CLUSTER_SETTINGS, [
    {
      id: 'settings-cluster-settings',
      label: 'Cluster settings',
      href: '/clusterSettings',
    },
  ]);

const useCustomRuntimesNav = (): NavDataHref[] =>
  useAreaCheck<NavDataHref>(SupportedArea.CUSTOM_RUNTIMES, [
    {
      id: 'settings-custom-serving-runtimes',
      label: 'Serving runtimes',
      href: '/servingRuntimes',
    },
  ]);

const useUserManagementNav = (): NavDataHref[] =>
  useAreaCheck<NavDataHref>(SupportedArea.USER_MANAGEMENT, [
    {
      id: 'settings-group-settings',
      label: 'User management',
      href: '/groupSettings',
    },
  ]);

const useAcceleratorProfilesNav = (): NavDataHref[] =>
  useAreaCheck<NavDataHref>(SupportedArea.ACCELERATOR_PROFILES, [
    {
      id: 'settings-accelerator-profiles',
      label: 'Accelerator profiles',
      href: '/acceleratorProfiles',
    },
  ]);

const useSettingsNav = (): NavDataGroup[] => {
  const settingsNavs: NavDataHref[] = [
    ...useCustomNotebooksNav(),
    ...useClusterSettingsNav(),
    ...useAcceleratorProfilesNav(),
    ...useCustomRuntimesNav(),
    ...useUserManagementNav(),
  ];

  const { isAdmin } = useUser();
  if (!isAdmin || settingsNavs.length === 0) {
    return [];
  }

  return [
    {
      id: 'settings',
      group: { id: 'settings', title: 'Settings' },
      children: settingsNavs,
    },
  ];
};

export const useBuildNavData = (): NavDataItem[] => [
  ...useHomeNav(),
  ...useApplicationsNav(),
  ...useDSProjectsNav(),
  ...useDSPipelinesNav(),
  ...useDistributedWorkloadsNav(),
  ...useModelServingNav(),
  ...useModelRegistrySectionNav(),
  ...useResourcesNav(),
  ...useSettingsNav(),
];
