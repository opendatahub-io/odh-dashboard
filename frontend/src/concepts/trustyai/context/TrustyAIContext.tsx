import React from 'react';
import useTrustyAIAPIRoute from '~/concepts/trustyai/useTrustyAIAPIRoute';
import useTrustyAINamespaceCR, {
  isTrustyAIAvailable,
  taiHasServerTimedOut,
} from '~/concepts/trustyai/useTrustyAINamespaceCR';
import useTrustyAIAPIState, { TrustyAPIState } from '~/concepts/trustyai/useTrustyAIAPIState';
import { TrustyAIContextData } from '~/concepts/trustyai/context/types';
import { DEFAULT_CONTEXT_DATA } from '~/concepts/trustyai/context/const';
import useFetchContextData from '~/concepts/trustyai/context/useFetchContextData';

type TrustyAIContextProps = {
  namespace: string;
  hasCR: boolean;
  crInitializing: boolean;
  serverTimedOut: boolean;
  serviceLoadError?: Error;
  ignoreTimedOut: () => void;
  refreshState: () => Promise<undefined>;
  refreshAPIState: () => void;
  apiState: TrustyAPIState;
  data: TrustyAIContextData;
};

export const TrustyAIContext = React.createContext<TrustyAIContextProps>({
  namespace: '',
  hasCR: false,
  crInitializing: false,
  serverTimedOut: false,
  ignoreTimedOut: () => undefined,
  data: DEFAULT_CONTEXT_DATA,
  refreshState: async () => undefined,
  refreshAPIState: () => undefined,
  apiState: { apiAvailable: false, api: null as unknown as TrustyAPIState['api'] },
});

type TrustyAIContextProviderProps = {
  children: React.ReactNode;
  namespace: string;
};
export const TrustyAIContextProvider: React.FC<TrustyAIContextProviderProps> = ({
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

  const contextValue = React.useMemo(
    () => ({
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
    }),
    [
      namespace,
      explainabilityNamespaceCR,
      crLoaded,
      serverTimedOut,
      ignoreTimedOut,
      serviceLoadError,
      refreshState,
      refreshAPIState,
      apiState,
      data,
    ],
  );

  return <TrustyAIContext.Provider value={contextValue}>{children}</TrustyAIContext.Provider>;
};
