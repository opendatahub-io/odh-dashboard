import { ModelRegistry, ServiceKind } from '#~/k8sTypes';

type MockServiceType = {
  name?: string;
  namespace?: string;
  description?: string;
  serverUrl?: string;
};

type MockModelRegistry = {
  name?: string;
  description?: string;
  displayName?: string;
};

export const mockModelRegistry = ({
  name = 'modelregistry-sample',
  description = 'Model registry description',
  displayName = 'Model Registry Sample',
}: MockModelRegistry): ModelRegistry => ({
  name,
  description,
  displayName,
});

export const mockModelRegistryService = ({
  name = 'modelregistry-sample',
  namespace = 'odh-model-registries',
  description = 'Model registry description',
  serverUrl = 'modelregistry-sample-rest.com:443',
}: MockServiceType): ServiceKind => ({
  kind: 'Service',
  apiVersion: 'v1',
  metadata: {
    name,
    namespace,
    annotations: {
      'openshift.io/description': description,
      'openshift.io/display-name': name,
      'routing.opendatahub.io/external-address-rest': serverUrl,
    },
  },
  spec: {
    selector: {
      app: name,
      component: 'model-registry',
    },
    ports: [
      {
        name: 'grpc-api',
        protocol: 'TCP',
        port: 9090,
        targetPort: 9090,
      },
      {
        name: 'http-api',
        protocol: 'TCP',
        port: 8080,
        targetPort: 8080,
      },
    ],
  },
});
