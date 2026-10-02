import React from 'react';
import {
  useApiKeysTableState,
  type UseApiKeysTableStateReturn,
} from '~/app/hooks/useApiKeysTableState';
import { useKeysAndSubsContext } from '~/app/context/KeysAndSubsContext';
import { UserSubscription } from '~/app/types/subscriptions';

export type UseApiKeysPageLoadReturn = UseApiKeysTableStateReturn & {
  isMaasAdmin: boolean;
  loadError: Error | undefined;
  loaded: boolean;
  hasAnyApiKeys: boolean;
  subscriptions: UserSubscription[];
  refreshAll: () => void;
};

export const useApiKeysPageLoad = (): UseApiKeysPageLoadReturn => {
  const {
    isMaasAdmin,
    isMaasAdminLoaded,
    isMaasAdminError,
    hasAnyApiKeys,
    hasAnyApiKeysLoaded,
    hasAnyApiKeysError,
    statusSubscriptionDetailsLoaded,
    statusSubscriptionDetailsError,
    refresh,
    subscriptions,
  } = useKeysAndSubsContext();
  const tableState = useApiKeysTableState();

  const loadError =
    hasAnyApiKeysError ?? isMaasAdminError ?? statusSubscriptionDetailsError ?? tableState.error;

  const loaded =
    hasAnyApiKeysLoaded &&
    isMaasAdminLoaded &&
    statusSubscriptionDetailsLoaded &&
    tableState.loaded &&
    !loadError;

  const refreshAll = React.useCallback(() => {
    tableState.refresh();
    refresh();
  }, [tableState, refresh]);

  return {
    ...tableState,
    isMaasAdmin,
    loadError,
    loaded,
    hasAnyApiKeys,
    refreshAll,
    subscriptions,
  };
};
