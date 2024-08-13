import React from 'react';
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
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
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
  const [trustyNamespaceCR, crLoaded, crLoadError, refreshCR] = crState;
  const isCRReady = isTrustyAIAvailable(crState);
  const [disableTimeout, setDisableTimeout] = React.useState(false);
  const serverTimedOut = !disableTimeout && taiHasServerTimedOut(crState, isCRReady);
  const ignoreTimedOut = React.useCallback(() => {
    setDisableTimeout(true);
  }, []);

  const taisName = trustyNamespaceCR?.metadata.name;

  const hostPath = namespace && taisName ? `/api/service/trustyai/${namespace}/${taisName}` : null;

  const refreshState = React.useCallback(() => refreshCR().then(() => undefined), [refreshCR]);

  const [apiState, refreshAPIState] = useTrustyAIAPIState(hostPath);

  const data = useFetchContextData(apiState);

  const contextValue = React.useMemo(
    () => ({
      namespace,
      hasCR: !!trustyNamespaceCR,
      crInitializing: !crLoaded,
      serverTimedOut,
      ignoreTimedOut,
      crLoadError,
      refreshState,
      refreshAPIState,
      apiState,
      data,
    }),
    [
      namespace,
      trustyNamespaceCR,
      crLoaded,
      serverTimedOut,
      ignoreTimedOut,
      crLoadError,
      refreshState,
      refreshAPIState,
      apiState,
      data,
    ],
  );

  return <TrustyAIContext.Provider value={contextValue}>{children}</TrustyAIContext.Provider>;
};
