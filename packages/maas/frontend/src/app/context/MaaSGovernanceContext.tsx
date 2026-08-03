import * as React from 'react';
import {
  POLL_INTERVAL,
  useFetchState,
  type APIOptions,
  type FetchStateCallbackPromise,
} from 'mod-arch-core';
import { listAllGroups, listAllMaasModels, listSubscriptions } from '~/app/api/subscriptions';
import { listAuthPolicies } from '~/app/api/auth-policies';
import type {
  MaaSAuthPolicy,
  MaaSModelRefSummary,
  MaaSSubscription,
  ModelOverviewItem,
} from '~/app/types/subscriptions';
import { buildOverviewRows } from '~/app/utilities/buildOverviewRows';

type MaaSGovernanceContextType = {
  subscriptions: MaaSSubscription[];
  policies: MaaSAuthPolicy[];
  modelRefs: MaaSModelRefSummary[];
  groups: string[];
  overviewRows: ModelOverviewItem[];
  /** True when models, subscriptions, and policies are all loaded and empty — hides tabs. */
  isEmpty: boolean;
  /** All four base fetches have completed (create/edit pages). */
  loaded: boolean;
  subscriptionsLoaded: boolean;
  policiesLoaded: boolean;
  modelRefsLoaded: boolean;
  groupsLoaded: boolean;
  /** Models + subscriptions + policies loaded (overview join). */
  overviewLoaded: boolean;
  error: Error | undefined;
  /** Overview-only errors (excludes groups — LDAP failures must not block overview). */
  overviewError: Error | undefined;
  subscriptionsError: Error | undefined;
  policiesError: Error | undefined;
  modelRefsError: Error | undefined;
  groupsError: Error | undefined;
  refresh: () => void;
};

// eslint-disable-next-line @typescript-eslint/consistent-type-assertions
export const MaaSGovernanceContext = React.createContext({} as MaaSGovernanceContextType);

type MaaSGovernanceProviderProps = {
  children: React.ReactNode;
};

export const MaaSGovernanceProvider: React.FC<MaaSGovernanceProviderProps> = ({ children }) => {
  const subscriptionsCallback = React.useCallback<FetchStateCallbackPromise<MaaSSubscription[]>>(
    (opts: APIOptions) => listSubscriptions()(opts),
    [],
  );
  const policiesCallback = React.useCallback<FetchStateCallbackPromise<MaaSAuthPolicy[]>>(
    (opts: APIOptions) => listAuthPolicies()(opts),
    [],
  );
  const modelRefsCallback = React.useCallback<FetchStateCallbackPromise<MaaSModelRefSummary[]>>(
    (opts: APIOptions) => listAllMaasModels()(opts),
    [],
  );
  const groupsCallback = React.useCallback<FetchStateCallbackPromise<string[]>>(
    (opts: APIOptions) => listAllGroups()(opts),
    [],
  );

  const [subscriptions, subscriptionsLoaded, subscriptionsError, refreshSubscriptions] =
    useFetchState(subscriptionsCallback, [], { refreshRate: POLL_INTERVAL });
  const [policies, policiesLoaded, policiesError, refreshPolicies] = useFetchState(
    policiesCallback,
    [],
    { refreshRate: POLL_INTERVAL },
  );
  const [modelRefs, modelRefsLoaded, modelRefsError, refreshModelRefs] = useFetchState(
    modelRefsCallback,
    [],
    { refreshRate: POLL_INTERVAL },
  );
  const [groups, groupsLoaded, groupsError, refreshGroups] = useFetchState(groupsCallback, [], {
    refreshRate: POLL_INTERVAL,
  });

  const overviewLoaded = modelRefsLoaded && subscriptionsLoaded && policiesLoaded;
  const loaded = overviewLoaded && groupsLoaded;

  const overviewRows = React.useMemo(
    () => (overviewLoaded ? buildOverviewRows(modelRefs, subscriptions, policies) : []),
    [overviewLoaded, modelRefs, subscriptions, policies],
  );

  const isEmpty =
    overviewLoaded && subscriptions.length === 0 && policies.length === 0 && modelRefs.length === 0;

  const overviewError = subscriptionsError || policiesError || modelRefsError || undefined;
  const error = overviewError || groupsError || undefined;

  const refresh = React.useCallback(() => {
    refreshSubscriptions();
    refreshPolicies();
    refreshModelRefs();
    refreshGroups();
  }, [refreshSubscriptions, refreshPolicies, refreshModelRefs, refreshGroups]);

  const value = React.useMemo(
    () => ({
      subscriptions,
      policies,
      modelRefs,
      groups,
      overviewRows,
      isEmpty,
      loaded,
      subscriptionsLoaded,
      policiesLoaded,
      modelRefsLoaded,
      groupsLoaded,
      overviewLoaded,
      error,
      overviewError,
      subscriptionsError,
      policiesError,
      modelRefsError,
      groupsError,
      refresh,
    }),
    [
      subscriptions,
      policies,
      modelRefs,
      groups,
      overviewRows,
      isEmpty,
      loaded,
      subscriptionsLoaded,
      policiesLoaded,
      modelRefsLoaded,
      groupsLoaded,
      overviewLoaded,
      error,
      overviewError,
      subscriptionsError,
      policiesError,
      modelRefsError,
      groupsError,
      refresh,
    ],
  );

  return <MaaSGovernanceContext.Provider value={value}>{children}</MaaSGovernanceContext.Provider>;
};

export const useMaaSGovernanceContext = (): MaaSGovernanceContextType =>
  React.useContext(MaaSGovernanceContext);
