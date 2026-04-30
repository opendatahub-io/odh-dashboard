import React from 'react';
import { NIMAccountKind } from '@odh-dashboard/internal/k8sTypes';
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

type NIMAccountStatusResult = {
  status: NIMAccountStatus;
  nimAccount: NIMAccountKind | null;
  errorMessages: string[];
  loaded: boolean;
  refresh: () => Promise<NIMAccountKind | null | undefined>;
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

const useNIMAccountStatus = (namespace: string): NIMAccountStatusResult => {
  const fetchCallback = React.useCallback<
    FetchStateCallbackPromise<NIMAccountKind | null>
  >(async () => {
    const accounts = await listNIMAccounts(namespace);
    return accounts[0] ?? null;
  }, [namespace]);

  const { status, errorMessages } = deriveStatus(null);
  const [pollRate, setPollRate] = React.useState(POLL_INTERVAL);

  const {
    data: nimAccount,
    loaded,
    refresh,
  } = useFetch(fetchCallback, null, {
    refreshRate: pollRate,
  });

  const derived = loaded ? deriveStatus(nimAccount) : { status, errorMessages };

  React.useEffect(() => {
    setPollRate(derived.status === NIMAccountStatus.PENDING ? FAST_POLL_INTERVAL : POLL_INTERVAL);
  }, [derived.status]);

  return {
    status: derived.status,
    nimAccount,
    errorMessages: derived.errorMessages,
    loaded,
    refresh,
  };
};

export default useNIMAccountStatus;
