import { APIOptions, FetchStateCallbackPromise, POLL_INTERVAL, useFetchState } from 'mod-arch-core';
import React from 'react';
import { UserSubscription } from '~/app/types/subscriptions';
import { listUserSubscriptions } from '~/app/api/subscriptions';
import { getIsMaasAdmin } from '~/app/api/k8s';
import { searchApiKeys } from '~/app/api/api-keys';

// eslint-disable-next-line @typescript-eslint/consistent-type-assertions
export const KeysAndSubsContext = React.createContext({} as KeysAndSubsContextType);

type KeysAndSubsContextType = {
  subscriptions: UserSubscription[];
  subscriptionsLoaded: boolean;
  subscriptionsError: Error | undefined;
  isMaasAdmin: boolean;
  isMaasAdminLoaded: boolean;
  isMaasAdminError: Error | undefined;
  hasAnyApiKeys: boolean; // from a single existence-check search (limit 1)
  hasAnyApiKeysLoaded: boolean;
  hasAnyApiKeysError: Error | undefined;
  refresh: () => void;
};

type KeysAndSubsProviderProps = {
  children: React.ReactNode;
};

export const KeysAndSubsProvider: React.FC<KeysAndSubsProviderProps> = ({ children }) => {
  const subscriptionsCallback = React.useCallback<FetchStateCallbackPromise<UserSubscription[]>>(
    (opts: APIOptions) => listUserSubscriptions()(opts),
    [],
  );

  const isMaasAdminCallback = React.useCallback<FetchStateCallbackPromise<boolean>>(
    (opts: APIOptions) => getIsMaasAdmin()(opts).then((result) => result.allowed),
    [],
  );

  const hasAnyApiKeysCallback = React.useCallback<FetchStateCallbackPromise<boolean>>(
    (opts: APIOptions) =>
      searchApiKeys()(opts, { pagination: { limit: 1 } }).then((result) => result.data.length > 0),
    [],
  );

  const [subscriptions, subscriptionsLoaded, subscriptionsError, refreshSubscriptions] =
    useFetchState(subscriptionsCallback, [], { refreshRate: POLL_INTERVAL });

  const [isMaasAdmin, isMaasAdminLoaded, isMaasAdminError, refreshIsMaasAdmin] = useFetchState(
    isMaasAdminCallback,
    false,
    { refreshRate: POLL_INTERVAL },
  );

  const [hasAnyApiKeys, hasAnyApiKeysLoaded, hasAnyApiKeysError, refreshHasAnyApiKeys] =
    useFetchState(hasAnyApiKeysCallback, false, { refreshRate: POLL_INTERVAL });

  const refresh = React.useCallback(() => {
    refreshSubscriptions();
    refreshIsMaasAdmin();
    refreshHasAnyApiKeys();
  }, [refreshSubscriptions, refreshIsMaasAdmin, refreshHasAnyApiKeys]);

  const value = React.useMemo(
    () => ({
      subscriptions,
      subscriptionsLoaded,
      subscriptionsError,
      isMaasAdmin,
      isMaasAdminLoaded,
      isMaasAdminError,
      hasAnyApiKeys,
      hasAnyApiKeysLoaded,
      hasAnyApiKeysError,
      refresh,
    }),
    [
      subscriptions,
      subscriptionsLoaded,
      subscriptionsError,
      isMaasAdmin,
      isMaasAdminLoaded,
      isMaasAdminError,
      hasAnyApiKeys,
      hasAnyApiKeysLoaded,
      hasAnyApiKeysError,
      refresh,
    ],
  );
  return <KeysAndSubsContext.Provider value={value}>{children}</KeysAndSubsContext.Provider>;
};

export const useKeysAndSubsContext = (): KeysAndSubsContextType =>
  React.useContext(KeysAndSubsContext);
