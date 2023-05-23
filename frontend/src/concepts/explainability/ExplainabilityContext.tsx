import React from 'react';
import { Outlet } from 'react-router-dom';
import useTrustyAPIRoute from '~/concepts/explainability/useTrustyAPIRoute';
import useTrustyAiNamespaceCR from '~/concepts/explainability/useTrustyAiNamespaceCR';
import { useDashboardNamespace } from '~/redux/selectors';
import useTrustyAPIState, { TrustyAPIState } from '~/concepts/explainability/useTrustyAPIState';
import { BiasMetricConfig } from '~/concepts/explainability/types';
import { formatListResponse } from '~/concepts/explainability/utils';
import useFetchState, {
  FetchState,
  FetchStateCallbackPromise,
  NotReadyError,
} from '~/utilities/useFetchState';

// TODO create component for ensuring API availability, see pipelines for example.

type ExplainabilityContextData = {
  refresh: () => Promise<void>;
  biasMetricConfigs: BiasMetricConfig[];
  loaded: boolean;
  error?: Error;
};

const defaultExplainabilityContextData: ExplainabilityContextData = {
  refresh: () => Promise.resolve(),
  biasMetricConfigs: [],
  loaded: false,
};

type ExplainabilityContextProps = {
  hasCR: boolean;
  crInitializing: boolean;
  serverTimedOut: boolean;
  ignoreTimedOut: () => void;
  refreshState: () => Promise<undefined>;
  refreshAPIState: () => void;
  apiState: TrustyAPIState;
  data: ExplainabilityContextData;
};

export const ExplainabilityContext = React.createContext<ExplainabilityContextProps>({
  hasCR: false,
  crInitializing: false,
  serverTimedOut: false,
  ignoreTimedOut: () => undefined,
  data: defaultExplainabilityContextData,
  refreshState: async () => undefined,
  refreshAPIState: () => undefined,
  apiState: { apiAvailable: false, api: null as unknown as TrustyAPIState['api'] },
});

export const ExplainabilityProvider: React.FC = () => {
  //TODO: when TrustyAI operator is ready, we will need to use the current DSProject namespace instead.
  const namespace = useDashboardNamespace().dashboardNamespace;

  const state = useTrustyAiNamespaceCR(namespace);
  //TODO handle CR loaded error - when TIA operator is ready
  const [explainabilityNamespaceCR, crLoaded, , refreshCR] = state;
  const isCRReady = crLoaded;
  //TODO: needs logic to handle server timeouts - when TIA operator is ready
  const serverTimedOut = false;
  const ignoreTimedOut = React.useCallback(() => true, []);

  //TODO handle routeLoadedError - when TIA operator is ready
  const [routeHost, routeLoaded, , refreshRoute] = useTrustyAPIRoute(isCRReady, namespace);

  const hostPath = routeLoaded && routeHost ? routeHost : null;

  const refreshState = React.useCallback(
    () => Promise.all([refreshCR(), refreshRoute()]).then(() => undefined),
    [refreshRoute, refreshCR],
  );

  const [apiState, refreshAPIState] = useTrustyAPIState(hostPath);

  const data = useFetchContextData(apiState);

  return (
    <ExplainabilityContext.Provider
      value={{
        hasCR: !!explainabilityNamespaceCR,
        crInitializing: !crLoaded,
        serverTimedOut,
        ignoreTimedOut,
        refreshState,
        refreshAPIState,
        apiState,
        data,
      }}
    >
      <Outlet />
    </ExplainabilityContext.Provider>
  );
};

//TODO handle errors.
const useFetchContextData = (apiState: TrustyAPIState): ExplainabilityContextData => {
  const [biasMetricConfigs, biasMetricConfigsLoaded, , refreshBiasMetricConfigs] =
    useFetchBiasMetricConfigs(apiState);

  const refresh = React.useCallback(
    () => Promise.all([refreshBiasMetricConfigs()]).then(() => undefined),
    [refreshBiasMetricConfigs],
  );

  const loaded = React.useMemo(() => biasMetricConfigsLoaded, [biasMetricConfigsLoaded]);

  return {
    biasMetricConfigs,
    refresh,
    loaded,
  };
};

const useFetchBiasMetricConfigs = (apiState: TrustyAPIState): FetchState<BiasMetricConfig[]> => {
  const callback = React.useCallback<FetchStateCallbackPromise<BiasMetricConfig[]>>(
    (opts) => {
      if (!apiState.apiAvailable) {
        return Promise.reject(new NotReadyError('API not yet available'));
      }
      return apiState.api
        .listRequests(opts)
        .then((r) => formatListResponse(r))
        .catch((e) => {
          throw e;
        });
    },
    [apiState.api, apiState.apiAvailable],
  );

  return useFetchState(callback, [], { initialPromisePurity: true });
};
