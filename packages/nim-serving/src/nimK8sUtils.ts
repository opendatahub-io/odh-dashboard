import {
  k8sCreateResource,
  k8sDeleteResource,
  k8sPatchResource,
} from '@openshift/dynamic-plugin-sdk-utils';
import { NIMAccountKind, SecretKind, K8sCondition } from '@odh-dashboard/internal/k8sTypes';
import { SecretModel } from '@odh-dashboard/internal/api/models';
import { createSecret, getSecret, replaceSecret } from '@odh-dashboard/internal/api/k8s/secrets';
import { allSettledPromises } from '@odh-dashboard/internal/utilities/allSettledPromises';
import { NIMAccountModel, listNIMAccounts } from './k8s/nimAccounts';
import {
  NIM_SECRET_GENERATE_NAME,
  NIM_ACCOUNT_NAME,
  NIM_API_KEY_DATA_KEY,
  NGC_API_KEY_DATA_KEY,
  NIM_FORCE_VALIDATION_ANNOTATION,
} from './nimConstants';

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

export const createNIMResources = async (
  namespace: string,
  apiKey: string,
): Promise<NIMAccountKind> => {
  const secretData = assembleNIMSecret(namespace, apiKey);
  const accountData = assembleNIMAccount(namespace, '');

  await Promise.all([
    createSecret(secretData, { dryRun: true }),
    k8sCreateResource<NIMAccountKind>({
      model: NIMAccountModel,
      resource: accountData,
      queryOptions: { queryParams: { dryRun: 'All' } },
    }),
  ]);

  const secret = await createSecret(secretData);
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

  try {
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
  } catch (e) {
    await allSettledPromises<unknown>([
      k8sDeleteResource<NIMAccountKind>({
        model: NIMAccountModel,
        queryOptions: { name: account.metadata.name, ns: namespace },
      }),
      k8sDeleteResource<SecretKind>({
        model: SecretModel,
        queryOptions: { name: secretName, ns: namespace },
      }),
    ]);
    throw e;
  }

  return account;
};

export const updateNIMSecretAndRevalidate = async (
  namespace: string,
  secretName: string,
  apiKey: string,
): Promise<void> => {
  const existingSecret = await getSecret(namespace, secretName);
  const updatedSecret: SecretKind = {
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
  };
  await replaceSecret(updatedSecret, { dryRun: true });
  await replaceSecret(updatedSecret);
};

export const deleteNIMResources = async (namespace: string): Promise<void> => {
  await k8sDeleteResource<NIMAccountKind>({
    model: NIMAccountModel,
    queryOptions: { name: NIM_ACCOUNT_NAME, ns: namespace },
  });
};

export const getNIMAccount = async (namespace: string): Promise<NIMAccountKind | undefined> => {
  const accounts = await listNIMAccounts(namespace);
  return accounts.find((a) => a.metadata.name === NIM_ACCOUNT_NAME);
};

export const isAccountReady = (account: NIMAccountKind): boolean => {
  const conditions = account.status?.conditions ?? [];
  return conditions.some((c: K8sCondition) => c.type === 'AccountStatus' && c.status === 'True');
};

export const isApiKeyValidated = (account: NIMAccountKind): boolean => {
  const conditions = account.status?.conditions ?? [];
  return conditions.some((c: K8sCondition) => c.type === 'APIKeyValidation' && c.status === 'True');
};

export const isApiKeyValidationFailed = (account: NIMAccountKind): boolean => {
  const conditions = account.status?.conditions ?? [];
  return conditions.some(
    (c: K8sCondition) => c.type === 'APIKeyValidation' && c.status === 'False',
  );
};

export const getAccountErrors = (account: NIMAccountKind): string[] => {
  const conditions = account.status?.conditions ?? [];
  return [
    ...new Set(
      conditions
        .filter((c: K8sCondition) => c.status === 'False')
        .map((c: K8sCondition) => c.message)
        .filter((msg): msg is string => !!msg),
    ),
  ];
};
