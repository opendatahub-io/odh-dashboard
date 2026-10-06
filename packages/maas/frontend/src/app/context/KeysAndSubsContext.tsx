import { APIOptions, FetchStateCallbackPromise, POLL_INTERVAL, useFetchState } from 'mod-arch-core';
import React from 'react';
import { UserSubscription } from '~/app/types/subscriptions';
import { listSubscriptions, listUserSubscriptions } from '~/app/api/subscriptions';
import { getIsMaasAdmin } from '~/app/api/k8s';
import { searchApiKeys } from '~/app/api/api-keys';
import type { SubscriptionDetail } from '~/app/types/api-key';
import {
  subscriptionDetailsFromMaaSSubscriptions,
  subscriptionDetailsFromUserSubscriptions,
} from '~/app/utilities/apiKeys';
import { useApiKeyConfig } from '~/app/hooks/useApiKeyConfig';

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
  /**
   * Subscription existence map for API key active/inactive + row enrichment.
   * Admin: GET /all-subscriptions (K8s). Non-admin: same as `subscriptions` (MaaS API).
   */
  statusSubscriptionDetails: Record<string, SubscriptionDetail> | undefined;
  statusSubscriptionDetailsLoaded: boolean;
  statusSubscriptionDetailsError: Error | undefined;
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

  const [apiKeyConfig, apiKeyConfigLoaded, apiKeyConfigError, refreshApiKeyConfig] =
    useApiKeyConfig();

  // Admin: all K8s subscriptions. Non-admin: MaaS /subscriptions (same scope as create-key list).
  // Resolves admin itself so we never classify inactive against an empty/stale map.
  const statusSubscriptionDetailsCallback = React.useCallback<
    FetchStateCallbackPromise<Record<string, SubscriptionDetail>>
  >(async (opts: APIOptions) => {
    const { allowed } = await getIsMaasAdmin()(opts);
    if (allowed) {
      const allSubs = await listSubscriptions()(opts);
      return subscriptionDetailsFromMaaSSubscriptions(allSubs);
    }
    const userSubs = await listUserSubscriptions()(opts);
    return subscriptionDetailsFromUserSubscriptions(userSubs);
  }, []);

  const [
    statusSubscriptionDetails,
    statusSubscriptionDetailsLoaded,
    statusSubscriptionDetailsError,
    refreshStatusSubscriptionDetails,
  ] = useFetchState(statusSubscriptionDetailsCallback, {}, { refreshRate: POLL_INTERVAL });

  const refresh = React.useCallback(() => {
    refreshSubscriptions();
    refreshIsMaasAdmin();
    refreshHasAnyApiKeys();
    refreshApiKeyConfig();
    refreshStatusSubscriptionDetails();
  }, [
    refreshSubscriptions,
    refreshIsMaasAdmin,
    refreshHasAnyApiKeys, refreshApiKeyConfig,
    refreshStatusSubscriptionDetails,
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
      statusSubscriptionDetails: statusSubscriptionDetailsLoaded
        ? statusSubscriptionDetails
        : undefined,
      statusSubscriptionDetailsLoaded,
      statusSubscriptionDetailsError,
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
      statusSubscriptionDetails,
      statusSubscriptionDetailsLoaded,
      statusSubscriptionDetailsError,
      refresh,
    ],
  );
  return <KeysAndSubsContext.Provider value={value}>{children}</KeysAndSubsContext.Provider>;
};

export const useKeysAndSubsContext = (): KeysAndSubsContextType =>
  React.useContext(KeysAndSubsContext);
