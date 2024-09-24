import * as React from 'react';
import { ServiceKind } from '~/k8sTypes';
import useModelRegistryEnabled from '~/concepts/modelRegistry/useModelRegistryEnabled';
import { useModelRegistryServices } from '~/concepts/modelRegistry/apiHooks/useModelRegistryServices';
import { AreaContext } from '~/concepts/areas/AreaContext';

export type ModelRegistrySelectorContextType = {
  modelRegistryServicesLoaded: boolean;
  modelRegistryServicesLoadError?: Error;
  modelRegistryServices: ServiceKind[];
  preferredModelRegistry: ServiceKind | undefined;
  updatePreferredModelRegistry: (modelRegistry: ServiceKind | undefined) => void;
  refreshRulesReview: () => void;
};

type ModelRegistrySelectorContextProviderProps = {
  children: React.ReactNode;
};

export const ModelRegistrySelectorContext = React.createContext<ModelRegistrySelectorContextType>({
  modelRegistryServicesLoaded: false,
  modelRegistryServicesLoadError: undefined,
  modelRegistryServices: [],
  preferredModelRegistry: undefined,
  updatePreferredModelRegistry: () => undefined,
  refreshRulesReview: () => undefined,
});

export const ModelRegistrySelectorContextProvider: React.FC<
  ModelRegistrySelectorContextProviderProps
> = ({ children, ...props }) => {
  if (useModelRegistryEnabled()) {
    return (
      <EnabledModelRegistrySelectorContextProvider {...props}>
        {children}
      </EnabledModelRegistrySelectorContextProvider>
    );
  }
  return children;
};

const EnabledModelRegistrySelectorContextProvider: React.FC<
  ModelRegistrySelectorContextProviderProps
> = ({ children }) => {
  const { dscStatus } = React.useContext(AreaContext);
  const {
    modelRegistryServices = [],
    isLoaded,
    error,
    refreshRulesReview,
  } = useModelRegistryServices(dscStatus?.components?.modelregistry?.registriesNamespace || '');
  const [preferredModelRegistry, setPreferredModelRegistry] = React.useState<
    ServiceKind | undefined
  >(undefined);

  const contextValue = React.useMemo(
    () => ({
      modelRegistryServicesLoaded: isLoaded,
      modelRegistryServicesLoadError: error,
      modelRegistryServices,
      preferredModelRegistry: preferredModelRegistry ?? modelRegistryServices[0],
      updatePreferredModelRegistry: setPreferredModelRegistry,
      refreshRulesReview,
    }),
    [isLoaded, error, modelRegistryServices, preferredModelRegistry, refreshRulesReview],
  );

  return (
    <ModelRegistrySelectorContext.Provider value={contextValue}>
      {children}
    </ModelRegistrySelectorContext.Provider>
  );
};
