import { ServiceKind } from '~/k8sTypes';

type MockServiceType = {
  name?: string;
  namespace?: string;
};

export const mockModelRegistryService = ({
  name = 'modelregistry-sample',
  namespace = 'odh-model-registries',
}: MockServiceType): ServiceKind => ({
  kind: 'Service',
  apiVersion: 'v1',
  metadata: {
    name,
    namespace,
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
