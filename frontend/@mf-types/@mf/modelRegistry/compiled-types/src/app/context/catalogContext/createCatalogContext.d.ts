import * as React from 'react';
import type { CatalogLabelList, CatalogSourceList } from '~/app/modelCatalogTypes';
export type CatalogCommonData<TFilterOptions> = {
    catalogSources: CatalogSourceList | null;
    catalogSourcesLoaded: boolean;
    catalogSourcesLoadError?: Error;
    catalogLabels: CatalogLabelList | null;
    catalogLabelsLoaded: boolean;
    catalogLabelsLoadError?: Error;
    filterOptions: TFilterOptions | null;
    filterOptionsLoaded: boolean;
    filterOptionsLoadError?: Error;
};
export type CatalogProviderState = {
    selectedSourceLabel: string | undefined;
    setSelectedSourceLabel: (label: string | undefined) => void;
};
export type CatalogContextValue<TFilterOptions> = CatalogCommonData<TFilterOptions> & CatalogProviderState & {
    clearAllFilters: () => void;
};
export type CatalogContextConfig<TFilterOptions, TExtension> = {
    displayName?: string;
    initialSelectedSourceLabel?: string;
    useSetup: (providerState: CatalogProviderState) => {
        catalogData: CatalogCommonData<TFilterOptions>;
        extension: TExtension & {
            clearAllFilters: () => void;
        };
    };
};
type CatalogContextResult<TFilterOptions, TExtension> = {
    Context: React.Context<CatalogContextValue<TFilterOptions> & TExtension>;
    Provider: React.FC<{
        children: React.ReactNode;
    }>;
    useContext: () => CatalogContextValue<TFilterOptions> & TExtension;
};
export declare function createCatalogContext<TFilterOptions, TExtension>(config: CatalogContextConfig<TFilterOptions, TExtension>): CatalogContextResult<TFilterOptions, TExtension>;
export {};
