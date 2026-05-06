import {
  K8sModelCommon,
  k8sCreateResource,
  k8sDeleteResource,
  k8sListResource,
  k8sPatchResource,
  K8sStatusError,
} from '@openshift/dynamic-plugin-sdk-utils';
import { NIMAccountKind, SecretKind } from '@odh-dashboard/internal/k8sTypes';
import { SecretModel } from '@odh-dashboard/internal/api/models';
import { createSecret, getSecret, replaceSecret } from '@odh-dashboard/internal/api/k8s/secrets';
import {
  NIM_SECRET_GENERATE_NAME,
  NIM_ACCOUNT_NAME,
  NIM_API_KEY_DATA_KEY,
  NGC_API_KEY_DATA_KEY,
  NIM_FORCE_VALIDATION_ANNOTATION,
} from './constants';

export const NIMAccountModel: K8sModelCommon = {
  apiVersion: 'v1',
  apiGroup: 'nim.opendatahub.io',
  kind: 'Account',
  plural: 'accounts',
};

export const listNIMAccounts = async (namespace: string): Promise<NIMAccountKind[]> =>
  k8sListResource<NIMAccountKind>({
    model: NIMAccountModel,
    queryOptions: { ns: namespace },
  }).then((listResource) => listResource.items);

export const getNIMAccount = async (namespace: string): Promise<NIMAccountKind | undefined> => {
  const accounts = await listNIMAccounts(namespace);
  return accounts.find((a) => a.metadata.name === NIM_ACCOUNT_NAME);
};

export const assembleNIMSecret = (namespace: string, apiKey: string): SecretKind => ({
  apiVersion: 'v1',
  kind: 'Secret',
  metadata: {
    name: '',
    generateName: NIM_SECRET_GENERATE_NAME,
    namespace,
    labels: {
      'opendatahub.io/managed': 'true',
    },
  },
  type: 'Opaque',
  stringData: {
    [NIM_API_KEY_DATA_KEY]: apiKey,
    [NGC_API_KEY_DATA_KEY]: apiKey,
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

export const createNIMSecret = (data: SecretKind, dryRun?: boolean): Promise<SecretKind> =>
  createSecret(data, dryRun ? { dryRun: true } : undefined);

export const createNIMAccount = (
  resource: NIMAccountKind,
  dryRun?: boolean,
): Promise<NIMAccountKind> =>
  k8sCreateResource<NIMAccountKind>({
    model: NIMAccountModel,
    resource,
    ...(dryRun && { queryOptions: { queryParams: { dryRun: 'All' } } }),
  });

export const deleteNIMAccount = async (namespace: string): Promise<void> => {
  try {
    await k8sDeleteResource<NIMAccountKind>({
      model: NIMAccountModel,
      queryOptions: { name: NIM_ACCOUNT_NAME, ns: namespace },
    });
  } catch (e) {
    if (e instanceof K8sStatusError && e.status.code === 404) {
      return;
    }
    throw e;
  }
};

export const deleteSecret = async (namespace: string, name: string): Promise<void> => {
  await k8sDeleteResource<SecretKind>({
    model: SecretModel,
    queryOptions: { name, ns: namespace },
  });
};

export const patchSecretOwnerReference = (
  namespace: string,
  secretName: string,
  account: NIMAccountKind,
): Promise<SecretKind> =>
  k8sPatchResource<SecretKind>({
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

export const fetchExistingSecret = (namespace: string, secretName: string): Promise<SecretKind> =>
  getSecret(namespace, secretName);

export const replaceNIMSecret = (data: SecretKind, dryRun?: boolean): Promise<SecretKind> =>
  replaceSecret(data, dryRun ? { dryRun: true } : undefined);

export const assembleUpdatedSecret = (existingSecret: SecretKind, apiKey: string): SecretKind => ({
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
    [NIM_API_KEY_DATA_KEY]: apiKey,
    [NGC_API_KEY_DATA_KEY]: apiKey,
  },
});
