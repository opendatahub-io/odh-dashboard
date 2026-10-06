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
  apiKeyConfigError: Error | undefined;
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
    statusSubscriptionDetailsLoaded,
    statusSubscriptionDetailsError,
    refresh,
    subscriptions,
  } = useKeysAndSubsContext();
  const tableState = useApiKeysTableState();

  // Config failures must not block listing/revoking; the create modal surfaces them.
  // Do not wait on api-key config — it is only needed when creating a key.
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
    isMaasAdminLoaded,
    maxExpirationDays,
    apiKeyConfigLoaded,
    apiKeyConfigError,
    loadError,
    loaded,
    hasAnyApiKeys,
    refreshAll,
    subscriptions,
  };
};
