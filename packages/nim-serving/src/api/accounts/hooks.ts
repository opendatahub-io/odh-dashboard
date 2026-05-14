import React from 'react';
import useFetch, { FetchStateCallbackPromise } from '@odh-dashboard/internal/utilities/useFetch';
import { POLL_INTERVAL, FAST_POLL_INTERVAL } from '@odh-dashboard/internal/utilities/const';
import { NIMAccountKind } from '@odh-dashboard/internal/k8sTypes';
import { listNIMAccounts } from './k8s';
import { NIMAccountStatus, deriveAccountStatus, getAccountStatusTransitionTime } from './utils';
import { NIM_ACCOUNT_NAME, REVALIDATION_TIMEOUT_MS } from './constants';

export { NIMAccountStatus } from './utils';

type NIMAccountStatusResult = {
  status: NIMAccountStatus;
  nimAccount: NIMAccountKind | null;
  errorMessages: string[];
  loaded: boolean;
  refresh: () => Promise<NIMAccountKind | null | undefined>;
  startRevalidation: () => void;
};

const useNIMAccountStatus = (namespace: string): NIMAccountStatusResult => {
  const fetchCallback = React.useCallback<
    FetchStateCallbackPromise<NIMAccountKind | null>
  >(async () => {
    const accounts = await listNIMAccounts(namespace);
    return accounts.find((a) => a.metadata.name === NIM_ACCOUNT_NAME) ?? null;
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

  const derived = deriveAccountStatus(nimAccount, loaded);

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
