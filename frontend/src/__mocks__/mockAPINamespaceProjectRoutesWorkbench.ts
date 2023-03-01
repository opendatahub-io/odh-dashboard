// /api/k8s/apis/route.openshift.io/v1/namespaces/project/routes/workbench

export const mockAPINamespaceProjectRoutesWorkbench = {
  kind: 'Route',
  apiVersion: 'route.openshift.io/v1',
  metadata: {
    name: 'workbench',
    namespace: 'project',
    uid: 'e3cfc63f-c8a0-4502-adab-7b8f53c11f76',
    resourceVersion: '4789458',
    creationTimestamp: '2023-02-14T21:44:13Z',
    labels: {
      'notebook-name': 'workbench',
    },
    annotations: {
      'openshift.io/host.generated': 'true',
    },
    ownerReferences: [
      {
        apiVersion: 'kubeflow.org/v1',
        kind: 'Notebook',
        name: 'workbench',
        uid: '00a7904f-49b7-4105-b8ba-ce28f3b4ae11',
        controller: true,
        blockOwnerDeletion: true,
      },
    ],
    managedFields: [],
  },
  spec: {
    host: 'workbench-project.apps.user.com',
    to: {
      kind: 'Service',
      name: 'workbench-tls',
      weight: 100,
    },
    port: {
      targetPort: 'oauth-proxy',
    },
    tls: {
      termination: 'reencrypt',
      insecureEdgeTerminationPolicy: 'Redirect',
    },
    wildcardPolicy: 'None',
  },
  status: {
    ingress: [
      {
        host: 'workbench-project.apps.user.com',
        routerName: 'default',
        conditions: [
          {
            type: 'Admitted',
            status: 'True',
            lastTransitionTime: '2023-02-14T21:44:13Z',
          },
        ],
        wildcardPolicy: 'None',
        routerCanonicalHostname: 'router-default.apps.user.com',
      },
    ],
  },
};
