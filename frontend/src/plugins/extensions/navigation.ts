import type { NavExtension } from '@odh-dashboard/plugin-core/extension-points';
// Allow this import as it consists of types and enums only.
// eslint-disable-next-line no-restricted-syntax
import { SupportedArea } from '#~/concepts/areas/types';

const ADMIN_USER = 'ADMIN_USER';

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
      path: '/projects/*',
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
      path: '/modelCatalog/*',
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
      path: '/modelRegistry/*',
    },
  },
  {
    type: 'app.navigation/href',
    flags: {
      required: [SupportedArea.MODEL_SERVING],
      disallowed: [SupportedArea.PLUGIN_MODEL_SERVING],
    },
    properties: {
      id: 'modelServing',
      title: 'Model deployments',
      href: '/modelServing',
      section: 'models',
      path: '/modelServing/*',
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
      path: '/modelCustomization/*',
    },
  },
  {
    type: 'app.navigation/href',
    flags: {
      required: [SupportedArea.LM_EVAL],
    },
    properties: {
      id: 'lm-eval',
      title: 'Model evaluation runs',
      href: '/modelEvaluations',
      section: 'models',
      path: '/modelEvaluations/*',
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
      path: '/pipelines/*',
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
      path: '/pipelineRuns/*',
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
      path: '/experiments/*',
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
      path: '/executions/*',
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
      path: '/artifacts/*',
    },
  },
  {
    type: 'app.navigation/section',
    flags: {
      required: [SupportedArea.FEATURE_STORE],
    },
    properties: {
      id: 'feature-store',
      title: 'Feature store',
    },
  },
  {
    type: 'app.navigation/href',
    flags: {
      required: [SupportedArea.FEATURE_STORE],
    },
    properties: {
      id: 'overview',
      title: 'Overview',
      href: '/featureStore/overview',
      section: 'feature-store',
      path: '/featureStore/overview/*',
    },
  },
  {
    type: 'app.navigation/href',
    flags: {
      required: [SupportedArea.FEATURE_STORE],
    },
    properties: {
      id: 'entities',
      title: 'Entities',
      href: '/featureStore/entities',
      section: 'feature-store',
      path: '/featureStore/entities/*',
    },
  },
  {
    type: 'app.navigation/href',
    flags: {
      required: [SupportedArea.FEATURE_STORE],
    },
    properties: {
      id: 'data-sources',
      title: 'Data sources',
      href: '/featureStore/data-sources',
      section: 'feature-store',
      path: '/featureStore/data-sources/*',
    },
  },
  {
    type: 'app.navigation/href',
    flags: {
      required: [SupportedArea.FEATURE_STORE],
    },
    properties: {
      id: 'data-sets',
      title: 'Data sets',
      href: '/featureStore/data-sets',
      section: 'feature-store',
      path: '/featureStore/data-sets/*',
    },
  },
  {
    type: 'app.navigation/href',
    flags: {
      required: [SupportedArea.FEATURE_STORE],
    },
    properties: {
      id: 'features',
      title: 'Features',
      href: '/featureStore/features',
      section: 'feature-store',
      path: '/featureStore/features/*',
    },
  },
  {
    type: 'app.navigation/href',
    flags: {
      required: [SupportedArea.FEATURE_STORE],
    },
    properties: {
      id: 'feature-views',
      title: 'Feature views',
      href: '/featureStore/feature-views',
      section: 'feature-store',
      path: '/featureStore/feature-views/*',
    },
  },
  {
    type: 'app.navigation/href',
    flags: {
      required: [SupportedArea.FEATURE_STORE],
    },
    properties: {
      id: 'feature-services',
      title: 'Feature services',
      href: '/featureStore/feature-services',
      section: 'feature-store',
      path: '/featureStore/feature-services/*',
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
      path: '/distributedWorkloads/*',
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
      group: '9_settings',
    },
  },
  {
    type: 'app.navigation/href',
    flags: {
      required: [SupportedArea.BYON, ADMIN_USER],
    },
    properties: {
      id: 'settings-notebook-images',
      title: 'Workbench images',
      href: '/workbenchImages',
      section: 'settings',
      path: '/workbenchImages/*',
    },
  },
  {
    type: 'app.navigation/href',
    flags: {
      required: [SupportedArea.CLUSTER_SETTINGS, ADMIN_USER],
    },
    properties: {
      id: 'settings-cluster-settings',
      title: 'Cluster settings',
      href: '/clusterSettings',
      section: 'settings',
    },
  },

  {
    type: 'app.navigation/href',
    flags: {
      required: [SupportedArea.ACCELERATOR_PROFILES, ADMIN_USER],
      disallowed: [SupportedArea.HARDWARE_PROFILES],
    },
    properties: {
      id: 'settings-accelerator-profiles',
      title: 'Accelerator profiles',
      href: '/acceleratorProfiles',
      section: 'settings',
      path: '/acceleratorProfiles/*',
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
      path: '/hardwareProfiles/*',
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
      required: [SupportedArea.CUSTOM_RUNTIMES, ADMIN_USER],
    },
    properties: {
      id: 'settings-custom-serving-runtimes',
      title: 'Serving runtimes',
      href: '/servingRuntimes',
      section: 'settings',
      path: '/servingRuntimes/*',
    },
  },

  {
    type: 'app.navigation/href',
    flags: {
      required: [SupportedArea.ADMIN_CONNECTION_TYPES, ADMIN_USER],
    },
    properties: {
      id: 'settings-connection-types',
      title: 'Connection types',
      href: '/connectionTypes',
      section: 'settings',
      path: '/connectionTypes/*',
    },
  },

  {
    type: 'app.navigation/href',
    flags: {
      required: [SupportedArea.STORAGE_CLASSES, ADMIN_USER],
    },
    properties: {
      id: 'settings-storage-classes',
      title: 'Storage classes',
      href: '/storageClasses',
      section: 'settings',
      path: '/storageClasses/*',
    },
  },

  {
    type: 'app.navigation/href',
    flags: {
      required: [SupportedArea.MODEL_REGISTRY, ADMIN_USER],
    },
    properties: {
      id: 'settings-model-registry',
      title: 'Model registry settings',
      href: '/modelRegistrySettings',
      section: 'settings',
      path: '/modelRegistrySettings/*',
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
