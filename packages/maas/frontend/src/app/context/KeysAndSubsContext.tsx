import { APIOptions, FetchStateCallbackPromise, POLL_INTERVAL, useFetchState } from 'mod-arch-core';
import React from 'react';
import { UserSubscription } from '~/app/types/subscriptions';
import { listUserSubscriptions } from '~/app/api/subscriptions';
import { getIsMaasAdmin } from '~/app/api/k8s';
import { searchApiKeys, searchTenantApiKeys } from '~/app/api/api-keys';
import { useApiKeyConfig } from '~/app/hooks/useApiKeyConfig';
import { useMaaSGatewayUrl } from '~/app/hooks/useMaaSGatewayUrl';
import useUser from '~/app/hooks/useUser';
import { useGridFeatureFlag } from '~/app/utilities/gridFeatureFlag';

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
  maxExpirationDays: number;
  apiKeyConfigLoaded: boolean;
  apiKeyConfigError: Error | undefined;
  gatewayUrl: string;
  gatewayUrlLoaded: boolean;
  gatewayUrlError: Error | undefined;
  refresh: () => void;
};

type KeysAndSubsProviderProps = {
  children: React.ReactNode;
};

export const KeysAndSubsProvider: React.FC<KeysAndSubsProviderProps> = ({ children }) => {
  const isGridEnabled = useGridFeatureFlag();
  const user = useUser();

  const subscriptionsCallback = React.useCallback<FetchStateCallbackPromise<UserSubscription[]>>(
    (opts: APIOptions) => listUserSubscriptions()(opts),
    [],
  );

  const isMaasAdminCallback = React.useCallback<FetchStateCallbackPromise<boolean>>(
    (opts: APIOptions) =>
      isGridEnabled
        ? Promise.resolve(Boolean(user.clusterAdmin))
        : getIsMaasAdmin()(opts).then((result) => result.allowed),
    [isGridEnabled, user.clusterAdmin],
  );

  const hasAnyApiKeysCallback = React.useCallback<FetchStateCallbackPromise<boolean>>(
    (opts: APIOptions) =>
      (isGridEnabled ? searchTenantApiKeys() : searchApiKeys())(opts, {
        pagination: { limit: 1 },
      }).then((result) => result.data.length > 0),
    [isGridEnabled],
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

  const [apiKeyConfig, apiKeyConfigLoaded, apiKeyConfigError, refreshApiKeyConfig] =
    useApiKeyConfig();

  const [gatewayUrl, gatewayUrlLoaded, gatewayUrlError, refreshGatewayUrl] = useMaaSGatewayUrl();

  const refresh = React.useCallback(() => {
    refreshSubscriptions();
    refreshIsMaasAdmin();
    refreshHasAnyApiKeys();
    refreshApiKeyConfig();
    refreshGatewayUrl();
  }, [
    refreshSubscriptions,
    refreshIsMaasAdmin,
    refreshHasAnyApiKeys,
    refreshApiKeyConfig,
    refreshGatewayUrl,
  ]);

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
      maxExpirationDays: apiKeyConfig.max_expiration_days,
      apiKeyConfigLoaded,
      apiKeyConfigError,
      gatewayUrl,
      gatewayUrlLoaded,
      gatewayUrlError,
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
      apiKeyConfig.max_expiration_days,
      apiKeyConfigLoaded,
      apiKeyConfigError,
      gatewayUrl,
      gatewayUrlLoaded,
      gatewayUrlError,
      refresh,
    ],
  );
  return <KeysAndSubsContext.Provider value={value}>{children}</KeysAndSubsContext.Provider>;
};

export const useKeysAndSubsContext = (): KeysAndSubsContextType =>
  React.useContext(KeysAndSubsContext);
