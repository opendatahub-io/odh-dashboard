import { DashboardConfigKind, KnownLabels } from '~/k8sTypes';

type MockDashboardConfigType = {
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
  disablePipelines?: boolean;
  disableModelServing?: boolean;
  disableCustomServingRuntimes?: boolean;
  disableKServe?: boolean;
  disableKServeAuth?: boolean;
  disableKServeMetrics?: boolean;
  disableModelMesh?: boolean;
  disableAcceleratorProfiles?: boolean;
  disablePerformanceMetrics?: boolean;
  disableBiasMetrics?: boolean;
  disablePipelineExperiments?: boolean;
  disableS3Endpoint?: boolean;
  disableArtifactsAPI?: boolean;
  disableDistributedWorkloads?: boolean;
  disableModelRegistry?: boolean;
  disableNotebookController?: boolean;
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
  disableModelServing = false,
  disableCustomServingRuntimes = false,
  disablePipelines = false,
  disableKServe = false,
  disableKServeAuth = false,
  disableKServeMetrics = true,
  disableModelMesh = false,
  disableAcceleratorProfiles = false,
  disablePerformanceMetrics = false,
  disableBiasMetrics = false,
  disablePipelineExperiments = false,
  disableS3Endpoint = true,
  disableArtifactsAPI = true,
  disableDistributedWorkloads = false,
  disableModelRegistry = true,
  disableNotebookController = false,
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
      disableProjectSharing: false,
      disableBiasMetrics,
      disablePerformanceMetrics,
      disableKServe,
      disableKServeAuth,
      disableKServeMetrics,
      disableModelMesh,
      disableAcceleratorProfiles,
      disablePipelineExperiments,
      disableS3Endpoint,
      disableArtifactsAPI,
      disableDistributedWorkloads,
      disableModelRegistry,
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
    modelServerSizes: [
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
    notebookSizes: [
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
    templateOrder: ['test-model'],
    templateDisablement: ['test-model'],
  },
});
