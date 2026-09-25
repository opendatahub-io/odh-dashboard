import React from 'react';
import {
  useApiKeysTableState,
  type UseApiKeysTableStateReturn,
} from '~/app/hooks/useApiKeysTableState';
import { useKeysAndSubsContext } from '~/app/context/KeysAndSubsContext';
import { UserSubscription } from '~/app/types/subscriptions';

export type UseApiKeysPageLoadReturn = UseApiKeysTableStateReturn & {
  isMaasAdmin: boolean;
  isMaasAdminLoaded: boolean;
  maxExpirationDays: number;
  apiKeyConfigLoaded: boolean;
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
    maxExpirationDays,
    apiKeyConfigLoaded,
    apiKeyConfigError,
    refresh,
    subscriptions,
  } = useKeysAndSubsContext();
  const tableState = useApiKeysTableState();

  const loadError = hasAnyApiKeysError ?? isMaasAdminError ?? tableState.error ?? apiKeyConfigError;

  const loaded =
    hasAnyApiKeysLoaded &&
    isMaasAdminLoaded &&
    tableState.loaded &&
    apiKeyConfigLoaded &&
    !loadError;

  const refreshAll = React.useCallback(() => {
    tableState.refresh();
    refresh();
  }, [tableState, refresh]);

  return {
    ...tableState,
    isMaasAdmin,
    isMaasAdminLoaded,
    maxExpirationDays,
    apiKeyConfigLoaded,
    loadError,
    loaded,
    hasAnyApiKeys,
    refreshAll,
    subscriptions,
  };
};
