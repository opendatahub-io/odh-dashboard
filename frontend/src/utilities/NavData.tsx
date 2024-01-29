import * as React from 'react';
import { ExclamationCircleIcon } from '@patternfly/react-icons';
import { Icon, Split, SplitItem } from '@patternfly/react-core';
import { SupportedArea, useIsAreaAvailable } from '~/concepts/areas';
import { useAppContext } from '~/app/AppContext';
import { useUser } from '~/redux/selectors';

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

const useApplicationsNav = (): NavDataItem[] => [
  {
    id: 'applications',
    group: { id: 'apps', title: 'Applications' },
    children: [
      { id: 'apps-installed', label: 'Enabled', href: '/' },
      { id: 'apps-explore', label: 'Explore', href: '/explore' },
    ],
  },
];

const useDSProjectsNav = (): NavDataItem[] =>
  useAreaCheck(SupportedArea.DS_PROJECTS_VIEW, [
    { id: 'dsg', label: 'Data Science Projects', href: '/projects' },
  ]);

const useDSPipelinesNav = (): NavDataItem[] => {
  const { dashboardConfig } = useAppContext();
  const isAvailable = useIsAreaAvailable(SupportedArea.DS_PIPELINES).status;

  if (!isAvailable) {
    return [];
  }

  const operatorAvailable =
    dashboardConfig.status.dependencyOperators.redhatOpenshiftPipelines.available;

  if (operatorAvailable) {
    return [
      {
        id: 'pipelines',
        group: { id: 'pipelines', title: 'Data Science Pipelines' },
        children: [
          { id: 'global-pipelines', label: 'Pipelines', href: '/pipelines' },
          { id: 'global-pipeline-runs', label: 'Runs', href: '/pipelineRuns' },
        ],
      },
    ];
  }

  return [
    {
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
    },
  ];
};

const useModelServingNav = (): NavDataItem[] =>
  useAreaCheck(SupportedArea.MODEL_SERVING, [
    { id: 'modelServing', label: 'Model Serving', href: '/modelServing' },
  ]);

const useResourcesNav = (): NavDataHref[] => [
  { id: 'resources', label: 'Resources', href: '/resources' },
];

const useCustomNotebooksNav = (): NavDataHref[] =>
  useAreaCheck<NavDataHref>(SupportedArea.BYON, [
    {
      id: 'settings-notebook-images',
      label: 'Notebook image settings',
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
  ...useApplicationsNav(),
  ...useDSProjectsNav(),
  ...useDSPipelinesNav(),
  ...useModelServingNav(),
  ...useResourcesNav(),
  ...useSettingsNav(),
];
