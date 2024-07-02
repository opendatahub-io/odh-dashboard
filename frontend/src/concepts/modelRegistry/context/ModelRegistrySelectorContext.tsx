import * as React from 'react';
import { ModelRegistryKind } from '~/k8sTypes';
import useModelRegistries from '~/concepts/modelRegistry/apiHooks/useModelRegistries';
import useModelRegistryEnabled from '~/concepts/modelRegistry/useModelRegistryEnabled';

export type ModelRegistrySelectorContextType = {
  modelRegistriesLoaded: boolean;
  modelRegistriesLoadError?: Error;
  modelRegistries: ModelRegistryKind[];
  preferredModelRegistry: ModelRegistryKind | undefined;
  updatePreferredModelRegistry: (modelRegistry: ModelRegistryKind | undefined) => void;
};

type ModelRegistrySelectorContextProviderProps = {
  children: React.ReactNode;
};

export const ModelRegistrySelectorContext = React.createContext<ModelRegistrySelectorContextType>({
  modelRegistriesLoaded: false,
  modelRegistriesLoadError: undefined,
  modelRegistries: [],
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
  const [modelRegistries, isLoaded, error] = useModelRegistries();
  const [preferredModelRegistry, setPreferredModelRegistry] =
    React.useState<ModelRegistrySelectorContextType['preferredModelRegistry']>(undefined);

  const firstModelRegistry = modelRegistries.length > 0 ? modelRegistries[0] : null;

  return (
    <ModelRegistrySelectorContext.Provider
      value={React.useMemo(
        () => ({
          modelRegistriesLoaded: isLoaded,
          modelRegistriesLoadError: error,
          modelRegistries,
          preferredModelRegistry: preferredModelRegistry ?? firstModelRegistry ?? undefined,
          updatePreferredModelRegistry: setPreferredModelRegistry,
        }),
        [isLoaded, error, modelRegistries, preferredModelRegistry, firstModelRegistry],
      )}
    >
      {children}
    </ModelRegistrySelectorContext.Provider>
  );
};
