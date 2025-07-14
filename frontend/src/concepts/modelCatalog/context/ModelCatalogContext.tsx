import React from 'react';
import { FetchStateObject } from '#~/utilities/useFetch';
import { ModelCatalogSource } from '#~/concepts/modelCatalog/types';
import { useModelCatalogSources } from '#~/concepts/modelCatalog/useModelCatalogSources';
import { DEFAULT_LIST_FETCH_STATE } from '#~/utilities/const';
import { useMakeFetchObject } from '#~/utilities/useMakeFetchObject';

export type ModelCatalogContextType = {
  modelCatalogSources: FetchStateObject<ModelCatalogSource[]>;
};

type ModelCatalogContextProviderProps = {
  children: React.ReactNode;
};

export const ModelCatalogContext = React.createContext<ModelCatalogContextType>({
  modelCatalogSources: DEFAULT_LIST_FETCH_STATE,
});

export const ModelCatalogContextProvider: React.FC<ModelCatalogContextProviderProps> = ({
  children,
}) => {
  const modelCatalogSources = useMakeFetchObject(useModelCatalogSources());

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
