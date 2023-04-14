import { DashboardConfig } from '~/types';

export const mockDashboardConfig: DashboardConfig = {
  apiVersion: 'opendatahub.io/v1alpha',
  kind: 'OdhDashboardConfig',
  metadata: {
    name: 'odh-dashboard-config',
    labels: {
      'opendatahub.io/dashboard': 'true',
    },
    namespace: 'redhat-ods-applications',
  },
  spec: {
    dashboardConfig: {
      enablement: true,
      disableInfo: false,
      disableSupport: false,
      disableClusterManager: false,
      disableTracking: true,
      disableBYONImageStream: false,
      disableISVBadges: false,
      disableAppLauncher: false,
      disableUserManagement: false,
      disableProjects: false,
      disableModelServing: false,
      modelMetricsNamespace: 'test-project',
    },
    notebookController: {
      enabled: true,
      notebookNamespace: 'rhods-notebooks',
      notebookTolerationSettings: {
        enabled: true,
        key: 'NotebooksOnlyChange',
      },
      pvcSize: '20Gi',
    },
    groupsConfig: {
      adminGroups: 'rhods-admins',
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
  },
};
