import type { NavExtension } from '@odh-dashboard/plugin-core/extension-points';
// Allow this import as it consists of types and enums only.
// eslint-disable-next-line no-restricted-syntax
import { SupportedArea } from '~/concepts/areas/types';

const extensions: NavExtension[] = [
  {
    type: 'app.navigation/href',
    flags: {
      required: [SupportedArea.HOME],
    },
    properties: {
      id: 'home',
      title: 'Home',
      href: '/',
      group: '1_home',
    },
  },

  {
    type: 'app.navigation/href',
    flags: {
      required: [SupportedArea.DS_PROJECTS_VIEW],
    },
    properties: {
      id: 'dsg',
      title: 'Data science projects',
      href: '/projects',
      pathMatch: '/projects/*',
      group: '2_projects',
    },
  },

  {
    type: 'app.navigation/section',
    properties: {
      id: 'models',
      title: 'Models',
    },
  },
  {
    type: 'app.navigation/href',
    flags: {
      required: [SupportedArea.MODEL_CATALOG],
    },
    properties: {
      id: 'modelCatalog',
      title: 'Model catalog',
      href: '/modelCatalog',
      section: 'models',
      pathMatch: '/modelCatalog/*',
    },
  },
  {
    type: 'app.navigation/href',
    flags: {
      required: [SupportedArea.MODEL_REGISTRY],
    },
    properties: {
      id: 'modelRegistry',
      title: 'Model registry',
      href: '/modelRegistry',
      section: 'models',
      pathMatch: '/modelRegistry/*',
    },
  },
  {
    type: 'app.navigation/href',
    flags: {
      required: [SupportedArea.MODEL_SERVING],
    },
    properties: {
      id: 'modelServing',
      title: 'Model deployments',
      href: '/modelServing',
      section: 'models',
      pathMatch: '/modelServing/*',
    },
  },
  {
    type: 'app.navigation/href',
    flags: {
      required: [SupportedArea.FINE_TUNING],
    },
    properties: {
      id: 'modelCustomization',
      title: 'Model customization',
      href: '/modelCustomization',
      section: 'models',
      pathMatch: '/modelCustomization/*',
    },
  },

  {
    type: 'app.navigation/section',
    properties: {
      id: 'pipelines-and-runs',
      title: 'Data science pipelines',
    },
  },
  {
    type: 'app.navigation/href',
    flags: {
      required: [SupportedArea.DS_PIPELINES],
    },
    properties: {
      id: 'pipelines',
      title: 'Pipelines',
      href: '/pipelines',
      section: 'pipelines-and-runs',
      pathMatch: '/pipelines/*',
    },
  },
  {
    type: 'app.navigation/href',
    flags: {
      required: [SupportedArea.DS_PIPELINES],
    },
    properties: {
      id: 'runs',
      title: 'Runs',
      href: '/pipelineRuns',
      section: 'pipelines-and-runs',
      pathMatch: '/pipelineRuns/*',
    },
  },
  {
    type: 'app.navigation/section',
    flags: {
      required: [SupportedArea.DS_PIPELINES],
    },
    properties: {
      id: 'experiments',
      title: 'Experiments',
    },
  },
  {
    type: 'app.navigation/href',
    flags: {
      required: [SupportedArea.DS_PIPELINES],
    },
    properties: {
      id: 'experiments-and-runs',
      title: 'Experiments and runs',
      href: '/experiments',
      section: 'experiments',
      pathMatch: '/experiments/*',
    },
  },
  {
    type: 'app.navigation/href',
    flags: {
      required: [SupportedArea.DS_PIPELINES],
    },
    properties: {
      id: 'executions',
      title: 'Executions',
      href: '/executions',
      section: 'experiments',
      pathMatch: '/executions/*',
    },
  },
  {
    type: 'app.navigation/href',
    flags: {
      required: [SupportedArea.DS_PIPELINES],
    },
    properties: {
      id: 'artifacts',
      title: 'Artifacts',
      href: '/artifacts',
      section: 'experiments',
      pathMatch: '/artifacts/*',
    },
  },

  {
    type: 'app.navigation/href',
    flags: {
      required: [SupportedArea.DISTRIBUTED_WORKLOADS],
    },
    properties: {
      id: 'workloadMetrics',
      title: 'Distributed workloads',
      href: '/distributedWorkloads',
      pathMatch: '/distributedWorkloads/*',
    },
  },

  {
    type: 'app.navigation/section',
    properties: {
      id: 'applications',
      title: 'Applications',
      group: '7_other',
    },
  },
  {
    type: 'app.navigation/href',
    flags: {
      required: [SupportedArea.HOME],
    },
    properties: {
      id: 'apps-installed',
      title: 'Enabled',
      href: '/enabled',
      section: 'applications',
    },
  },
  {
    type: 'app.navigation/href',
    flags: {
      disallowed: [SupportedArea.HOME],
    },
    properties: {
      id: 'apps-installed',
      title: 'Enabled',
      href: '/',
      section: 'applications',
    },
  },
  {
    type: 'app.navigation/href',
    properties: {
      id: 'apps-explore',
      title: 'Explore',
      href: '/explore',
      section: 'applications',
    },
  },

  {
    type: 'app.navigation/href',
    properties: {
      id: 'resources',
      title: 'Resources',
      href: '/resources',
      group: '7_other',
    },
  },

  {
    type: 'app.navigation/section',
    properties: {
      id: 'settings',
      title: 'Settings',
    },
  },
  {
    type: 'app.navigation/href',
    flags: {
      required: [SupportedArea.BYON, 'ADMIN_USER'],
    },
    properties: {
      id: 'settings-notebook-images',
      title: 'Workbench images',
      href: '/workbenchImages',
      section: 'settings',
      pathMatch: '/workbenchImages/*',
    },
  },
  {
    type: 'app.navigation/href',
    flags: {
      required: [SupportedArea.CLUSTER_SETTINGS, 'ADMIN_USER'],
    },
    properties: {
      id: 'settings-cluster-settings',
      title: 'Cluster settings',
      href: '/clusterSettings',
      section: 'settings',
      group: '9_settings',
    },
  },

  {
    type: 'app.navigation/href',
    flags: {
      required: [SupportedArea.ACCELERATOR_PROFILES, 'ADMIN_USER'],
      disallowed: [SupportedArea.HARDWARE_PROFILES],
    },
    properties: {
      id: 'settings-accelerator-profiles',
      title: 'Accelerator profiles',
      href: '/acceleratorProfiles',
      section: 'settings',
      pathMatch: '/acceleratorProfiles/*',
    },
  },
  {
    type: 'app.navigation/href',
    flags: {
      required: [SupportedArea.HARDWARE_PROFILES],
    },
    properties: {
      id: 'settings-hardware-profiles',
      title: 'Hardware profiles',
      href: '/hardwareProfiles',
      section: 'settings',
      pathMatch: '/hardwareProfiles/*',
      statusProviderId: 'hardware-profiles.status',
      accessReview: {
        group: 'dashboard.opendatahub.io',
        resource: 'hardwareprofiles',
        verb: 'create',
      },
    },
  },

  {
    type: 'app.navigation/href',
    flags: {
      required: [SupportedArea.CUSTOM_RUNTIMES, 'ADMIN_USER'],
    },
    properties: {
      id: 'settings-custom-serving-runtimes',
      title: 'Serving runtimes',
      href: '/servingRuntimes',
      section: 'settings',
      pathMatch: '/servingRuntimes/*',
    },
  },

  {
    type: 'app.navigation/href',
    flags: {
      // required: ['connection-types' /* SupportedArea.ADMIN_CONNECTION_TYPES */, 'ADMIN_USER'],
      required: [SupportedArea.ADMIN_CONNECTION_TYPES, 'ADMIN_USER'],
    },
    properties: {
      id: 'settings-connection-types',
      title: 'Connection types',
      href: '/connectionTypes',
      section: 'settings',
      pathMatch: '/connectionTypes/*',
    },
  },

  {
    type: 'app.navigation/href',
    flags: {
      required: [SupportedArea.STORAGE_CLASSES, 'ADMIN_USER'],
    },
    properties: {
      id: 'settings-storage-classes',
      title: 'Storage classes',
      href: '/storageClasses',
      section: 'settings',
      pathMatch: '/storageClasses/*',
    },
  },

  {
    type: 'app.navigation/href',
    flags: {
      required: [SupportedArea.MODEL_REGISTRY, 'ADMIN_USER'],
    },
    properties: {
      id: 'settings-model-registry',
      title: 'Model registry settings',
      href: '/modelRegistrySettings',
      section: 'settings',
      pathMatch: '/modelRegistrySettings/*',
    },
  },

  {
    type: 'app.navigation/href',
    flags: {
      required: [SupportedArea.USER_MANAGEMENT],
    },
    properties: {
      id: 'settings-group-settings',
      title: 'User management',
      href: '/groupSettings',
      section: 'settings',
      accessReview: {
        group: 'services.platform.opendatahub.io',
        resource: 'auths',
        verb: 'update',
      },
    },
  },
];

export default extensions;
