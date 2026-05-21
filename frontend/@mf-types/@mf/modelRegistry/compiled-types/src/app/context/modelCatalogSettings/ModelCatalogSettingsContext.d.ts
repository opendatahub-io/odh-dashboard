import * as React from 'react';
import { ModelCatalogSettingsAPIState } from '~/app/hooks/modelCatalogSettings/useModelCatalogSettingsAPIState';
import { CatalogSourceConfigList, CatalogSourceList } from '~/app/modelCatalogTypes';
export type ModelCatalogSettingsContextType = {
    apiState: ModelCatalogSettingsAPIState;
    refreshAPIState: () => void;
    catalogSourceConfigs: CatalogSourceConfigList | null;
    catalogSourceConfigsLoaded: boolean;
    catalogSourceConfigsLoadError?: Error;
    refreshCatalogSourceConfigs: () => void;
    catalogSources: CatalogSourceList | null;
    catalogSourcesLoaded: boolean;
    catalogSourcesLoadError?: Error;
    refreshCatalogSources: () => void;
};
type ModelCatalogSettingsContextProviderProps = {
    children: React.ReactNode;
};
export declare const ModelCatalogSettingsContext: React.Context<ModelCatalogSettingsContextType>;
export declare const ModelCatalogSettingsContextProvider: React.FC<ModelCatalogSettingsContextProviderProps>;
export {};
