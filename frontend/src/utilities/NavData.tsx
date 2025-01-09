import * as React from 'react';
import {
  AutomationIcon,
  CatalogIcon,
  CogIcon,
  FolderIcon,
  HomeIcon,
  ProcessAutomationIcon,
  ServicesIcon,
} from '@patternfly/react-icons';
import { SupportedArea, useIsAreaAvailable } from '~/concepts/areas';
import {
  artifactsRootPath,
  executionsRootPath,
  experimentsRootPath,
  pipelineRunsRootPath,
  pipelinesRootPath,
} from '~/routes';
import { useUser } from '~/redux/selectors';
import ModelIcon from '~/images/icons/ModelIcon';

type NavDataCommon = {
  id: string;
};

export type NavDataHref = NavDataCommon & {
  label: React.ReactNode;
  icon?: React.ReactNode;
  href: string;
};

export type NavDataGroup = NavDataCommon & {
  group: {
    id: string;
    label: string;
    icon?: React.ReactNode;
  };
  children: NavDataHref[];
};

export type NavDataItem = NavDataHref | NavDataGroup;

export const isNavDataHref = (navData: NavDataItem): navData is NavDataHref => 'href' in navData;
export const isNavDataGroup = (navData: NavDataItem): navData is NavDataGroup => 'group' in navData;

const useAreaCheck = <T,>(area: SupportedArea, success: T[]): T[] =>
  useIsAreaAvailable(area).status ? success : [];

const useHomeNav = (): NavDataItem[] =>
  useAreaCheck(SupportedArea.HOME, [{ id: 'home', label: 'Home', icon: <HomeIcon />, href: '/' }]);

const useProjectsNav = (): NavDataItem[] =>
  useAreaCheck(SupportedArea.DS_PROJECTS_VIEW, [
    { id: 'dsg', label: 'Projects', icon: <FolderIcon />, href: '/projects' },
  ]);

const useDistributedWorkloadsNav = (): NavDataHref[] =>
  useAreaCheck(SupportedArea.DISTRIBUTED_WORKLOADS, [
    { id: 'workloadMetrics', label: 'Distributed workloads', href: '/distributedWorkloads' },
  ]);

const useDevelopAndTrainNav = (): NavDataItem[] => [
  {
    id: 'developAndTrain',
    group: { id: 'developAndTrain', label: 'Develop and train', icon: <ProcessAutomationIcon /> },
    children: [
      { id: 'notebooks', label: 'Workbenches', href: '/workbenches' },
      { id: 'model-customization', label: 'Model customization', href: '/modelCustomization' },
      { id: 'experiments', label: 'Experiments', href: experimentsRootPath },
      { id: 'artifacts', label: 'Artifacts', href: artifactsRootPath },
    ],
  },
];

const useManageModelsNav = (): NavDataItem[] =>
  useIsAreaAvailable(SupportedArea.MODEL_REGISTRY).status
    ? [
        {
          id: 'manageModels',
          group: { id: 'manageModels', label: 'Models', icon: <ModelIcon /> },
          children: [
            { id: 'modelCatalog', label: 'Model catalog', href: '/modelCatalog' },
            { id: 'modelRegistry', label: 'Model registry', href: '/modelRegistry' },
            { id: 'modelDeployments', label: 'Model deployments', href: '/modelServing' },
          ],
        },
      ]
    : [
        {
          id: 'manageModels',
          group: { id: 'manageModels', label: 'Models', icon: <ModelIcon /> },
          children: [
            { id: 'modelOverview', label: 'Model catalog', href: '/modelCatalog' },
            { id: 'modelDeployments', label: 'Model deployments', href: '/modelServing' },
          ],
        },
      ];

const useAutomateNav = (): NavDataItem[] => [
  {
    id: 'automate',
    group: { id: 'automate', label: 'Automate', icon: <AutomationIcon /> },
    children: [
      { id: 'pipelines', label: 'Pipelines', href: pipelinesRootPath },
      {
        id: 'runs',
        label: 'Runs',
        href: pipelineRunsRootPath,
      },
      { id: 'executions', label: 'Executions', href: executionsRootPath },
    ],
  },
];

const useConfigureNav = (): NavDataItem[] => [
  {
    id: 'configure',
    group: { id: 'configure', label: 'Configure', icon: <CogIcon /> },
    children: [
      { id: 'connections', label: 'Connections', href: '/connections' },
      { id: 'clusterStorage', label: 'Cluster storage', href: '/clusterStorage' },
      ...useDistributedWorkloadsNav(),
      { id: 'applications', label: 'Applications', href: '/applications' },
    ],
  },
];

const useLearnNav = (): NavDataHref[] => [
  { id: 'learn', label: 'Learn', icon: <CatalogIcon />, href: '/resources' },
];

const useClusterSettingsNav = (): NavDataHref[] =>
  useAreaCheck<NavDataHref>(SupportedArea.CLUSTER_SETTINGS, [
    { id: 'settings-cluster-settings', label: 'Cluster settings', href: '/clusterSettings' },
  ]);

const useEnvironmentSetupNav = (): NavDataHref[] =>
  useAreaCheck<NavDataHref>(SupportedArea.CLUSTER_SETTINGS, [
    { id: 'environment-setup', label: 'Environment setup', href: '/environmentSetup' },
  ]);

const useModelResourcesAndOperations = (): NavDataHref[] =>
  useAreaCheck<NavDataHref>(SupportedArea.CLUSTER_SETTINGS, [
    {
      id: 'model-resources-and-operations',
      label: 'Model resources and operations',
      href: '/modelSetup',
    },
  ]);

const useUserManagementNav = (): NavDataHref[] =>
  useAreaCheck<NavDataHref>(SupportedArea.USER_MANAGEMENT, [
    { id: 'settings-group-settings', label: 'User management', href: '/groupSettings' },
  ]);

const useSettingsNav = (): NavDataItem[] => {
  const settingsNavs: NavDataHref[] = [
    ...useClusterSettingsNav(),
    ...useEnvironmentSetupNav(),
    ...useModelResourcesAndOperations(),
    ...useUserManagementNav(),
  ];

  const { isAdmin } = useUser();
  if (!isAdmin || settingsNavs.length === 0) {
    return [];
  }

  return [
    {
      id: 'settings',
      group: { id: 'settings', label: 'Admin settings', icon: <ServicesIcon /> },
      children: settingsNavs,
    },
  ];
};

export const useBuildNavData = (): NavDataItem[] => [
  ...useHomeNav(),
  ...useProjectsNav(),
  ...useManageModelsNav(),
  ...useDevelopAndTrainNav(),
  ...useAutomateNav(),
  ...useConfigureNav(),
  ...useLearnNav(),
  ...useSettingsNav(),
];
