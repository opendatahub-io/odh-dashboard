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
      path: '/applications/enabled',
      v2PathRedirect: '/enabled',
      component: () => import('#~/pages/enabledApplications/EnabledApplications'),
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
      path: '/applications/explore',
      v2PathRedirect: '/explore',
      component: () => import('#~/pages/exploreApplication/ExploreApplications'),
    },
  },
  {
    type: 'app.route',
    properties: {
      path: '/learning-resources',
      v2PathRedirect: '/resources',
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
      path: '/notebook-controller/*',
      v2PathRedirect: '/notebookController/*',
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
  {
    type: 'app.route',
    properties: {
      path: '/ai-hub/deployments/*',
      v2PathRedirect: '/modelServing/*',
      component: () => import('#~/pages/modelServing/ModelServingRoutes'),
    },
    flags: {
      disallowed: [SupportedArea.PLUGIN_MODEL_SERVING],
    },
  },
  // // This is being replaced by the upstream extension for model registry and will be removed along with the old MR UI code as part of https://issues.redhat.com/browse/RHOAIENG-34088.
  // {
  //   type: 'app.route',
  //   properties: {
  //     path: '/ai-hub/registry/*',
  //     v2PathRedirect: '/modelRegistry/*',
  //     component: () => import('#~/pages/modelRegistry/ModelRegistryRoutes'),
  //   },
  // },
  // This is being replaced by the upstream extension for model catalog and will be removed along with the old MR UI code as part of https://issues.redhat.com/browse/RHOAIENG-34088
  // {
  //   type: 'app.route',
  //   properties: {
  //     path: '/ai-hub/catalog/*',
  //     v2PathRedirect: '/modelCatalog/*',
  //     component: () => import('#~/pages/modelCatalog/ModelCatalogRoutes'),
  //   },
  // },
  {
    type: 'app.route',
    properties: {
      path: '/develop-train/pipelines/definitions/*',
      v2PathRedirect: '/pipelines/*',
      component: () => import('#~/pages/pipelines/GlobalPipelinesRoutes'),
    },
  },
  {
    type: 'app.route',
    properties: {
      path: '/develop-train/pipelines/runs/*',
      v2PathRedirect: '/pipelineRuns/*',
      component: () => import('#~/pages/pipelines/GlobalPipelineRunsRoutes'),
    },
  },
  {
    type: 'app.route',
    properties: {
      path: '/develop-train/experiments/*',
      v2PathRedirect: '/experiments/*',
      component: () => import('#~/pages/pipelines/GlobalPipelineExperimentsRoutes'),
    },
  },
  {
    type: 'app.route',
    properties: {
      path: '/develop-train/pipelines/artifacts/*',
      v2PathRedirect: '/artifacts/*',
      component: () => import('#~/pages/pipelines/GlobalArtifactsRoutes'),
    },
  },
  {
    type: 'app.route',
    properties: {
      path: '/develop-train/pipelines/executions/*',
      v2PathRedirect: '/executions/*',
      component: () => import('#~/pages/pipelines/GlobalPipelineExecutionsRoutes'),
    },
  },
  {
    type: 'app.route',
    flags: {
      required: [SupportedArea.FINE_TUNING],
    },
    properties: {
      path: '/ai-hub/model-customization/*',
      v2PathRedirect: '/modelCustomization/*',
      component: () => import('#~/pages/pipelines/GlobalModelCustomizationRoutes'),
    },
  },
  {
    type: 'app.route',
    properties: {
      path: '/observe-monitor/workload-metrics/*',
      v2PathRedirect: '/distributedWorkloads/*',
      component: () => import('#~/pages/distributedWorkloads/GlobalDistributedWorkloadsRoutes'),
    },
  },
  {
    type: 'app.route',
    flags: {
      required: [ADMIN_USER],
    },
    properties: {
      path: '/settings/environment-setup/workbench-images/*',
      v2PathRedirect: '/workbenchImages/*',
      component: () => import('#~/pages/BYONImages/BYONImageRoutes'),
    },
  },
  {
    type: 'app.route',
    flags: {
      required: [ADMIN_USER],
    },
    properties: {
      path: '/settings/cluster/general',
      v2PathRedirect: '/clusterSettings',
      component: () => import('#~/pages/clusterSettings/ClusterSettings'),
    },
  },
  {
    type: 'app.route',
    flags: {
      required: [ADMIN_USER],
    },
    properties: {
      path: '/settings/environment-setup/accelerator-profiles/*',
      v2PathRedirect: '/acceleratorProfiles/*',
      component: () => import('#~/pages/acceleratorProfiles/AcceleratorProfilesRoutes'),
    },
  },
  {
    type: 'app.route',
    flags: {
      required: [ADMIN_USER],
    },
    properties: {
      path: '/settings/model-resources-operations/serving-runtimes/*',
      v2PathRedirect: '/servingRuntimes/*',
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
      path: '/settings/environment-setup/connection-types/*',
      v2PathRedirect: '/connectionTypes/*',
      component: () => import('#~/pages/connectionTypes/ConnectionTypeRoutes'),
    },
  },
  {
    type: 'app.route',
    flags: {
      required: [ADMIN_USER],
    },
    properties: {
      path: '/settings/cluster/storage-classes/*',
      v2PathRedirect: '/storageClasses/*',
      component: () => import('#~/pages/storageClasses/StorageClassesPage'),
    },
  },
  {
    type: 'app.route',
    flags: {
      required: [ADMIN_USER],
    },
    properties: {
      path: '/settings/model-resources-operations/model-registry/*',
      v2PathRedirect: '/modelRegistrySettings/*',
      component: () => import('#~/pages/modelRegistrySettings/ModelRegistrySettingsRoutes'),
    },
  },
  {
    type: 'app.route',
    flags: {
      required: [ADMIN_USER],
    },
    properties: {
      path: '/settings/user-management',
      v2PathRedirect: '/groupSettings',
      component: () => import('#~/pages/groupSettings/GroupSettings'),
    },
  },
  {
    type: 'app.route',
    properties: {
      path: '/settings/environment-setup/hardware-profiles/*',
      v2PathRedirect: '/hardwareProfiles/*',
      component: () => import('#~/pages/hardwareProfiles/HardwareProfilesRoutes'),
    },
  },
  {
    type: 'app.route',
    flags: {
      required: [SupportedArea.LM_EVAL],
    },
    properties: {
      path: '/develop-train/evaluations/*',
      v2PathRedirect: '/modelEvaluations/*',
      component: () => import('#~/pages/lmEval/LMEvalRoutes'),
    },
  },
];

export default extensions;
