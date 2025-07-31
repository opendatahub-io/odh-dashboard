import type { RouteExtension } from '@odh-dashboard/plugin-core/extension-points';
// Allow this import as it consists of types and enums only.
// eslint-disable-next-line no-restricted-syntax
import { SupportedArea } from '#~/concepts/areas/types';

const ADMIN_USER = 'ADMIN_USER';

const extensions: RouteExtension[] = [
  {
    type: 'app.route',
    flags: {
      required: [SupportedArea.HOME],
    },
    properties: {
      component: () => import('#~/pages/home/Home'),
      path: '/',
    },
  },
  {
    type: 'app.route',
    flags: {
      required: [SupportedArea.HOME],
    },
    properties: {
      component: () => import('#~/pages/enabledApplications/EnabledApplications'),
      path: '/enabled',
    },
  },
  {
    type: 'app.route',
    flags: {
      disallowed: [SupportedArea.HOME],
    },
    properties: {
      component: () => import('#~/pages/enabledApplications/EnabledApplications'),
      path: '/',
    },
  },
  {
    type: 'app.route',
    properties: {
      path: '/external/*',
      component: () => import('#~/pages/external/ExternalRoutes'),
    },
  },
  {
    type: 'app.route',
    properties: {
      path: '/explore',
      component: () => import('#~/pages/exploreApplication/ExploreApplications'),
    },
  },
  {
    type: 'app.route',
    properties: {
      path: '/resources',
      component: () => import('#~/pages/learningCenter/LearningCenter'),
    },
  },
  {
    type: 'app.route',
    properties: {
      path: '/projects/*',
      component: () => import('#~/pages/projects/ProjectViewRoutes'),
    },
  },
  {
    type: 'app.route',
    properties: {
      path: '/notebookController/*',
      component: () => import('#~/pages/notebookController/NotebookController'),
    },
  },
  {
    type: 'app.route',
    properties: {
      path: '/notebook/:namespace/:notebookName/logout',
      component: () => import('#~/pages/notebookController/NotebookLogoutRedirect'),
    },
  },
  // {
  //   type: 'app.route',
  //   properties: {
  //     path: '/modelServing/*',
  //     component: () => import('#~/pages/modelServing/ModelServingRoutes'),
  //   },
  //   flags: {
  //     disallowed: [SupportedArea.PLUGIN_MODEL_SERVING],
  //   },
  // },
  {
    type: 'app.route',
    properties: {
      path: '/modelCatalog/*',
      component: () => import('#~/pages/modelCatalog/ModelCatalogRoutes'),
    },
  },
  {
    type: 'app.route',
    properties: {
      path: '/modelRegistry/*',
      component: () => import('#~/pages/modelRegistry/ModelRegistryRoutes'),
    },
  },
  {
    type: 'app.route',
    properties: {
      path: '/pipelines/*',
      component: () => import('#~/pages/pipelines/GlobalPipelinesRoutes'),
    },
  },
  {
    type: 'app.route',
    properties: {
      path: '/pipelineRuns/*',
      component: () => import('#~/pages/pipelines/GlobalPipelineRunsRoutes'),
    },
  },
  {
    type: 'app.route',
    properties: {
      path: '/experiments/*',
      component: () => import('#~/pages/pipelines/GlobalPipelineExperimentsRoutes'),
    },
  },
  {
    type: 'app.route',
    properties: {
      path: '/artifacts/*',
      component: () => import('#~/pages/pipelines/GlobalArtifactsRoutes'),
    },
  },
  {
    type: 'app.route',
    properties: {
      path: '/executions/*',
      component: () => import('#~/pages/pipelines/GlobalPipelineExecutionsRoutes'),
    },
  },
  {
    type: 'app.route',
    flags: {
      required: [SupportedArea.FINE_TUNING],
    },
    properties: {
      path: '/modelCustomization/*',
      component: () => import('#~/pages/pipelines/GlobalModelCustomizationRoutes'),
    },
  },
  {
    type: 'app.route',
    properties: {
      path: '/distributedWorkloads/*',
      component: () => import('#~/pages/distributedWorkloads/GlobalDistributedWorkloadsRoutes'),
    },
  },
  {
    type: 'app.route',
    flags: {
      required: [ADMIN_USER],
    },
    properties: {
      path: '/workbenchImages/*',
      component: () => import('#~/pages/BYONImages/BYONImageRoutes'),
    },
  },
  {
    type: 'app.route',
    flags: {
      required: [ADMIN_USER],
    },
    properties: {
      path: '/clusterSettings',
      component: () => import('#~/pages/clusterSettings/ClusterSettings'),
    },
  },
  {
    type: 'app.route',
    flags: {
      required: [ADMIN_USER],
    },
    properties: {
      path: '/acceleratorProfiles/*',
      component: () => import('#~/pages/acceleratorProfiles/AcceleratorProfilesRoutes'),
    },
  },
  {
    type: 'app.route',
    flags: {
      required: [ADMIN_USER],
    },
    properties: {
      path: '/servingRuntimes/*',
      component: () =>
        import('#~/pages/modelServing/customServingRuntimes/CustomServingRuntimeRoutes'),
    },
  },
  {
    type: 'app.route',
    flags: {
      required: [ADMIN_USER],
    },
    properties: {
      path: '/connectionTypes/*',
      component: () => import('#~/pages/connectionTypes/ConnectionTypeRoutes'),
    },
  },
  {
    type: 'app.route',
    flags: {
      required: [ADMIN_USER],
    },
    properties: {
      path: '/storageClasses/*',
      component: () => import('#~/pages/storageClasses/StorageClassesPage'),
    },
  },
  {
    type: 'app.route',
    flags: {
      required: [ADMIN_USER],
    },
    properties: {
      path: '/modelRegistrySettings/*',
      component: () => import('#~/pages/modelRegistrySettings/ModelRegistrySettingsRoutes'),
    },
  },
  {
    type: 'app.route',
    flags: {
      required: [ADMIN_USER],
    },
    properties: {
      path: '/groupSettings',
      component: () => import('#~/pages/groupSettings/GroupSettings'),
    },
  },
  {
    type: 'app.route',
    properties: {
      path: '/hardwareProfiles/*',
      component: () => import('#~/pages/hardwareProfiles/HardwareProfilesRoutes'),
    },
  },
  {
    type: 'app.route',
    flags: {
      required: [SupportedArea.LM_EVAL],
    },
    properties: {
      path: '/modelEvaluations/*',
      component: () => import('#~/pages/lmEval/LMEvalRoutes'),
    },
  },
  {
    type: 'app.route',
    flags: {
      required: [SupportedArea.FEATURE_STORE],
    },
    properties: {
      path: '/featureStorex/*',
      component: () => import('#~/pages/featureStore/FeatureStoreRoutes'),
    },
  },
];

export default extensions;
