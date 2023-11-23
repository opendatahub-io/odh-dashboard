import React from 'react';
import useTrustyAIAPIRoute from '~/concepts/explainability/useTrustyAIAPIRoute';
import useTrustyAINamespaceCR, {
  taiHasServerTimedOut,
  isTrustyAIAvailable,
} from '~/concepts/explainability/useTrustyAINamespaceCR';
import useTrustyAIAPIState, { TrustyAPIState } from '~/concepts/explainability/useTrustyAIAPIState';
import { BiasMetricConfig } from '~/concepts/explainability/types';
import { formatListResponse } from '~/concepts/explainability/utils';
import useFetchState, {
  FetchState,
  FetchStateCallbackPromise,
  NotReadyError,
} from '~/utilities/useFetchState';
import { SupportedArea, useIsAreaAvailable } from '~/concepts/areas';

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
  namespace: string;
  hasCR: boolean;
  crInitializing: boolean;
  serverTimedOut: boolean;
  serviceLoadError?: Error;
  ignoreTimedOut: () => void;
  refreshState: () => Promise<undefined>;
  refreshAPIState: () => void;
  apiState: TrustyAPIState;
  data: ExplainabilityContextData;
};

export const ExplainabilityContext = React.createContext<ExplainabilityContextProps>({
  namespace: '',
  hasCR: false,
  crInitializing: false,
  serverTimedOut: false,
  ignoreTimedOut: () => undefined,
  data: defaultExplainabilityContextData,
  refreshState: async () => undefined,
  refreshAPIState: () => undefined,
  apiState: { apiAvailable: false, api: null as unknown as TrustyAPIState['api'] },
});

type ExplainabilityContextProviderProps = {
  children: React.ReactNode;
  namespace: string;
};
export const ExplainabilityContextProvider: React.FC<ExplainabilityContextProviderProps> = ({
  children,
  namespace,
}) => {
  const crState = useTrustyAINamespaceCR(namespace);
  const [explainabilityNamespaceCR, crLoaded, crLoadError, refreshCR] = crState;
  const isCRReady = isTrustyAIAvailable(crState);
  const [disableTimeout, setDisableTimeout] = React.useState(false);
  const serverTimedOut = !disableTimeout && taiHasServerTimedOut(crState, isCRReady);
  const ignoreTimedOut = React.useCallback(() => {
    setDisableTimeout(true);
  }, []);

  const [routeHost, routeLoaded, routeLoadError, refreshRoute] = useTrustyAIAPIRoute(
    isCRReady,
    namespace,
  );

  const hostPath = routeLoaded && routeHost ? routeHost : null;

  const refreshState = React.useCallback(
    () => Promise.all([refreshCR(), refreshRoute()]).then(() => undefined),
    [refreshRoute, refreshCR],
  );

  const serviceLoadError = crLoadError || routeLoadError;

  const [apiState, refreshAPIState] = useTrustyAIAPIState(hostPath);

  const data = useFetchContextData(apiState);

  return (
    <ExplainabilityContext.Provider
      value={{
        namespace,
        hasCR: !!explainabilityNamespaceCR,
        crInitializing: !crLoaded,
        serverTimedOut,
        ignoreTimedOut,
        serviceLoadError,
        refreshState,
        refreshAPIState,
        apiState,
        data,
      }}
    >
      {children}
    </ExplainabilityContext.Provider>
  );
};

const useFetchContextData = (apiState: TrustyAPIState): ExplainabilityContextData => {
  const [biasMetricConfigs, biasMetricConfigsLoaded, error, refreshBiasMetricConfigs] =
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
    error,
  };
};

const useFetchBiasMetricConfigs = (apiState: TrustyAPIState): FetchState<BiasMetricConfig[]> => {
  const biasMetricsAreaAvailable = useIsAreaAvailable(SupportedArea.BIAS_METRICS).status;

  const callback = React.useCallback<FetchStateCallbackPromise<BiasMetricConfig[]>>(
    (opts) => {
      if (!biasMetricsAreaAvailable) {
        return Promise.reject(new NotReadyError('Bias metrics is not enabled'));
      }
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
    [apiState.api, apiState.apiAvailable, biasMetricsAreaAvailable],
  );

  return useFetchState(callback, [], { initialPromisePurity: true });
};
