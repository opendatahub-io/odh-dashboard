import {
  k8sCreateResource,
  k8sDeleteResource,
  k8sPatchResource,
} from '@openshift/dynamic-plugin-sdk-utils';
import { NIMAccountKind, SecretKind, K8sCondition } from '@odh-dashboard/internal/k8sTypes';
import { NIMAccountModel } from '@odh-dashboard/internal/api/models/odh';
import { SecretModel } from '@odh-dashboard/internal/api/models';
import { createSecret, getSecret, replaceSecret } from '@odh-dashboard/internal/api/k8s/secrets';
import { listNIMAccounts } from '@odh-dashboard/internal/api/k8s/nimAccounts';
import {
  NIM_ACCOUNT_SECRET_GENERATE_NAME,
  NIM_ACCOUNT_NAME,
  NIM_ACCOUNT_API_KEY_DATA_KEY,
  NIM_FORCE_VALIDATION_ANNOTATION,
} from './nimConstants';

export const assembleNIMSecret = (namespace: string, apiKey: string): SecretKind => ({
  apiVersion: 'v1',
  kind: 'Secret',
  metadata: {
    name: '',
    generateName: NIM_ACCOUNT_SECRET_GENERATE_NAME,
    namespace,
    labels: {
      'opendatahub.io/managed': 'true',
    },
  },
  type: 'Opaque',
  stringData: {
    [NIM_ACCOUNT_API_KEY_DATA_KEY]: apiKey,
  },
});

export const assembleNIMAccount = (namespace: string, secretName: string): NIMAccountKind => ({
  apiVersion: 'nim.opendatahub.io/v1',
  kind: 'Account',
  metadata: {
    name: NIM_ACCOUNT_NAME,
    namespace,
    labels: {
      'opendatahub.io/managed': 'true',
    },
  },
  spec: {
    apiKeySecret: {
      name: secretName,
    },
  },
});

export const createNIMResources = async (
  namespace: string,
  apiKey: string,
): Promise<NIMAccountKind> => {
  const secret = await createSecret(assembleNIMSecret(namespace, apiKey));
  const secretName = secret.metadata.name;

  let account: NIMAccountKind;
  try {
    account = await k8sCreateResource<NIMAccountKind>({
      model: NIMAccountModel,
      resource: assembleNIMAccount(namespace, secretName),
    });
  } catch (e) {
    await k8sDeleteResource<SecretKind>({
      model: SecretModel,
      queryOptions: { name: secretName, ns: namespace },
    });
    throw e;
  }

  await k8sPatchResource<SecretKind>({
    model: SecretModel,
    queryOptions: { name: secretName, ns: namespace },
    patches: [
      {
        op: 'add',
        path: '/metadata/ownerReferences',
        value: [
          {
            apiVersion: account.apiVersion,
            kind: account.kind,
            name: account.metadata.name,
            uid: account.metadata.uid,
            blockOwnerDeletion: true,
          },
        ],
      },
    ],
  });

  return account;
};

export const updateNIMSecretAndRevalidate = async (
  namespace: string,
  secretName: string,
  apiKey: string,
): Promise<void> => {
  const existingSecret = await getSecret(namespace, secretName);
  await replaceSecret({
    ...existingSecret,
    data: undefined,
    metadata: {
      ...existingSecret.metadata,
      annotations: {
        ...existingSecret.metadata.annotations,
        [NIM_FORCE_VALIDATION_ANNOTATION]: new Date().toISOString(),
      },
    },
    stringData: {
      [NIM_ACCOUNT_API_KEY_DATA_KEY]: apiKey,
    },
  });
};

export const deleteNIMResources = async (namespace: string): Promise<void> => {
  await k8sDeleteResource<NIMAccountKind>({
    model: NIMAccountModel,
    queryOptions: { name: NIM_ACCOUNT_NAME, ns: namespace },
  });
};

export const getNIMAccount = async (namespace: string): Promise<NIMAccountKind | undefined> => {
  const accounts = await listNIMAccounts(namespace);
  return accounts[0];
};

export const isAccountReady = (account: NIMAccountKind): boolean => {
  const conditions = account.status?.conditions ?? [];
  return conditions.some((c: K8sCondition) => c.type === 'AccountStatus' && c.status === 'True');
};

export const getAccountErrors = (account: NIMAccountKind): string[] => {
  const conditions = account.status?.conditions ?? [];
  return conditions
    .filter((c: K8sCondition) => c.status === 'False')
    .map((c: K8sCondition) => c.message)
    .filter((msg): msg is string => !!msg);
};

export const getApiKeyValidationStatus = (account: NIMAccountKind): string => {
  const conditions = account.status?.conditions ?? [];
  const apiKeyCondition = conditions.find((c: K8sCondition) => c.type === 'APIKeyValidation');
  return apiKeyCondition?.status ?? 'Unknown';
};
