import * as React from 'react';
import { SupportedArea, useIsAreaAvailable } from '~/concepts/areas';
import { useUser } from '~/redux/selectors';
import {
  artifactsRootPath,
  executionsRootPath,
  experimentsRootPath,
  pipelineRunsRootPath,
  pipelinesRootPath,
} from '~/routes';
import { HardwareProfileModel } from '~/api';
import { AccessReviewResourceAttributes } from '~/k8sTypes';
import { useAccessAllowed, verbModelAccess } from '~/concepts/userSSAR';

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
export const isNavDataGroup = (navData: NavDataItem): navData is NavDataGroup =>
  'children' in navData;

const useAreaCheck = <T,>(
  area: SupportedArea,
  success: T[],
  resourceAttributes?: AccessReviewResourceAttributes,
): T[] => {
  const [isAccessAllowed, isAccessLoaded] = useAccessAllowed(
    resourceAttributes || { verb: '*' },
    !!resourceAttributes,
  );
  const isAreaAvailable = useIsAreaAvailable(area).status;

  if (!resourceAttributes) {
    return isAreaAvailable ? success : [];
  }

  if (!isAccessLoaded) {
    return [];
  }

  return isAccessAllowed && isAreaAvailable ? success : [];
};

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

/**
 * @deprecated - when we move to SSAR for all admin navs, remove this.
 * @see UserState.isAdmin
 */
const useIsAdminAreaCheck: typeof useAreaCheck = (...args) => {
  const { isAdmin } = useUser();
  const navData = useAreaCheck(...args);

  return isAdmin ? navData : [];
};

const useHomeNav = (): NavDataItem[] =>
  useAreaCheck(SupportedArea.HOME, [{ id: 'home', label: 'Home', href: '/' }]);

const useDSProjectsNav = (): NavDataItem[] =>
  useAreaCheck(SupportedArea.DS_PROJECTS_VIEW, [
    { id: 'dsg', label: 'Data Science Projects', href: '/projects' },
  ]);

const useDSPipelinesNav = (): NavDataItem[] => {
  const isAvailable = useIsAreaAvailable(SupportedArea.DS_PIPELINES).status;
  const isFineTuningAvailable = useIsAreaAvailable(SupportedArea.FINE_TUNING).status;

  if (!isAvailable) {
    return [];
  }

  const modelCustomizationNavChild = isFineTuningAvailable
    ? [
        {
          id: 'modelCustomization',
          label: 'Model Customization',
          href: '/modelCustomization',
        },
      ]
    : [];

  return [
    {
      id: 'pipelines-and-runs',
      group: { id: 'pipelines-and-runs', title: 'Data Science Pipelines' },
      children: [
        {
          id: 'pipelines',
          label: 'Pipelines',
          href: pipelinesRootPath,
        },
        {
          id: 'runs',
          label: 'Runs',
          href: pipelineRunsRootPath,
        },
        ...modelCustomizationNavChild,
      ],
    },
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

const useModelCatalogSectionNav = (): NavDataItem[] =>
  useAreaCheck(SupportedArea.MODEL_CATALOG, [
    { id: 'modelCatalog', label: 'Model Catalog', href: '/modelCatalog' },
  ]);

const useModelRegistrySectionNav = (): NavDataItem[] =>
  useAreaCheck(SupportedArea.MODEL_REGISTRY, [
    { id: 'modelRegistry', label: 'Model Registry', href: '/modelRegistry' },
  ]);

const useResourcesNav = (): NavDataHref[] => [
  { id: 'resources', label: 'Resources', href: '/resources' },
];

const useCustomNotebooksNav = (): NavDataHref[] =>
  useIsAdminAreaCheck<NavDataHref>(SupportedArea.BYON, [
    {
      id: 'settings-notebook-images',
      label: 'Notebook images',
      href: '/notebookImages',
    },
  ]);

const useClusterSettingsNav = (): NavDataHref[] =>
  useIsAdminAreaCheck<NavDataHref>(SupportedArea.CLUSTER_SETTINGS, [
    {
      id: 'settings-cluster-settings',
      label: 'Cluster settings',
      href: '/clusterSettings',
    },
  ]);

const useCustomRuntimesNav = (): NavDataHref[] =>
  useIsAdminAreaCheck<NavDataHref>(SupportedArea.CUSTOM_RUNTIMES, [
    {
      id: 'settings-custom-serving-runtimes',
      label: 'Serving runtimes',
      href: '/servingRuntimes',
    },
  ]);

const useConnectionTypesNav = (): NavDataHref[] =>
  useIsAdminAreaCheck<NavDataHref>(SupportedArea.ADMIN_CONNECTION_TYPES, [
    {
      id: 'settings-connection-types',
      label: 'Connection types',
      href: '/connectionTypes',
    },
  ]);

const useStorageClassesNav = (): NavDataHref[] =>
  useIsAdminAreaCheck<NavDataHref>(SupportedArea.STORAGE_CLASSES, [
    {
      id: 'settings-storage-classes',
      label: 'Storage classes',
      href: '/storageClasses',
    },
  ]);

const useModelRegisterySettingsNav = (): NavDataHref[] =>
  useIsAdminAreaCheck<NavDataHref>(SupportedArea.MODEL_REGISTRY, [
    {
      id: 'settings-model-registry',
      label: 'Model registry settings',
      href: '/modelRegistrySettings',
    },
  ]);

const useUserManagementNav = (): NavDataHref[] =>
  useIsAdminAreaCheck<NavDataHref>(SupportedArea.USER_MANAGEMENT, [
    {
      id: 'settings-group-settings',
      label: 'User management',
      href: '/groupSettings',
    },
  ]);

const useAcceleratorProfilesNav = (): NavDataHref[] =>
  useIsAdminAreaCheck<NavDataHref>(SupportedArea.ACCELERATOR_PROFILES, [
    {
      id: 'settings-accelerator-profiles',
      label: 'Accelerator profiles',
      href: '/acceleratorProfiles',
    },
  ]);

const useHardwareProfilesNav = (): NavDataHref[] =>
  useAreaCheck<NavDataHref>(
    SupportedArea.HARDWARE_PROFILES,
    [
      {
        id: 'settings-hardware-profiles',
        label: 'Hardware profiles',
        href: '/hardwareProfiles',
      },
    ],
    verbModelAccess('list', HardwareProfileModel),
  );

const useSettingsNav = (): NavDataGroup[] => {
  const settingsNavs: NavDataHref[] = [
    ...useCustomNotebooksNav(),
    ...useClusterSettingsNav(),
    ...useAcceleratorProfilesNav(),
    ...useHardwareProfilesNav(),
    ...useCustomRuntimesNav(),
    ...useConnectionTypesNav(),
    ...useStorageClassesNav(),
    ...useModelRegisterySettingsNav(),
    ...useUserManagementNav(),
  ];

  if (settingsNavs.length === 0) {
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
  ...useModelCatalogSectionNav(),
  ...useModelRegistrySectionNav(),
  ...useModelServingNav(),
  ...useResourcesNav(),
  ...useSettingsNav(),
];
