import React from 'react';
import { ModelCatalogSource } from '~/concepts/modelCatalog/types';
import { modelCatalogSourceMock } from '~/concepts/modelCatalog/mockData/modelCatalogSourceMock';

export type ModelCatalogContextType = {
  modelCatalogSources: ModelCatalogSource[];
};

type ModelCatalogContextProviderProps = {
  children: React.ReactNode;
};

export const ModelCatalogContext = React.createContext<ModelCatalogContextType>({
  modelCatalogSources: [],
});

export const ModelCatalogContextProvider: React.FC<ModelCatalogContextProviderProps> = ({
  children,
}) => {
  const modelCatalogSourcesMock = React.useMemo(() => [modelCatalogSourceMock({})], []);
  const contextValue = React.useMemo(
    () => ({
      modelCatalogSources: modelCatalogSourcesMock,
    }),
    [modelCatalogSourcesMock],
  );
  return (
    <ModelCatalogContext.Provider value={contextValue}>{children}</ModelCatalogContext.Provider>
  );
};
