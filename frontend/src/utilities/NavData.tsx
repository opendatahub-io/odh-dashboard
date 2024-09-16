import * as React from 'react';
import { SupportedArea, useIsAreaAvailable } from '~/concepts/areas';
import { useUser } from '~/redux/selectors';
import { ProjectsContext } from '~/concepts/projects/ProjectsContext';
import useModelServingEnabled from '~/pages/modelServing/useModelServingEnabled';
import useConnectionTypesEnabled from '~/concepts/connectionTypes/useConnectionTypesEnabled';

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

export type NavDataSection = NavDataCommon & {
  section: {
    id: string;
    title: string;
  };
  children: (NavDataHref | NavDataGroup)[];
};

export type NavDataItem = NavDataHref | NavDataGroup | NavDataSection;

export const isNavDataHref = (navData: NavDataItem): navData is NavDataHref => 'href' in navData;
export const isNavDataGroup = (navData: NavDataItem): navData is NavDataGroup => 'group' in navData;
export const isNavDataSection = (navData: NavDataItem): navData is NavDataSection =>
  'section' in navData;

const useAreaCheck = <T,>(area: SupportedArea, success: T[]): T[] =>
  useIsAreaAvailable(area).status ? success : [];

// const useApplicationsNav = (): NavDataItem[] => {
//   const isHomeAvailable = useIsAreaAvailable(SupportedArea.HOME).status;
//
//   return [
//     {
//       id: 'applications',
//       group: { id: 'apps', title: 'Applications' },
//       children: [
//         { id: 'apps-installed', label: 'Enabled', href: isHomeAvailable ? '/enabled' : '/' },
//         { id: 'apps-explore', label: 'Explore', href: '/explore' },
//       ],
//     },
//   ];
// };

const useHomeNav = (): NavDataItem[] =>
  useAreaCheck(SupportedArea.HOME, [{ id: 'home', label: 'Home', href: '/' }]);

const useDSProjectsNav = (): NavDataItem[] =>
  useAreaCheck(SupportedArea.DS_PROJECTS_VIEW, [
    { id: 'dsg', label: 'Projects', href: '/projects' },
  ]);

const useAllModelsNav = (): NavDataHref[] => [
  { id: 'all-models', label: 'All models', href: '/models' },
];

const useMonitorModelsNav = (): NavDataHref[] => [
  { id: 'monitor-models', label: 'Monitor', href: '/monitorModels' },
];

const useModelsNav = (): NavDataGroup[] => [
  {
    id: 'models',
    group: {
      id: 'models',
      title: 'Models',
    },
    children: [...useAllModelsNav(), ...useMonitorModelsNav()],
  },
];

const namespacedRoute = (route: string, namespace?: string) =>
  namespace ? `/projects/${namespace}/${route}` : `/${route}`;

const useNotebooksNav = (ns?: string): NavDataHref[] => [
  {
    id: 'notebooks',
    label: 'Workbenches',
    href: namespacedRoute('workbenches', ns),
  },
];

const usePipelinesNav = (ns?: string): NavDataHref[] => {
  const isAvailable = useIsAreaAvailable(SupportedArea.DS_PIPELINES).status;
  const isExperimentsAvailable = useIsAreaAvailable(SupportedArea.PIPELINE_EXPERIMENTS).status;

  if (!isAvailable || !isExperimentsAvailable) {
    return [];
  }

  return [
    {
      id: 'experiments-and-runs',
      label: 'Experiments',
      href: namespacedRoute('experiments', ns),
    },
    {
      id: 'executions',
      label: 'Executions',
      href: namespacedRoute('executions', ns),
    },
    {
      id: 'artifacts',
      label: 'Artifacts',
      href: namespacedRoute('artifacts', ns),
    },
    {
      id: 'training',
      label: 'Training',
      href: namespacedRoute('training', ns),
    },
    {
      id: 'tuning',
      label: 'Tuning',
      href: namespacedRoute('tuning', ns),
    },
  ];
};

const useDistributedWorkloadsNav = (ns?: string): NavDataHref[] =>
  useAreaCheck(SupportedArea.DISTRIBUTED_WORKLOADS, [
    {
      id: 'workloadMetrics',
      label: 'Distributed workload metrics',
      href: namespacedRoute('distributedWorkloads', ns),
    },
  ]);

// const useModelServingNav = (): NavDataHref[] =>
//   useAreaCheck(SupportedArea.MODEL_SERVING, [
//     { id: 'modelServing', label: 'Deployed models', href: '/modelServing' },
//   ]);

const useModelRegistryNav = (ns?: string): NavDataHref[] =>
  useAreaCheck(SupportedArea.MODEL_REGISTRY, [
    { id: 'modelRegistry', label: 'Model Registry', href: namespacedRoute('modelRegistry', ns) },
  ]);

const useDeployedModelsNav = (ns?: string): NavDataHref[] => {
  const modelServingEnabled = useModelServingEnabled();
  if (!modelServingEnabled) {
    return [];
  }
  return [
    {
      id: 'deployed-models',
      label: 'Deployed models',
      href: namespacedRoute('deployedModels', ns),
    },
  ];
};

// const useResourcesNav = (): NavDataHref[] => [
//   { id: 'resources', label: 'Resources', href: '/resources' },
// ];

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

const useConnectionTypesNav = (): NavDataHref[] =>
  useAreaCheck<NavDataHref>(SupportedArea.CONNECTION_TYPES, [
    {
      id: 'settings-connection-types',
      label: 'Connection types',
      href: '/connectionTypes',
    },
  ]);

const useStorageClassesNav = (): NavDataHref[] =>
  useAreaCheck<NavDataHref>(SupportedArea.STORAGE_CLASSES, [
    {
      id: 'settings-storage-classes',
      label: 'Storage classes',
      href: '/storageClasses',
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

const useMonitorResourcesNav = (ns?: string): NavDataHref[] => [
  {
    id: 'monitor-resources',
    label: 'Resource monitoring',
    href: namespacedRoute('monitorResources', ns),
  },
];

const useConnectionsNav = (ns?: string): NavDataHref[] => {
  const connectionTypesEnabled = useConnectionTypesEnabled();
  if (!connectionTypesEnabled) {
    return [];
  }

  return [
    {
      id: 'connections',
      label: 'Connections',
      href: namespacedRoute('connections', ns),
    },
  ];
};

const useClusterStorageNav = (ns?: string): NavDataHref[] => [
  {
    id: 'cluster-storage',
    label: 'Cluster storage',
    href: namespacedRoute('clusterStorage', ns),
  },
];

const useProjectPermissionsNav = (ns?: string): NavDataHref[] => [
  {
    id: 'project-permissions',
    label: 'Permissions',
    href: namespacedRoute('projectPermissions', ns),
  },
];

const useDevelopAndTrainNav = (namespace?: string): NavDataGroup[] => [
  {
    id: 'develop-and-train',
    group: {
      id: 'develop-and-train',
      title: 'Develop & Train',
    },
    children: [...useNotebooksNav(namespace), ...usePipelinesNav(namespace)],
  },
];

const useAutomateNav = (ns?: string): NavDataGroup[] => {
  const isAvailable = useIsAreaAvailable(SupportedArea.DS_PIPELINES).status;

  if (!isAvailable) {
    return [];
  }

  return [
    {
      id: 'automate',
      group: {
        id: 'automate',
        title: 'Automate',
      },
      children: [{ id: 'pipelines', label: 'Pipelines', href: namespacedRoute('pipelines', ns) }],
    },
  ];
};

const useDeployModelsGroupNav = (ns?: string): NavDataGroup[] => {
  const children = [...useModelRegistryNav(ns), ...useDeployedModelsNav(ns)];
  if (!children.length) {
    return [];
  }

  return [
    {
      id: 'deploy-models-group',
      group: {
        id: 'deploy-models-group',
        title: 'Deploy models',
      },
      children,
    },
  ];
};

const useConfigureResourcesNav = (ns?: string): NavDataGroup[] => {
  const children = [
    ...useConnectionsNav(ns),
    ...useClusterStorageNav(ns),
    ...useDistributedWorkloadsNav(ns),
    ...useMonitorResourcesNav(ns),
    ...useProjectPermissionsNav(ns),
  ];

  return [
    {
      id: 'configure-resources',
      group: {
        id: 'configure-resources',
        title: 'Configure resources',
      },
      children,
    },
  ];
};

const useProjectScopedNav = (): NavDataSection[] => {
  const { preferredProject } = React.useContext(ProjectsContext);
  const namespace = preferredProject?.metadata.name;
  const children = [
    ...useDevelopAndTrainNav(namespace),
    ...useAutomateNav(namespace),
    ...useDeployModelsGroupNav(namespace),
    ...useConfigureResourcesNav(namespace),
  ];
  return [
    {
      id: 'project-scoped',
      section: {
        id: 'project-scoped',
        title: 'Project scoped',
      },
      children,
    },
  ];
};

const useSettingsNav = (): NavDataGroup[] => {
  const settingsNavs: NavDataHref[] = [
    ...useCustomNotebooksNav(),
    ...useClusterSettingsNav(),
    ...useAcceleratorProfilesNav(),
    ...useCustomRuntimesNav(),
    ...useStorageClassesNav(),
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

const useFeaturesNav = (): NavDataHref[] => [
  {
    id: 'features',
    label: 'Features',
    href: '/features',
  },
];

const useLearnNav = (): NavDataHref[] => [
  {
    id: 'learn',
    label: 'Learn',
    href: '/resources',
  },
];

const useUniversalNav = (): NavDataSection[] => [
  {
    id: 'universal',
    section: {
      id: 'universal',
      title: 'Universal',
    },
    children: [
      ...useConnectionTypesNav(),
      ...useFeaturesNav(),
      ...useLearnNav(),
      ...useSettingsNav(),
    ],
  },
];

export const useBuildNavData = (): NavDataItem[] => [
  ...useHomeNav(),
  ...useDSProjectsNav(),
  ...useModelsNav(),
  ...useProjectScopedNav(),
  ...useUniversalNav(),
];
