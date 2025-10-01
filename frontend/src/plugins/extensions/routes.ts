import type { RouteExtension } from '@odh-dashboard/plugin-core/extension-points';
// Allow this import as it consists of types and enums only.
// eslint-disable-next-line no-restricted-syntax
import { SupportedArea } from '#~/concepts/areas/types';

const createRedirectComponent = (args: { from: string; to: string }) => () =>
  import('#~/utilities/v2Redirect').then((module) => ({
    default: () => module.buildV2RedirectElement(args),
  }));

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
      component: () => import('#~/pages/enabledApplications/EnabledApplications'),
    },
  },
  {
    type: 'app.route',
    flags: {
      required: [SupportedArea.HOME],
    },
    properties: {
      path: '/enabled',
      component: createRedirectComponent({ from: '/enabled', to: '/applications/enabled' }),
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
      component: () => import('#~/pages/exploreApplication/ExploreApplications'),
    },
  },
  {
    type: 'app.route',
    properties: {
      path: '/explore',
      component: createRedirectComponent({ from: '/explore', to: '/applications/explore' }),
    },
  },
  {
    type: 'app.route',
    properties: {
      path: '/learning-resources',
      component: () => import('#~/pages/learningCenter/LearningCenter'),
    },
  },
  {
    type: 'app.route',
    properties: {
      path: '/resources',
      component: createRedirectComponent({ from: '/resources', to: '/learning-resources' }),
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
      component: () => import('#~/pages/notebookController/NotebookController'),
    },
  },
  {
    type: 'app.route',
    properties: {
      path: '/notebookController/*',
      component: createRedirectComponent({
        from: '/notebookController/*',
        to: '/notebook-controller/*',
      }),
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
      component: () => import('#~/pages/modelServing/ModelServingRoutes'),
    },
    flags: {
      disallowed: [SupportedArea.PLUGIN_MODEL_SERVING],
    },
  },
  {
    type: 'app.route',
    properties: {
      path: '/modelServing/*',
      component: createRedirectComponent({ from: '/modelServing/*', to: '/ai-hub/deployments/*' }),
    },
    flags: {
      disallowed: [SupportedArea.PLUGIN_MODEL_SERVING],
    },
  },
  // // This is being replaced by the upstream extension for model registry and will be removed along with the old MR UI code as part of https://issues.redhat.com/browse/RHOAIENG-34088.
  // {
  //   type: 'app.route',
  //   properties: {
  //     path: '/modelRegistry/*',
  //     component: () => import('#~/pages/modelRegistry/ModelRegistryRoutes'),
  //   },
  // },
  // This is being replaced by the upstream extension for model catalog and will be removed along with the old MR UI code as part of https://issues.redhat.com/browse/RHOAIENG-34088
  // {
  //   type: 'app.route',
  //   properties: {
  //     path: '/modelCatalog/*',
  //     component: () => import('#~/pages/modelCatalog/ModelCatalogRoutes'),
  //   },
  // },
  {
    type: 'app.route',
    properties: {
      path: '/develop-train/pipelines/definitions/*',
      component: () => import('#~/pages/pipelines/GlobalPipelinesRoutes'),
    },
  },
  {
    type: 'app.route',
    properties: {
      path: '/pipelines/*',
      component: createRedirectComponent({
        from: '/pipelines/*',
        to: '/develop-train/pipelines/definitions/*',
      }),
    },
  },
  {
    type: 'app.route',
    properties: {
      path: '/develop-train/pipelines/runs/*',
      component: () => import('#~/pages/pipelines/GlobalPipelineRunsRoutes'),
    },
  },
  {
    type: 'app.route',
    properties: {
      path: '/pipelineRuns/*',
      component: createRedirectComponent({
        from: '/pipelineRuns/*',
        to: '/develop-train/pipelines/runs/*',
      }),
    },
  },
  {
    type: 'app.route',
    properties: {
      path: '/develop-train/experiments/*',
      component: () => import('#~/pages/pipelines/GlobalPipelineExperimentsRoutes'),
    },
  },
  {
    type: 'app.route',
    properties: {
      path: '/experiments/*',
      component: createRedirectComponent({
        from: '/experiments/*',
        to: '/develop-train/experiments/*',
      }),
    },
  },
  {
    type: 'app.route',
    properties: {
      path: '/develop-train/pipelines/artifacts/*',
      component: () => import('#~/pages/pipelines/GlobalArtifactsRoutes'),
    },
  },
  {
    type: 'app.route',
    properties: {
      path: '/artifacts/*',
      component: createRedirectComponent({
        from: '/artifacts/*',
        to: '/develop-train/pipelines/artifacts/*',
      }),
    },
  },
  {
    type: 'app.route',
    properties: {
      path: '/develop-train/pipelines/executions/*',
      component: () => import('#~/pages/pipelines/GlobalPipelineExecutionsRoutes'),
    },
  },
  {
    type: 'app.route',
    properties: {
      path: '/executions/*',
      component: createRedirectComponent({
        from: '/executions/*',
        to: '/develop-train/pipelines/executions/*',
      }),
    },
  },
  {
    type: 'app.route',
    flags: {
      required: [SupportedArea.FINE_TUNING],
    },
    properties: {
      path: '/ai-hub/model-customization/*',
      component: () => import('#~/pages/pipelines/GlobalModelCustomizationRoutes'),
    },
  },
  {
    type: 'app.route',
    flags: {
      required: [SupportedArea.FINE_TUNING],
    },
    properties: {
      path: '/modelCustomization/*',
      component: createRedirectComponent({
        from: '/modelCustomization/*',
        to: '/ai-hub/model-customization/*',
      }),
    },
  },
  {
    type: 'app.route',
    properties: {
      path: '/observe-monitor/workload-metrics/*',
      component: () => import('#~/pages/distributedWorkloads/GlobalDistributedWorkloadsRoutes'),
    },
  },
  {
    type: 'app.route',
    properties: {
      path: '/distributedWorkloads/*',
      component: createRedirectComponent({
        from: '/distributedWorkloads/*',
        to: '/observe-monitor/workload-metrics/*',
      }),
    },
  },
  {
    type: 'app.route',
    flags: {
      required: [ADMIN_USER],
    },
    properties: {
      path: '/settings/environment-setup/workbench-images/*',
      component: () => import('#~/pages/BYONImages/BYONImageRoutes'),
    },
  },
  {
    type: 'app.route',
    flags: {
      required: [ADMIN_USER],
    },
    properties: {
      path: '/workbenchImages/*',
      component: createRedirectComponent({
        from: '/workbenchImages/*',
        to: '/settings/environment-setup/workbench-images/*',
      }),
    },
  },
  {
    type: 'app.route',
    flags: {
      required: [ADMIN_USER],
    },
    properties: {
      path: '/settings/cluster/general',
      component: () => import('#~/pages/clusterSettings/ClusterSettings'),
    },
  },
  {
    type: 'app.route',
    flags: {
      required: [ADMIN_USER],
    },
    properties: {
      path: '/clusterSettings',
      component: createRedirectComponent({
        from: '/clusterSettings',
        to: '/settings/cluster/general',
      }),
    },
  },
  {
    type: 'app.route',
    flags: {
      required: [ADMIN_USER],
    },
    properties: {
      path: '/settings/environment-setup/accelerator-profiles/*',
      component: () => import('#~/pages/acceleratorProfiles/AcceleratorProfilesRoutes'),
    },
  },
  {
    type: 'app.route',
    flags: {
      required: [ADMIN_USER],
    },
    properties: {
      path: '/acceleratorProfiles/*',
      component: createRedirectComponent({
        from: '/acceleratorProfiles/*',
        to: '/settings/environment-setup/accelerator-profiles/*',
      }),
    },
  },
  {
    type: 'app.route',
    flags: {
      required: [ADMIN_USER],
    },
    properties: {
      path: '/settings/model-resources-operations/serving-runtimes/*',
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
      path: '/servingRuntimes/*',
      component: createRedirectComponent({
        from: '/servingRuntimes/*',
        to: '/settings/model-resources-operations/serving-runtimes/*',
      }),
    },
  },
  {
    type: 'app.route',
    flags: {
      required: [ADMIN_USER],
    },
    properties: {
      path: '/settings/environment-setup/connection-types/*',
      component: () => import('#~/pages/connectionTypes/ConnectionTypeRoutes'),
    },
  },
  {
    type: 'app.route',
    flags: {
      required: [ADMIN_USER],
    },
    properties: {
      path: '/connectionTypes/*',
      component: createRedirectComponent({
        from: '/connectionTypes/*',
        to: '/settings/environment-setup/connection-types/*',
      }),
    },
  },
  {
    type: 'app.route',
    flags: {
      required: [ADMIN_USER],
    },
    properties: {
      path: '/settings/cluster/storage-classes/*',
      component: () => import('#~/pages/storageClasses/StorageClassesPage'),
    },
  },
  {
    type: 'app.route',
    flags: {
      required: [ADMIN_USER],
    },
    properties: {
      path: '/storageClasses/*',
      component: createRedirectComponent({
        from: '/storageClasses/*',
        to: '/settings/cluster/storage-classes/*',
      }),
    },
  },
  {
    type: 'app.route',
    flags: {
      required: [ADMIN_USER],
    },
    properties: {
      path: '/settings/model-resources-operations/model-registry/*',
      component: () => import('#~/pages/modelRegistrySettings/ModelRegistrySettingsRoutes'),
    },
  },
  {
    type: 'app.route',
    flags: {
      required: [ADMIN_USER],
    },
    properties: {
      path: '/modelRegistrySettings/*',
      component: createRedirectComponent({
        from: '/modelRegistrySettings/*',
        to: '/settings/model-resources-operations/model-registry/*',
      }),
    },
  },
  {
    type: 'app.route',
    flags: {
      required: [ADMIN_USER],
    },
    properties: {
      path: '/settings/user-management',
      component: () => import('#~/pages/groupSettings/GroupSettings'),
    },
  },
  {
    type: 'app.route',
    flags: {
      required: [ADMIN_USER],
    },
    properties: {
      path: '/groupSettings',
      component: createRedirectComponent({
        from: '/groupSettings',
        to: '/settings/user-management',
      }),
    },
  },
  {
    type: 'app.route',
    properties: {
      path: '/settings/environment-setup/hardware-profiles/*',
      component: () => import('#~/pages/hardwareProfiles/HardwareProfilesRoutes'),
    },
  },
  {
    type: 'app.route',
    properties: {
      path: '/hardwareProfiles/*',
      component: createRedirectComponent({
        from: '/hardwareProfiles/*',
        to: '/settings/environment-setup/hardware-profiles/*',
      }),
    },
  },
  {
    type: 'app.route',
    flags: {
      required: [SupportedArea.LM_EVAL],
    },
    properties: {
      path: '/develop-train/evaluations/*',
      component: () => import('#~/pages/lmEval/LMEvalRoutes'),
    },
  },
  {
    type: 'app.route',
    flags: {
      required: [SupportedArea.LM_EVAL],
    },
    properties: {
      path: '/modelEvaluations/*',
      component: createRedirectComponent({
        from: '/modelEvaluations/*',
        to: '/develop-train/evaluations/*',
      }),
    },
  },
];

export default extensions;
