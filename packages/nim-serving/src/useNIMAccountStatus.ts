import React from 'react';
import { NIMAccountKind } from '@odh-dashboard/internal/k8sTypes';
import { listNIMAccounts } from '@odh-dashboard/internal/api/k8s/nimAccounts';
import { isAccountReady, getAccountErrors } from './nimK8sUtils';

export enum NIMAccountStatus {
  NOT_FOUND = 'NOT_FOUND',
  PENDING = 'PENDING',
  ERROR = 'ERROR',
  READY = 'READY',
}

const FAST_POLL_MS = 3000;
const SLOW_POLL_MS = 30000;

type NIMAccountStatusResult = {
  status: NIMAccountStatus;
  nimAccount: NIMAccountKind | undefined;
  errorMessages: string[];
  loaded: boolean;
  refresh: () => void;
};

const deriveStatus = (
  account: NIMAccountKind | undefined,
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
  const [nimAccount, setNimAccount] = React.useState<NIMAccountKind | undefined>();
  const [loaded, setLoaded] = React.useState(false);
  const [pollCounter, setPollCounter] = React.useState(0);
  const timerRef = React.useRef<ReturnType<typeof setTimeout>>();

  const refresh = React.useCallback(() => {
    setPollCounter((c) => c + 1);
  }, []);

  React.useEffect(() => {
    let cancelled = false;

    const fetchAccount = async () => {
      try {
        const accounts = await listNIMAccounts(namespace);
        if (!cancelled) {
          setNimAccount(accounts[0]);
          setLoaded(true);
        }
      } catch {
        if (!cancelled) {
          setNimAccount(undefined);
          setLoaded(true);
        }
      }
    };

    fetchAccount();

    return () => {
      cancelled = true;
    };
  }, [namespace, pollCounter]);

  const { status, errorMessages } = deriveStatus(nimAccount);

  React.useEffect(() => {
    if (!loaded) {
      return undefined;
    }
    const interval = status === NIMAccountStatus.PENDING ? FAST_POLL_MS : SLOW_POLL_MS;
    timerRef.current = setTimeout(() => {
      setPollCounter((c) => c + 1);
    }, interval);
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [loaded, status, pollCounter]);

  return { status, nimAccount, errorMessages, loaded, refresh };
};

export default useNIMAccountStatus;
