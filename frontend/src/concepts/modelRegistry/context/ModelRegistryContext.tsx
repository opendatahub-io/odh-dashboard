import * as React from 'react';
import { SupportedArea, conditionalArea } from '~/concepts/areas';
import useModelRegistryAPIState, { ModelRegistryAPIState } from './useModelRegistryAPIState';

export type ModelRegistryContextType = {
  apiState: ModelRegistryAPIState;
  refreshAPIState: () => void;
};

type ModelRegistryContextProviderProps = {
  children: React.ReactNode;
  modelRegistryName: string;
};

export const ModelRegistryContext = React.createContext<ModelRegistryContextType>({
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  apiState: { apiAvailable: false, api: null as unknown as ModelRegistryAPIState['api'] },
  refreshAPIState: () => undefined,
});

export const ModelRegistryContextProvider = conditionalArea<ModelRegistryContextProviderProps>(
  SupportedArea.MODEL_REGISTRY,
  true,
)(({ children, modelRegistryName }) => {
  const hostPath = modelRegistryName ? `/api/service/modelregistry/${modelRegistryName}` : null;

  const [apiState, refreshAPIState] = useModelRegistryAPIState(hostPath);

  return (
    <ModelRegistryContext.Provider
      value={{
        apiState,
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
