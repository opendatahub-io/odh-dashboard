import React from 'react';
import { FetchStateObject } from '@odh-dashboard/ui-core/hooks/useFetch';
import { DEFAULT_LIST_FETCH_STATE } from '@odh-dashboard/ui-core/utilities/fetchState';
import { useMakeFetchObject } from '@odh-dashboard/ui-core/hooks/useMakeFetchObject';
import { ModelCatalogSource } from '#~/concepts/modelCatalog/types';
import { useModelCatalogSources } from '#~/concepts/modelCatalog/useModelCatalogSources';

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
