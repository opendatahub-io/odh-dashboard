import * as React from 'react';
import { ModelCatalogAPIState } from '~/app/hooks/modelCatalog/useModelCatalogAPIState';
import { CatalogSource, CatalogSourceList } from '~/app/modelCatalogTypes';
export type ModelCatalogContextType = {
    catalogSourcesLoaded: boolean;
    catalogSourcesLoadError?: Error;
    catalogSources: CatalogSourceList | null;
    selectedSource: CatalogSource | undefined;
    updateSelectedSource: (modelRegistry: CatalogSource | undefined) => void;
    apiState: ModelCatalogAPIState;
    refreshAPIState: () => void;
};
type ModelCatalogContextProviderProps = {
    children: React.ReactNode;
};
export declare const ModelCatalogContext: React.Context<ModelCatalogContextType>;
export declare const ModelCatalogContextProvider: React.FC<ModelCatalogContextProviderProps>;
export {};
