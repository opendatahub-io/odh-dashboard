import React from 'react';
import { NIMAccountKind } from '@odh-dashboard/internal/k8sTypes';
import { useWatchNIMAccounts } from './watch';
import { NIMAccountStatus, deriveAccountStatus, getAccountStatusTransitionTime } from './utils';
import { NIM_ACCOUNT_NAME, REVALIDATION_TIMEOUT_MS } from './constants';

export { NIMAccountStatus } from './utils';

type NIMAccountStatusResult = {
  status: NIMAccountStatus;
  nimAccount: NIMAccountKind | null;
  errorMessages: string[];
  loaded: boolean;
  startRevalidation: () => void;
};

const useNIMAccountStatus = (namespace?: string): NIMAccountStatusResult => {
  const [accounts, loaded] = useWatchNIMAccounts(namespace);

  const nimAccount = React.useMemo(
    () => accounts.find((a) => a.metadata.name === NIM_ACCOUNT_NAME) ?? null,
    [accounts],
  );

  const [revalidationState, setRevalidationState] = React.useState<{
    transitionTimeAtStart: string | undefined;
    startedAt: number;
  } | null>(null);

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
    startRevalidation,
  };
};

export default useNIMAccountStatus;
