import { MODEL_REGISTRY_DEFAULT_NAMESPACE } from '~/concepts/modelRegistry/const';
import { ModelRegistryKind } from '~/k8sTypes';

type MockModelRegistryType = {
  name?: string;
  namespace?: string;
};

export const mockModelRegistry = ({
  name = 'modelregistry-sample',
  namespace = MODEL_REGISTRY_DEFAULT_NAMESPACE,
}: MockModelRegistryType): ModelRegistryKind => ({
  apiVersion: 'modelregistry.opendatahub.io/v1alpha1',
  kind: 'ModelRegistry',
  metadata: {
    name,
    creationTimestamp: '2024-03-14T08:01:42Z',
    namespace,
  },
  spec: {
    grpc: {
      port: 9090,
    },
    postgres: {
      database: 'model-registry',
      host: 'model-registry-db',
      passwordSecret: {
        key: 'database-password',
        name: 'model-registry-db',
      },
      port: 5432,
      skipDBCreation: false,
      sslMode: 'disable',
      username: 'mlmduser',
    },
    rest: {
      port: 8080,
      serviceRoute: 'disabled',
    },
  },
  status: {
    conditions: [
      {
        lastTransitionTime: '2024-03-22T09:30:02Z',
        message: 'Deployment for custom resource modelregistry-sample was successfully created',
        reason: 'CreatedDeployment',
        status: 'True',
        type: 'Progressing',
      },
      {
        lastTransitionTime: '2024-03-14T08:11:26Z',
        message: 'Deployment for custom resource modelregistry-sample is available',
        reason: 'DeploymentAvailable',
        status: 'True',
        type: 'Available',
      },
    ],
  },
});
