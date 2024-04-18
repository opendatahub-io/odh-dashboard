import * as React from 'react';
import { Alert, Bullseye } from '@patternfly/react-core';
import { SupportedArea, conditionalArea } from '~/concepts/areas';
import { MODEL_REGISTRY_DEFAULT_NAMESPACE } from '~/concepts/modelRegistry/const';
import useModelRegistryAPIState, { ModelRegistryAPIState } from './useModelRegistryAPIState';
import {
  hasServerTimedOut,
  isModelRegistryAvailable,
  useModelRegistryNamespaceCR,
} from './useModelRegistryNamespaceCR';

export type ModelRegistryContextType = {
  hasCR: boolean;
  crInitializing: boolean;
  serverTimedOut: boolean;
  apiState: ModelRegistryAPIState;
  ignoreTimedOut: () => void;
  refreshState: () => Promise<undefined>;
  refreshAPIState: () => void;
};

type ModelRegistryContextProviderProps = {
  children: React.ReactNode;
  modelRegistryName: string;
};

export const ModelRegistryContext = React.createContext<ModelRegistryContextType>({
  hasCR: false,
  crInitializing: false,
  serverTimedOut: false,
  apiState: { apiAvailable: false, api: null as unknown as ModelRegistryAPIState['api'] },
  ignoreTimedOut: () => undefined,
  refreshState: async () => undefined,
  refreshAPIState: () => undefined,
});

export const ModelRegistryContextProvider = conditionalArea<ModelRegistryContextProviderProps>(
  SupportedArea.MODEL_REGISTRY,
  true,
)(({ children, modelRegistryName }) => {
  const state = useModelRegistryNamespaceCR(MODEL_REGISTRY_DEFAULT_NAMESPACE, modelRegistryName);
  const [modelRegistryCR, crLoaded, crLoadError, refreshCR] = state;
  const isCRReady = isModelRegistryAvailable(state);

  const [disableTimeout, setDisableTimeout] = React.useState(false);
  const serverTimedOut = !disableTimeout && hasServerTimedOut(state, isCRReady);
  const ignoreTimedOut = React.useCallback(() => {
    setDisableTimeout(true);
  }, []);

  const hostPath = modelRegistryName ? `/api/service/modelregistry/${modelRegistryName}` : null;

  const [apiState, refreshAPIState] = useModelRegistryAPIState(hostPath);

  const refreshState = React.useCallback(
    () => Promise.all([refreshCR()]).then(() => undefined),
    [refreshCR],
  );

  if (crLoadError) {
    return (
      <Bullseye>
        <Alert title="Model registry load error" variant="danger" isInline>
          {crLoadError.message}
        </Alert>
      </Bullseye>
    );
  }

  return (
    <ModelRegistryContext.Provider
      value={{
        hasCR: !!modelRegistryCR,
        crInitializing: !crLoaded,
        serverTimedOut,
        apiState,
        ignoreTimedOut,
        refreshState,
        refreshAPIState,
      }}
    >
      {children}
    </ModelRegistryContext.Provider>
  );
});

type UseModelRegistryAPI = ModelRegistryAPIState & {
  refreshAllAPI: () => void;
};

export const useModelRegistryAPI = (): UseModelRegistryAPI => {
  const { apiState, refreshAPIState: refreshAllAPI } = React.useContext(ModelRegistryContext);

  return {
    refreshAllAPI,
    ...apiState,
  };
};
