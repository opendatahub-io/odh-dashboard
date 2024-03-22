import * as React from 'react';
import { Alert, Bullseye } from '@patternfly/react-core';
import { SupportedArea, conditionalArea } from '~/concepts/areas';
import { MODEL_REGISTRY_DEFINITION_NAME } from '~/concepts/modelRegistry/const';
import useModelRegistryAPIState, { ModelRegistryAPIState } from './useModelRegistryAPIState';
import useModelRegistryAPIRoute from './useModelRegistryAPIRoute';
import {
  hasServerTimedOut,
  isModelRegistryAvailable,
  useModelRegistryNamespaceCR,
} from './useModelRegistryNamespaceCR';

type ModelRegistryContextType = {
  hasCR: boolean;
  crInitializing: boolean;
  serverTimedOut: boolean;
  apiState: ModelRegistryAPIState;
  ignoreTimedOut: () => void;
  refreshState: () => Promise<undefined>;
  refreshAPIState: () => void;
  // TODO dpanshug: add model registry when it's available from backend
  // modelRegistry: any;
  // preferredModelRegistry: any;
};

type ModelRegistryContextProviderProps = {
  children: React.ReactNode;
  namespace: string;
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
)(({ children, namespace }) => {
  const crState = useModelRegistryNamespaceCR(namespace, MODEL_REGISTRY_DEFINITION_NAME); // TODO: dynamially change the model registry name
  const [modelRegistryNamespaceCR, crLoaded, crLoadError, refreshCR] = crState;
  const isCRReady = isModelRegistryAvailable(crState);

  const [disableTimeout, setDisableTimeout] = React.useState(false);
  const serverTimedOut = !disableTimeout && hasServerTimedOut(crState, isCRReady);
  const ignoreTimedOut = React.useCallback(() => {
    setDisableTimeout(true);
  }, []);

  const [routeHost, routeLoaded, routeLoadError, refreshRoute] = useModelRegistryAPIRoute(
    isCRReady,
    MODEL_REGISTRY_DEFINITION_NAME,
    namespace,
  );

  const hostPath = routeLoaded && routeHost ? routeHost : null;

  const [apiState, refreshAPIState] = useModelRegistryAPIState(hostPath);

  const refreshState = React.useCallback(
    () => Promise.all([refreshCR(), refreshRoute()]).then(() => undefined),
    [refreshRoute, refreshCR],
  );

  const error = crLoadError || routeLoadError;
  if (error) {
    return (
      <Bullseye>
        <Alert title="Model registry load error" variant="danger" isInline>
          {error.message}
        </Alert>
      </Bullseye>
    );
  }

  return (
    <ModelRegistryContext.Provider
      value={{
        hasCR: !!modelRegistryNamespaceCR,
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
