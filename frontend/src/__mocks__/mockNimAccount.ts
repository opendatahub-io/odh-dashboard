import { K8sCondition, NIMAccountKind } from '~/k8sTypes';

type MockResourceConfigType = {
  name?: string;
  namespace?: string;
  uid?: string;
  apiKeySecretName?: string;
  nimConfigName?: string;
  runtimeTemplateName?: string;
  nimPullSecretName?: string;
  conditions?: K8sCondition[];
};

export const mockNimAccount = ({
  name = 'odh-nim-account',
  namespace = 'opendatahub',
  uid = 'test-uid',
  apiKeySecretName = 'nvidia-nim-access',
  nimConfigName = 'nvidia-nim-images-data',
  runtimeTemplateName = 'nvidia-nim-serving-template',
  nimPullSecretName = 'nvidia-nim-image-pull',
  conditions = [],
}: MockResourceConfigType): NIMAccountKind => ({
  apiVersion: 'nim.opendatahub.io/v1',
  kind: 'Account',
  metadata: {
    name,
    namespace,
    uid,
    creationTimestamp: new Date().toISOString(),
  },
  spec: {
    apiKeySecret: {
      name: apiKeySecretName,
    },
  },
  status: {
    nimConfig: nimConfigName ? { name: nimConfigName } : undefined,
    runtimeTemplate: runtimeTemplateName ? { name: runtimeTemplateName } : undefined,
    nimPullSecret: nimPullSecretName ? { name: nimPullSecretName } : undefined,
    conditions,
  },
});
