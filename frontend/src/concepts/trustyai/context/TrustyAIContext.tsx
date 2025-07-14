import React from 'react';
import useTrustyAINamespaceCR from '#~/concepts/trustyai/useTrustyAINamespaceCR';
import useTrustyAIAPIState, { TrustyAPIState } from '#~/concepts/trustyai/useTrustyAIAPIState';
import { TrustyAIContextData } from '#~/concepts/trustyai/context/types';
import { DEFAULT_TRUSTY_CONTEXT_DATA } from '#~/concepts/trustyai/context/const';
import useFetchContextData from '#~/concepts/trustyai/context/useFetchContextData';
import { getTrustyStatusState } from '#~/concepts/trustyai/utils';
import { TrustyInstallState, TrustyStatusStates } from '#~/concepts/trustyai/types';
import { useDeepCompareMemoize } from '#~/utilities/useDeepCompareMemoize';

type TrustyAIContextProps = {
  namespace: string;
  statusState: TrustyStatusStates;
  refreshState: () => Promise<undefined>;
  refreshAPIState: () => void;
  apiState: TrustyAPIState;
  data: TrustyAIContextData;
};

export const TrustyAIContext = React.createContext<TrustyAIContextProps>({
  namespace: '',
  statusState: { type: TrustyInstallState.LOADING_INITIAL_STATE },
  data: DEFAULT_TRUSTY_CONTEXT_DATA,
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
  const [trustyNamespaceCR, crLoaded, , refreshCR] = crState;
  const statusState = useDeepCompareMemoize(getTrustyStatusState(crState));

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
      statusState,
      refreshState,
      refreshAPIState,
      apiState,
      data,
    }),
    [
      namespace,
      trustyNamespaceCR,
      crLoaded,
      statusState,
      refreshState,
      refreshAPIState,
      apiState,
      data,
    ],
  );

  return <TrustyAIContext.Provider value={contextValue}>{children}</TrustyAIContext.Provider>;
};
