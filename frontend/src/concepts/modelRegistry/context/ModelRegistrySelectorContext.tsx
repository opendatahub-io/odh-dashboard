import * as React from 'react';
import { ServiceKind } from '~/k8sTypes';
import useModelRegistryEnabled from '~/concepts/modelRegistry/useModelRegistryEnabled';
import { useModelRegistryServices } from '~/concepts/modelRegistry/apiHooks/useModelRegistryServices';

export type ModelRegistrySelectorContextType = {
  modelRegistryServicesLoaded: boolean;
  modelRegistryServicesLoadError?: Error;
  modelRegistryServices: ServiceKind[];
  preferredModelRegistry: ServiceKind | undefined;
  updatePreferredModelRegistry: (modelRegistry: ServiceKind | undefined) => void;
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
  const [modelRegistryServices, isLoaded, error] = useModelRegistryServices();
  const [preferredModelRegistry, setPreferredModelRegistry] =
    React.useState<ModelRegistrySelectorContextType['preferredModelRegistry']>(undefined);

  const firstModelRegistry = modelRegistryServices.length > 0 ? modelRegistryServices[0] : null;

  return (
    <ModelRegistrySelectorContext.Provider
      value={React.useMemo(
        () => ({
          modelRegistryServicesLoaded: isLoaded,
          modelRegistryServicesLoadError: error,
          modelRegistryServices,
          preferredModelRegistry: preferredModelRegistry ?? firstModelRegistry ?? undefined,
          updatePreferredModelRegistry: setPreferredModelRegistry,
        }),
        [isLoaded, error, modelRegistryServices, preferredModelRegistry, firstModelRegistry],
      )}
    >
      {children}
    </ModelRegistrySelectorContext.Provider>
  );
};
