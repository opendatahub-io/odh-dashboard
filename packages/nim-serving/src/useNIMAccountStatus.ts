import React from 'react';
import { NIMAccountKind, K8sCondition } from '@odh-dashboard/internal/k8sTypes';
import useFetch, { FetchStateCallbackPromise } from '@odh-dashboard/internal/utilities/useFetch';
import { POLL_INTERVAL, FAST_POLL_INTERVAL } from '@odh-dashboard/internal/utilities/const';
import { listNIMAccounts } from '@odh-dashboard/internal/api/k8s/nimAccounts';
import { isAccountReady, getAccountErrors } from './nimK8sUtils';

export enum NIMAccountStatus {
  NOT_FOUND = 'NOT_FOUND',
  PENDING = 'PENDING',
  ERROR = 'ERROR',
  READY = 'READY',
}

const REVALIDATION_TIMEOUT_MS = 30000;

type NIMAccountStatusResult = {
  status: NIMAccountStatus;
  nimAccount: NIMAccountKind | null;
  errorMessages: string[];
  loaded: boolean;
  refresh: () => Promise<NIMAccountKind | null | undefined>;
  startRevalidation: () => void;
};

export const deriveStatus = (
  account: NIMAccountKind | null,
): { status: NIMAccountStatus; errorMessages: string[] } => {
  if (!account) {
    return { status: NIMAccountStatus.NOT_FOUND, errorMessages: [] };
  }
  if (isAccountReady(account)) {
    return { status: NIMAccountStatus.READY, errorMessages: [] };
  }
  const errors = getAccountErrors(account);
  if (errors.length > 0) {
    return { status: NIMAccountStatus.ERROR, errorMessages: errors };
  }
  return { status: NIMAccountStatus.PENDING, errorMessages: [] };
};

const getAccountStatusTransitionTime = (account: NIMAccountKind | null): string | undefined =>
  account?.status?.conditions?.find((c: K8sCondition) => c.type === 'AccountStatus')
    ?.lastTransitionTime;

const useNIMAccountStatus = (namespace: string): NIMAccountStatusResult => {
  const fetchCallback = React.useCallback<
    FetchStateCallbackPromise<NIMAccountKind | null>
  >(async () => {
    const accounts = await listNIMAccounts(namespace);
    return accounts[0] ?? null;
  }, [namespace]);

  const [pollRate, setPollRate] = React.useState(POLL_INTERVAL);
  const [revalidationState, setRevalidationState] = React.useState<{
    transitionTimeAtStart: string | undefined;
    startedAt: number;
  } | null>(null);

  const {
    data: nimAccount,
    loaded,
    refresh,
  } = useFetch(fetchCallback, null, {
    refreshRate: pollRate,
  });

  const derived = loaded ? deriveStatus(nimAccount) : deriveStatus(null);

  const isWaitingForRevalidation = React.useMemo(() => {
    if (!revalidationState) {
      return false;
    }
    const currentTransitionTime = getAccountStatusTransitionTime(nimAccount);
    if (
      currentTransitionTime &&
      currentTransitionTime !== revalidationState.transitionTimeAtStart
    ) {
      return false;
    }
    if (Date.now() - revalidationState.startedAt > REVALIDATION_TIMEOUT_MS) {
      return false;
    }
    return true;
  }, [revalidationState, nimAccount]);

  React.useEffect(() => {
    if (revalidationState && !isWaitingForRevalidation) {
      setRevalidationState(null);
    }
  }, [revalidationState, isWaitingForRevalidation]);

  const effectiveStatus = isWaitingForRevalidation ? NIMAccountStatus.PENDING : derived.status;
  const effectiveErrors = isWaitingForRevalidation ? [] : derived.errorMessages;

  React.useEffect(() => {
    setPollRate(effectiveStatus === NIMAccountStatus.PENDING ? FAST_POLL_INTERVAL : POLL_INTERVAL);
  }, [effectiveStatus]);

  const startRevalidation = React.useCallback(() => {
    setRevalidationState({
      transitionTimeAtStart: getAccountStatusTransitionTime(nimAccount),
      startedAt: Date.now(),
    });
  }, [nimAccount]);

  return {
    status: effectiveStatus,
    nimAccount,
    errorMessages: effectiveErrors,
    loaded,
    refresh,
    startRevalidation,
  };
};

export default useNIMAccountStatus;
