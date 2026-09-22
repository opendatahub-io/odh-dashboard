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
    hasAnyApiKeys,
    loaded: keysAndSubsLoaded,
    error,
    refresh,
    subscriptions,
  } = useKeysAndSubsContext();
  const tableState = useApiKeysTableState();

  const loadError = error ?? tableState.error;

  const loaded = keysAndSubsLoaded && tableState.loaded && !loadError;

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
