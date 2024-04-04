import * as React from 'react';
import { Alert, Bullseye } from '@patternfly/react-core';
import { SupportedArea, conditionalArea } from '~/concepts/areas';
import { MODEL_REGISTRY_DEFINITION_NAME } from '~/concepts/modelRegistry/const';
import { ModelRegistryKind } from '~/k8sTypes';
import useModelRegistries from '~/concepts/modelRegistry/apiHooks/useModelRegistries';
import useModelRegistryAPIState, { ModelRegistryAPIState } from './useModelRegistryAPIState';
import useModelRegistryAPIRoute from './useModelRegistryAPIRoute';
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
  modelRegistries: ModelRegistryKind[];
  preferredModelRegistry: ModelRegistryKind | undefined;
  updatePreferredModelRegistry: (modelRegistry: ModelRegistryKind | undefined) => void;
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
  modelRegistries: [],
  preferredModelRegistry: undefined,
  updatePreferredModelRegistry: () => undefined,
});

export const ModelRegistryContextProvider = conditionalArea<ModelRegistryContextProviderProps>(
  SupportedArea.MODEL_REGISTRY,
  true,
)(({ children, namespace }) => {
  const [modelRegistries] = useModelRegistries();
  const [preferredModelRegistry, setPreferredModelRegistry] =
    React.useState<ModelRegistryContextType['preferredModelRegistry']>(undefined);

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

  React.useEffect(() => {
    if (modelRegistries.length > 0 && !preferredModelRegistry) {
      setPreferredModelRegistry(modelRegistries[0]);
    }
  }, [modelRegistries, preferredModelRegistry]);

  const refreshState = React.useCallback(
    () => Promise.all([refreshCR(), refreshRoute()]).then(() => undefined),
    [refreshRoute, refreshCR],
  );

  const updatePreferredModelRegistry = React.useCallback<
    ModelRegistryContextType['updatePreferredModelRegistry']
  >((modelRegistry) => {
    setPreferredModelRegistry(modelRegistry);
  }, []);

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
        modelRegistries,
        preferredModelRegistry,
        updatePreferredModelRegistry,
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
