import * as React from 'react';
import { ServiceKind } from '#~/k8sTypes';
import useModelRegistryEnabled from '#~/concepts/modelRegistry/useModelRegistryEnabled';
import { useModelRegistryServices } from '#~/concepts/modelRegistry/apiHooks/useModelRegistryServices';
import { AreaContext } from '#~/concepts/areas/AreaContext';

export interface ModelRegistriesContextType {
  modelRegistryServicesLoaded: boolean;
  modelRegistryServicesLoadError?: Error;
  modelRegistryServices: ServiceKind[];
  preferredModelRegistry: ServiceKind | null;
  updatePreferredModelRegistry: (modelRegistry: ServiceKind | undefined) => void;
  refreshRulesReview: () => void;
}

type ModelRegistriesContextProviderProps = {
  children: React.ReactNode;
};

export const ModelRegistriesContext = React.createContext<ModelRegistriesContextType>({
  modelRegistryServicesLoaded: false,
  modelRegistryServicesLoadError: undefined,
  modelRegistryServices: [],
  preferredModelRegistry: null,
  updatePreferredModelRegistry: () => undefined,
  refreshRulesReview: () => undefined,
});

export const ModelRegistriesContextProvider: React.FC<ModelRegistriesContextProviderProps> = ({
  children,
  ...props
}) => {
  if (useModelRegistryEnabled()) {
    return (
      <EnabledModelRegistriesContextProvider {...props}>
        {children}
      </EnabledModelRegistriesContextProvider>
    );
  }
  return children;
};

const EnabledModelRegistriesContextProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const { dscStatus } = React.useContext(AreaContext);
  const modelRegistryNamespace = dscStatus?.components?.modelregistry?.registriesNamespace;
  const [preferredModelRegistry, setPreferredModelRegistry] = React.useState<ServiceKind | null>(
    null,
  );

  const updatePreferredModelRegistry = React.useCallback(
    (modelRegistry: ServiceKind | undefined) => {
      setPreferredModelRegistry(modelRegistry || null);
    },
    [],
  );

  const {
    modelRegistryServices = [],
    isLoaded,
    error: servicesError,
    refreshRulesReview,
  } = useModelRegistryServices(modelRegistryNamespace);

  const contextValue = React.useMemo(() => {
    const error = !modelRegistryNamespace
      ? new Error('No registries namespace could be found')
      : servicesError;

    return {
      modelRegistryServicesLoaded: isLoaded,
      modelRegistryServicesLoadError: error,
      modelRegistryServices,
      preferredModelRegistry: preferredModelRegistry ?? modelRegistryServices[0],
      updatePreferredModelRegistry,
      refreshRulesReview,
    };
  }, [
    isLoaded,
    servicesError,
    modelRegistryServices,
    preferredModelRegistry,
    updatePreferredModelRegistry,
    refreshRulesReview,
    modelRegistryNamespace,
  ]);

  return (
    <ModelRegistriesContext.Provider value={contextValue}>
      {children}
    </ModelRegistriesContext.Provider>
  );
};
