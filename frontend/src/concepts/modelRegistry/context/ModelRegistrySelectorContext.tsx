import * as React from 'react';
import { Alert, Bullseye } from '@patternfly/react-core';
import { SupportedArea, conditionalArea } from '~/concepts/areas';
import { ModelRegistryKind } from '~/k8sTypes';
import useModelRegistries from '~/concepts/modelRegistry/apiHooks/useModelRegistries';

export type ModelRegistrySelectorContextType = {
  modelRegistries: ModelRegistryKind[];
  preferredModelRegistry: ModelRegistryKind | undefined;
  updatePreferredModelRegistry: (modelRegistry: ModelRegistryKind | undefined) => void;
};

type ModelRegistrySelectorContextProviderProps = {
  children: React.ReactNode;
};

export const ModelRegistrySelectorContext = React.createContext<ModelRegistrySelectorContextType>({
  modelRegistries: [],
  preferredModelRegistry: undefined,
  updatePreferredModelRegistry: () => undefined,
});

export const ModelRegistrySelectorContextProvider =
  conditionalArea<ModelRegistrySelectorContextProviderProps>(
    SupportedArea.MODEL_REGISTRY,
    true,
  )(({ children }) => {
    const [modelRegistries, isLoaded, error] = useModelRegistries();
    const [preferredModelRegistry, setPreferredModelRegistry] =
      React.useState<ModelRegistrySelectorContextType['preferredModelRegistry']>(undefined);

    const firstModelRegistry = modelRegistries.length > 0 ? modelRegistries[0] : null;

    React.useEffect(() => {
      if (firstModelRegistry && !preferredModelRegistry) {
        setPreferredModelRegistry(firstModelRegistry);
      }
    }, [firstModelRegistry, preferredModelRegistry]);

    const updatePreferredModelRegistry = React.useCallback<
      ModelRegistrySelectorContextType['updatePreferredModelRegistry']
    >((modelRegistry) => {
      setPreferredModelRegistry(modelRegistry);
    }, []);

    if (!isLoaded) {
      return <Bullseye>Loading model registries...</Bullseye>;
    }

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
      <ModelRegistrySelectorContext.Provider
        value={{
          modelRegistries,
          preferredModelRegistry,
          updatePreferredModelRegistry,
        }}
      >
        {children}
      </ModelRegistrySelectorContext.Provider>
    );
  });
