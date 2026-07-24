import type { NIMAccountKind, SecretKind } from '@odh-dashboard/k8s-core';
import { getGenericErrorCode } from '@odh-dashboard/internal/api/errorUtils';
import {
  assembleNIMSecret,
  assembleNIMAccount,
  assembleUpdatedSecret,
  createNIMSecret,
  createNIMAccount,
  getNIMAccount,
  deleteNIMAccount,
  deleteSecret,
  fetchExistingSecret,
  replaceNIMSecret,
} from './k8s';

import { NIM_SECRET_NAME } from './constants';

const isConflict = (e: unknown): boolean => getGenericErrorCode(e) === 409;

export const createOrReplaceSecret = async (
  namespace: string,
  apiKey: string,
  dryRun?: boolean,
): Promise<SecretKind> => {
  const secretData = assembleNIMSecret(namespace, apiKey);
  try {
    return await createNIMSecret(secretData, dryRun);
  } catch (e) {
    if (isConflict(e)) {
      const existingSecret = await fetchExistingSecret(namespace, NIM_SECRET_NAME);
      const updatedSecret = assembleUpdatedSecret(existingSecret, apiKey);
      if (dryRun) {
        await replaceNIMSecret(updatedSecret, true);
        return updatedSecret;
      }
      return replaceNIMSecret(updatedSecret);
    }
    throw e;
  }
};

export const createOrReturnAccount = async (
  namespace: string,
  dryRun?: boolean,
): Promise<NIMAccountKind> => {
  const accountData = assembleNIMAccount(namespace, NIM_SECRET_NAME);
  try {
    return await createNIMAccount(accountData, dryRun);
  } catch (e) {
    if (isConflict(e)) {
      if (dryRun) {
        return accountData;
      }
      const existing = await getNIMAccount(namespace);
      if (existing) {
        return existing;
      }
    }
    throw e;
  }
};

export const createNIMResources = async (
  namespace: string,
  apiKey: string,
): Promise<NIMAccountKind> => {
  await Promise.all([
    createOrReplaceSecret(namespace, apiKey, true),
    createOrReturnAccount(namespace, true),
  ]);

  await createOrReplaceSecret(namespace, apiKey);

  try {
    return await createOrReturnAccount(namespace);
  } catch (e) {
    await deleteSecret(namespace, NIM_SECRET_NAME);
    throw e;
  }
};

export const deleteNIMResources = async (namespace: string): Promise<void> => {
  await deleteNIMAccount(namespace);
  await deleteSecret(namespace, NIM_SECRET_NAME);
};
