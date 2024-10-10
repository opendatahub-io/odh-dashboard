import { K8sCondition, ModelRegistryKind } from '~/k8sTypes';

type MockModelRegistryType = {
  name?: string;
  namespace?: string;
  conditions?: K8sCondition[];
};

export const mockModelRegistry = ({
  name = 'modelregistry-sample',
  namespace = 'odh-model-registries',
  conditions = [
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
}: MockModelRegistryType): ModelRegistryKind => ({
  apiVersion: 'modelregistry.opendatahub.io/v1alpha1',
  kind: 'ModelRegistry',
  metadata: {
    name,
    creationTimestamp: '2024-03-14T08:01:42Z',
    namespace,
  },
  spec: {
    grpc: {},
    rest: {},
    istio: {
      gateway: {
        grpc: { tls: {} },
        rest: { tls: {} },
      },
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
  },
  status: {
    conditions,
  },
});
