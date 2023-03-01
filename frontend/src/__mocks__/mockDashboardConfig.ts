export const mockDashboardConfig = {
  apiVersion: 'opendatahub.io/v1alpha',
  kind: 'OdhDashboardConfig',
  metadata: {
    name: 'odh-dashboard-config',
    labels: {
      'opendatahub.io/dashboard': 'true',
    },
    annotations: {},
    creationTimestamp: '2023-02-08T13:35:42Z',
    generation: 15,
    managedFields: [],
    namespace: 'redhat-ods-applications',
    resourceVersion: '1926467',
    uid: '1e4fb39d-1d61-45c6-93ff-f4872a838a68',
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
