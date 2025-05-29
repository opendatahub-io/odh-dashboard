import { K8sCondition, ModelRegistryKind } from '~/k8sTypes';

type MockModelRegistryType = {
  name?: string;
  namespace?: string;
  conditions?: K8sCondition[];
  sslRootCertificateConfigMap?: { name: string; key: string } | null;
  sslRootCertificateSecret?: { name: string; key: string } | null;
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
  sslRootCertificateConfigMap = null,
  sslRootCertificateSecret = null,
}: MockModelRegistryType): ModelRegistryKind => {
  const data: ModelRegistryKind = {
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
      oauthProxy: {},
      mysql: {
        database: 'model-registry',
        host: 'model-registry-db',
        passwordSecret: {
          key: 'database-password',
          name: 'model-registry-db',
        },
        port: 5432,
        skipDBCreation: false,
        username: 'mlmduser',
      },
    },
    status: {
      conditions,
    },
  };

  if (sslRootCertificateConfigMap && data.spec.mysql) {
    data.spec.mysql.sslRootCertificateConfigMap = sslRootCertificateConfigMap;
  } else if (sslRootCertificateSecret && data.spec.mysql) {
    data.spec.mysql.sslRootCertificateSecret = sslRootCertificateSecret;
  }
  return data;
};
