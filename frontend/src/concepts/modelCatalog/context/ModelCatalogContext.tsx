import React from 'react';
import { FetchState } from '~/utilities/useFetchState';
import { ModelCatalogSource } from '~/concepts/modelCatalog/types';
import { useModelCatalogSources } from '~/concepts/modelCatalog/useModelCatalogSources';

export type ModelCatalogContextType = {
  modelCatalogSources: FetchState<ModelCatalogSource[]>;
};

type ModelCatalogContextProviderProps = {
  children: React.ReactNode;
};

export const ModelCatalogContext = React.createContext<ModelCatalogContextType>({
  modelCatalogSources: [[], false, undefined, () => Promise.resolve(undefined)],
});

export const ModelCatalogContextProvider: React.FC<ModelCatalogContextProviderProps> = ({
  children,
}) => {
  const modelCatalogSources = useModelCatalogSources();

  const contextValue = React.useMemo(
    () => ({
      modelCatalogSources,
    }),
    [modelCatalogSources],
  );

  return (
    <ModelCatalogContext.Provider value={contextValue}>{children}</ModelCatalogContext.Provider>
  );
};
