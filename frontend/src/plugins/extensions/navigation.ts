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
      iconRef: () => import('@patternfly/react-icons/dist/esm/icons/home-icon'),
    },
  },

  {
    type: 'app.navigation/href',
    flags: {
      required: [SupportedArea.DS_PROJECTS_VIEW],
    },
    properties: {
      id: 'projects',
      title: 'Projects',
      href: '/projects',
      path: '/projects/*',
      group: '2_projects',
      iconRef: () => import('@patternfly/react-icons/dist/esm/icons/folder-icon'),
    },
  },

  {
    type: 'app.navigation/section',
    properties: {
      id: 'ai-hub',
      title: 'AI hub',
      group: '3_ai_hub',
      iconRef: () => import('#~/images/icons/AiHubIcon'),
    },
  },
  // This is being replaced by the upstream extension for model registry and will be removed along with the old MR UI code as part of https://issues.redhat.com/browse/RHOAIENG-34088
  // {
  //   type: 'app.navigation/href',
  //   flags: {
  //     required: [SupportedArea.MODEL_REGISTRY],
  //   },
  //   properties: {
  //     id: 'modelRegistry',
  //     title: 'Registry',
  //     href: '/modelRegistry',
  //     section: 'ai-hub',
  //     path: '/modelRegistry/*',
  //   },
  // },
  // This is being replaced by the upstream extension for model catalog and will be removed along with the old MR UI code as part of https://issues.redhat.com/browse/RHOAIENG-34088
  // {
  //   type: 'app.navigation/href',
  //   flags: {
  //     required: [SupportedArea.MODEL_CATALOG],
  //   },
  //   properties: {
  // id: 'modelCatalog',
  // title: 'Catalog',
  // href: '/modelCatalog',
  // section: 'ai-hub',
  // path: '/modelCatalog/*',
  //   },
  // },
  {
    type: 'app.navigation/section',
    properties: {
      id: 'develop-and-train',
      title: 'Develop & train',
      group: '5_develop_and_train',
      iconRef: () => import('@patternfly/react-icons/dist/esm/icons/code-icon'),
    },
  },
  {
    type: 'app.navigation/section',
    properties: {
      id: 'pipelines',
      title: 'Pipelines',
      group: '2_pipelines',
      section: 'develop-and-train',
    },
  },
  {
    type: 'app.navigation/href',
    flags: {
      required: [SupportedArea.DS_PIPELINES],
    },
    properties: {
      id: 'pipeline-definitions',
      title: 'Pipeline definitions',
      href: '/pipelines',
      section: 'pipelines',
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
      section: 'pipelines',
      path: '/pipelineRuns/*',
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
      section: 'pipelines',
      path: '/artifacts/*',
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
      section: 'pipelines',
      path: '/executions/*',
    },
  },
  {
    type: 'app.navigation/href',
    flags: {
      required: [SupportedArea.LM_EVAL],
    },
    properties: {
      id: 'lm-eval',
      title: 'Evaluations',
      href: '/modelEvaluations',
      section: 'develop-and-train',
      path: '/modelEvaluations/*',
    },
  },
  {
    type: 'app.navigation/href',
    flags: {
      required: [SupportedArea.DS_PIPELINES],
    },
    properties: {
      id: 'experiments',
      title: 'Experiments',
      href: '/experiments',
      section: 'develop-and-train',
      path: '/experiments/*',
    },
  },

  {
    type: 'app.navigation/section',
    properties: {
      id: 'observe-and-monitor',
      title: 'Observe & monitor',
      group: '6_observe_and_monitor',
      iconRef: () => import('#~/images/icons/ObserveAndMonitorIcon'),
    },
  },
  {
    type: 'app.navigation/href',
    flags: {
      required: [SupportedArea.DISTRIBUTED_WORKLOADS],
    },
    properties: {
      id: 'workloadMetrics',
      title: 'Workload metrics',
      href: '/distributedWorkloads',
      path: '/distributedWorkloads/*',
      section: 'observe-and-monitor',
    },
  },

  {
    type: 'app.navigation/href',
    properties: {
      id: 'learning-resources',
      title: 'Learning resources',
      href: '/resources',
      group: '7_other',
      iconRef: () => import('#~/images/icons/LearningResourcesIcon'),
    },
  },

  {
    type: 'app.navigation/section',
    properties: {
      id: 'applications',
      title: 'Applications',
      group: '8_other',
      iconRef: () => import('#~/images/icons/ApplicationsIcon'),
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
    type: 'app.navigation/section',
    properties: {
      id: 'settings',
      title: 'Settings',
      group: '8_settings',
      iconRef: () => import('@patternfly/react-icons/dist/esm/icons/cog-icon'),
    },
  },
  {
    type: 'app.navigation/section',
    properties: {
      id: 'cluster-settings',
      title: 'Cluster settings',
      group: '1_cluster_settings',
      section: 'settings',
    },
  },
  {
    type: 'app.navigation/href',
    flags: {
      required: [SupportedArea.CLUSTER_SETTINGS, ADMIN_USER],
    },
    properties: {
      id: 'settings-general-cluster-settings',
      title: 'General settings',
      href: '/clusterSettings',
      section: 'cluster-settings',
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
      section: 'cluster-settings',
      path: '/storageClasses/*',
    },
  },
  {
    type: 'app.navigation/section',
    properties: {
      id: 'settings-environment-setup',
      title: 'Environment setup',
      group: '2_environment_setup',
      section: 'settings',
    },
  },
  {
    type: 'app.navigation/href',
    flags: {
      required: [SupportedArea.BYON, ADMIN_USER],
    },
    properties: {
      id: 'settings-workbench-images',
      title: 'Workbench images',
      href: '/workbenchImages',
      section: 'settings-environment-setup',
      path: '/workbenchImages/*',
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
      section: 'settings-environment-setup',
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
      section: 'settings-environment-setup',
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
      required: [SupportedArea.ADMIN_CONNECTION_TYPES, ADMIN_USER],
    },
    properties: {
      id: 'settings-connection-types',
      title: 'Connection types',
      href: '/connectionTypes',
      section: 'settings-environment-setup',
      path: '/connectionTypes/*',
    },
  },
  {
    type: 'app.navigation/section',
    properties: {
      id: 'settings-model-resources-and-operations',
      title: 'Model resources and operations',
      group: '3_model_resources_and_operations',
      section: 'settings',
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
      section: 'settings-model-resources-and-operations',
      path: '/servingRuntimes/*',
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
      section: 'settings-model-resources-and-operations',
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
