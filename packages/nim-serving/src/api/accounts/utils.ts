import { NIMAccountKind, K8sCondition } from '@odh-dashboard/internal/k8sTypes';
import { allSettledPromises } from '@odh-dashboard/internal/utilities/allSettledPromises';
import {
  assembleNIMSecret,
  assembleNIMAccount,
  assembleUpdatedSecret,
  createNIMSecret,
  createNIMAccount,
  deleteNIMAccount,
  deleteSecret,
  patchSecretOwnerReference,
  fetchExistingSecret,
  replaceNIMSecret,
} from './k8s';

import { VALIDATION_TIMEOUT_MS } from './constants';

export { deleteNIMAccount as deleteNIMResources } from './k8s';

export enum NIMAccountStatus {
  LOADING = 'LOADING',
  NOT_FOUND = 'NOT_FOUND',
  PENDING = 'PENDING',
  ERROR = 'ERROR',
  READY = 'READY',
}

const VALIDATION_TIMEOUT_MESSAGE =
  'NIM account validation is taking longer than expected. You may want to replace the API key or disable NIM and try again.';

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

export const getAccountAgeMs = (account: NIMAccountKind): number => {
  const timestamp = account.status?.lastAccountCheck ?? account.metadata.creationTimestamp;
  if (!timestamp) {
    return 0;
  }
  return Date.now() - new Date(timestamp).getTime();
};

export const getAccountStatusTransitionTime = (
  account: NIMAccountKind | null,
): string | undefined =>
  account?.status?.conditions?.find((c: K8sCondition) => c.type === 'AccountStatus')
    ?.lastTransitionTime;

export const deriveStatus = (
  account: NIMAccountKind | null,
  loaded = true,
): { status: NIMAccountStatus; errorMessages: string[] } => {
  if (!loaded) {
    return { status: NIMAccountStatus.LOADING, errorMessages: [] };
  }
  if (!account) {
    return { status: NIMAccountStatus.NOT_FOUND, errorMessages: [] };
  }
  if (isAccountReady(account)) {
    return { status: NIMAccountStatus.READY, errorMessages: [] };
  }
  if (isApiKeyValidationFailed(account)) {
    const errors = getAccountErrors(account);
    return { status: NIMAccountStatus.ERROR, errorMessages: errors };
  }
  const accountAge = getAccountAgeMs(account);
  if (isApiKeyValidated(account)) {
    if (accountAge > VALIDATION_TIMEOUT_MS) {
      const errors = getAccountErrors(account);
      return {
        status: NIMAccountStatus.ERROR,
        errorMessages: errors.length > 0 ? errors : [VALIDATION_TIMEOUT_MESSAGE],
      };
    }
    return { status: NIMAccountStatus.PENDING, errorMessages: [] };
  }
  if (accountAge > VALIDATION_TIMEOUT_MS) {
    return { status: NIMAccountStatus.ERROR, errorMessages: [VALIDATION_TIMEOUT_MESSAGE] };
  }
  return { status: NIMAccountStatus.PENDING, errorMessages: [] };
};

export const createNIMResources = async (
  namespace: string,
  apiKey: string,
): Promise<NIMAccountKind> => {
  const secretData = assembleNIMSecret(namespace, apiKey);
  const accountData = assembleNIMAccount(namespace, '');

  await Promise.all([createNIMSecret(secretData, true), createNIMAccount(accountData, true)]);

  const secret = await createNIMSecret(secretData);
  const secretName = secret.metadata.name;

  let account: NIMAccountKind;
  try {
    account = await createNIMAccount(assembleNIMAccount(namespace, secretName));
  } catch (e) {
    await deleteSecret(namespace, secretName);
    throw e;
  }

  try {
    await patchSecretOwnerReference(namespace, secretName, account);
  } catch (e) {
    await allSettledPromises<unknown>([
      deleteNIMAccount(namespace),
      deleteSecret(namespace, secretName),
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
  const existingSecret = await fetchExistingSecret(namespace, secretName);
  const updatedSecret = assembleUpdatedSecret(existingSecret, apiKey);
  await replaceNIMSecret(updatedSecret, true);
  await replaceNIMSecret(updatedSecret);
};
