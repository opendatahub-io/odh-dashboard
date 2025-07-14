import { K8sCondition, NIMAccountKind } from '#~/k8sTypes';

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
  apiKeySecretName = 'mock-nvidia-nim-access',
  nimConfigName = 'mock-nvidia-nim-images-data',
  runtimeTemplateName = 'mock-nvidia-nim-serving-template',
  nimPullSecretName = 'mock-nvidia-nim-image-pull',
  conditions = [
    {
      type: 'AccountStatus',
      status: 'True',
      lastTransitionTime: new Date().toISOString(),
      reason: 'AccountSuccessful',
      message: 'reconciled successfully',
    },
  ],
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
