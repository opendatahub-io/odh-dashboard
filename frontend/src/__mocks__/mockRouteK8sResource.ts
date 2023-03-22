import { RouteKind } from '~/k8sTypes';

type MockResourceConfigType = {
  notebookName?: string;
  namespace?: string;
};

export const mockRouteK8sResource = ({
  notebookName = 'test-notebook',
  namespace = 'test-project',
}: MockResourceConfigType): RouteKind => ({
  kind: 'Route',
  apiVersion: 'route.openshift.io/v1',
  metadata: {
    name: notebookName,
    namespace: namespace,
    uid: 'e3cfc63f-c8a0-4502-adab-7b8f53c11f76',
    resourceVersion: '4789458',
    creationTimestamp: '2023-02-14T21:44:13Z',
    labels: {
      'notebook-name': notebookName,
    },
    annotations: {
      'openshift.io/host.generated': 'true',
    },
    ownerReferences: [
      {
        apiVersion: 'kubeflow.org/v1',
        kind: 'Notebook',
        name: notebookName,
        uid: '00a7904f-49b7-4105-b8ba-ce28f3b4ae11',
        controller: true,
        blockOwnerDeletion: true,
      },
    ],
    managedFields: [],
  },
  spec: {
    path: '',
    host: `${notebookName}-${namespace}.apps.user.com`,
    to: {
      kind: 'Service',
      name: `${notebookName}-tls`,
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
        host: `${notebookName}-${namespace}.apps.user.com`,
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
});
