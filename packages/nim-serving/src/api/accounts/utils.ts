import type { K8sCondition } from '@odh-dashboard/k8s-core';
import type { NIMAccountKind } from '@odh-dashboard/internal/k8sTypes';

import { VALIDATION_TIMEOUT_MS } from './constants';

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
  return Date.now() - new Date(String(timestamp)).getTime();
};

export const getAccountStatusTransitionTime = (
  account: NIMAccountKind | null,
): string | undefined =>
  account?.status?.conditions?.find((c: K8sCondition) => c.type === 'AccountStatus')
    ?.lastTransitionTime;

export const deriveAccountStatus = (
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
  const errors = getAccountErrors(account);
  if (errors.length > 0) {
    return { status: NIMAccountStatus.ERROR, errorMessages: errors };
  }
  const accountAge = getAccountAgeMs(account);
  if (isApiKeyValidated(account)) {
    if (accountAge > VALIDATION_TIMEOUT_MS) {
      return {
        status: NIMAccountStatus.ERROR,
        errorMessages: [VALIDATION_TIMEOUT_MESSAGE],
      };
    }
    return { status: NIMAccountStatus.PENDING, errorMessages: [] };
  }
  if (accountAge > VALIDATION_TIMEOUT_MS) {
    return { status: NIMAccountStatus.ERROR, errorMessages: [VALIDATION_TIMEOUT_MESSAGE] };
  }
  return { status: NIMAccountStatus.PENDING, errorMessages: [] };
};
