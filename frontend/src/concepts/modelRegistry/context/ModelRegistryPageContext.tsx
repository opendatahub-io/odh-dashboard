import * as React from 'react';
import { SupportedArea, conditionalArea } from '~/concepts/areas';
import useModelRegistryAPIState, { ModelRegistryAPIState } from './useModelRegistryAPIState';

export type ModelRegistryPageContextType = {
  apiState: ModelRegistryAPIState;
  refreshAPIState: () => void;
};

type ModelRegistryPageContextProviderProps = {
  children: React.ReactNode;
  modelRegistryName: string | null;
};

export const ModelRegistryPageContext = React.createContext<ModelRegistryPageContextType>({
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  apiState: { apiAvailable: false, api: null as unknown as ModelRegistryAPIState['api'] },
  refreshAPIState: () => undefined,
});

export const ModelRegistryPageContextProvider =
  conditionalArea<ModelRegistryPageContextProviderProps>(
    SupportedArea.MODEL_REGISTRY,
    true,
  )(({ children, modelRegistryName }) => {
    const hostPath = modelRegistryName ? `/api/service/modelregistry/${modelRegistryName}` : null;

    const [apiState, refreshAPIState] = useModelRegistryAPIState(hostPath);

    return (
      <ModelRegistryPageContext.Provider
        value={{
          apiState,
          refreshAPIState,
        }}
      >
        {children}
      </ModelRegistryPageContext.Provider>
    );
  });

type UseModelRegistryAPI = ModelRegistryAPIState & {
  refreshAllAPI: () => void;
};

export const useModelRegistryAPI = (): UseModelRegistryAPI => {
  const { apiState, refreshAPIState: refreshAllAPI } = React.useContext(ModelRegistryPageContext);

  return {
    refreshAllAPI,
    ...apiState,
  };
};
