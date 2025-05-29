import { RouteKind } from '#~/k8sTypes';
import { genUID } from '#~/__mocks__/mockUtils';

type MockResourceConfigType = {
  name?: string;
  notebookName?: string;
  inferenceServiceName?: string;
  namespace?: string;
};

export const mockRouteK8sResource = ({
  name,
  notebookName = 'test-notebook',
  namespace = 'test-project',
}: MockResourceConfigType): RouteKind => ({
  kind: 'Route',
  apiVersion: 'route.openshift.io/v1',
  metadata: {
    name: name || notebookName,
    namespace,
    uid: genUID('route'),
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
        uid: genUID('notebook'),
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

export const mockRouteK8sResourceModelServing = ({
  inferenceServiceName = 'test-inference',
  namespace = 'test-project',
}: MockResourceConfigType): RouteKind => ({
  kind: 'Route',
  apiVersion: 'route.openshift.io/v1',
  metadata: {
    name: inferenceServiceName,
    namespace,
    uid: genUID('route'),
    resourceVersion: '4789458',
    creationTimestamp: '2023-02-14T21:44:13Z',
    labels: {
      'inferenceservice-name': inferenceServiceName,
    },
    annotations: {
      'openshift.io/host.generated': 'true',
    },
    ownerReferences: [
      {
        apiVersion: 'serving.kserve.io/v1beta1',
        kind: 'InferenceService',
        name: inferenceServiceName,
        uid: genUID('notebook'),
        controller: true,
        blockOwnerDeletion: true,
      },
    ],
    managedFields: [],
  },
  spec: {
    path: '',
    host: `${inferenceServiceName}-${namespace}.apps.user.com`,
    to: {
      kind: 'Service',
      name: `${inferenceServiceName}-serving`,
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
        host: `${inferenceServiceName}-${namespace}.apps.user.com`,
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

export const mockRouteK8sResourceModelRegistry = ({
  name = 'modelregistry-sample',
  namespace = 'shared',
}: MockResourceConfigType): RouteKind => ({
  kind: 'Route',
  apiVersion: 'route.openshift.io/v1',
  metadata: {
    name,
    namespace,
    uid: genUID('route'),
    resourceVersion: '4789458',
    creationTimestamp: '2023-02-14T21:44:13Z',
    labels: {
      app: name,
      component: 'model-registry',
    },
    annotations: {
      'openshift.io/host.generated': 'true',
    },
    managedFields: [],
  },
  spec: {
    path: '',
    host: `${name}-${namespace}.apps.user.com`,
    to: {
      kind: 'Service',
      name,
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
        host: `${name}-${namespace}.apps.user.com`,
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
