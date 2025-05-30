import { DashboardConfigKind, KnownLabels } from '#~/k8sTypes';
import { ModelServingSize } from '#~/pages/modelServing/screens/types';
import { NotebookSize } from '#~/types';

export type MockDashboardConfigType = {
  disableInfo?: boolean;
  disableSupport?: boolean;
  disableClusterManager?: boolean;
  disableTracking?: boolean;
  disableBYONImageStream?: boolean;
  disableISVBadges?: boolean;
  disableAppLauncher?: boolean;
  disableUserManagement?: boolean;
  disableHome?: boolean;
  disableProjects?: boolean;
  disableProjectScoped?: boolean;
  disablePipelines?: boolean;
  disableModelServing?: boolean;
  disableCustomServingRuntimes?: boolean;
  disableKServe?: boolean;
  disableKServeAuth?: boolean;
  disableKServeMetrics?: boolean;
  disableKServeRaw?: boolean;
  disableModelMesh?: boolean;
  disableAcceleratorProfiles?: boolean;
  disableHardwareProfiles?: boolean;
  disablePerformanceMetrics?: boolean;
  disableTrustyBiasMetrics?: boolean;
  disableDistributedWorkloads?: boolean;
  disableModelCatalog?: boolean;
  disableModelRegistry?: boolean;
  disableModelRegistrySecureDB?: boolean;
  disableServingRuntimeParams?: boolean;
  disableConnectionTypes?: boolean;
  disableAdminConnectionTypes?: boolean;
  disableStorageClasses?: boolean;
  disableNotebookController?: boolean;
  notebookSizes?: NotebookSize[];
  disableNIMModelServing?: boolean;
  disableFineTuning?: boolean;
  disableLlamaStackChatBot?: boolean;
  modelServerSizes?: ModelServingSize[];
  disableLMEval?: boolean;
};

export const mockDashboardConfig = ({
  disableInfo = false,
  disableSupport = false,
  disableClusterManager = false,
  disableTracking = false,
  disableBYONImageStream = false,
  disableISVBadges = false,
  disableAppLauncher = false,
  disableUserManagement = false,
  disableHome = false,
  disableProjects = false,
  disableProjectScoped = false,
  disableModelServing = false,
  disableCustomServingRuntimes = false,
  disablePipelines = false,
  disableKServe = false,
  disableKServeAuth = false,
  disableKServeMetrics = true,
  disableKServeRaw = true,
  disableModelMesh = false,
  disableAcceleratorProfiles = false,
  disableHardwareProfiles = true,
  disablePerformanceMetrics = false,
  disableTrustyBiasMetrics = false,
  disableDistributedWorkloads = false,
  disableModelCatalog = true,
  disableModelRegistry = false,
  disableModelRegistrySecureDB = false,
  disableServingRuntimeParams = false,
  disableStorageClasses = false,
  disableNotebookController = false,
  disableNIMModelServing = false,
  disableLlamaStackChatBot = false,
  disableLMEval = true,
  modelServerSizes = [
    {
      name: 'Small',
      resources: {
        limits: {
          cpu: '2',
          memory: '8Gi',
        },
        requests: {
          cpu: '1',
          memory: '4Gi',
        },
      },
    },
    {
      name: 'Medium',
      resources: {
        limits: {
          cpu: '8',
          memory: '10Gi',
        },
        requests: {
          cpu: '4',
          memory: '8Gi',
        },
      },
    },
    {
      name: 'Large',
      resources: {
        limits: {
          cpu: '10',
          memory: '20Gi',
        },
        requests: {
          cpu: '6',
          memory: '16Gi',
        },
      },
    },
  ],
  disableFineTuning = true,
  notebookSizes = [
    {
      name: 'XSmall',
      resources: {
        limits: {
          cpu: '0.5',
          memory: '500Mi',
        },
        requests: {
          cpu: '0.1',
          memory: '100Mi',
        },
      },
    },
    {
      name: 'Small',
      resources: {
        limits: {
          cpu: '2',
          memory: '8Gi',
        },
        requests: {
          cpu: '1',
          memory: '8Gi',
        },
      },
    },
    {
      name: 'Medium',
      resources: {
        limits: {
          cpu: '6',
          memory: '24Gi',
        },
        requests: {
          cpu: '3',
          memory: '24Gi',
        },
      },
    },
    {
      name: 'Large',
      resources: {
        limits: {
          cpu: '14',
          memory: '56Gi',
        },
        requests: {
          cpu: '7',
          memory: '56Gi',
        },
      },
    },
    {
      name: 'X Large',
      resources: {
        limits: {
          cpu: '30',
          memory: '120Gi',
        },
        requests: {
          cpu: '15',
          memory: '120Gi',
        },
      },
    },
  ],
}: MockDashboardConfigType): DashboardConfigKind => ({
  apiVersion: 'opendatahub.io/v1alpha',
  kind: 'OdhDashboardConfig',
  metadata: {
    name: 'odh-dashboard-config',
    labels: {
      [KnownLabels.DASHBOARD_RESOURCE]: 'true',
    },
    namespace: 'opendatahub',
  },
  spec: {
    dashboardConfig: {
      enablement: true,
      disableInfo,
      disableSupport,
      disableClusterManager,
      disableTracking,
      disableBYONImageStream,
      disableISVBadges,
      disableAppLauncher,
      disableUserManagement,
      disableHome,
      disableProjects,
      disableModelServing,
      disableCustomServingRuntimes,
      disablePipelines,
      disableProjectScoped,
      disableProjectSharing: false,
      disableTrustyBiasMetrics,
      disablePerformanceMetrics,
      disableKServe,
      disableKServeAuth,
      disableKServeMetrics,
      disableKServeRaw,
      disableModelMesh,
      disableAcceleratorProfiles,
      disableHardwareProfiles,
      disableDistributedWorkloads,
      disableModelCatalog,
      disableModelRegistry,
      disableModelRegistrySecureDB,
      disableServingRuntimeParams,
      disableStorageClasses,
      disableNIMModelServing,
      disableAdminConnectionTypes: false,
      disableFineTuning,
      disableLlamaStackChatBot,
      disableLMEval,
    },
    notebookController: {
      enabled: !disableNotebookController,
      notebookNamespace: 'openshift-ai-notebooks',
      notebookTolerationSettings: {
        enabled: true,
        key: 'NotebooksOnlyChange',
      },
      pvcSize: '20Gi',
    },
    groupsConfig: {
      adminGroups: 'openshift-ai-admins',
      allowedGroups: 'system:authenticated',
    },
    modelServerSizes,
    notebookSizes,
    templateOrder: ['test-model'],
    templateDisablement: ['test-model'],
  },
});
