import { CatalogFilterOptionsList, CatalogModel, ModelCatalogFilterStates } from '~/app/modelCatalogTypes';
type PaginatedCatalogModelList = {
    items: CatalogModel[];
    size: number;
    pageSize: number;
    nextPageToken: string;
    loadMore: () => void;
    isLoadingMore: boolean;
    hasMore: boolean;
    refresh: () => void;
};
type ModelList = {
    catalogModels: PaginatedCatalogModelList;
    catalogModelsLoaded: boolean;
    catalogModelsLoadError: Error | undefined;
    refresh: () => void;
};
export declare const useCatalogModelsBySources: (sourceId?: string, sourceLabel?: string, pageSize?: number, searchQuery?: string, filterData?: ModelCatalogFilterStates, filterOptions?: CatalogFilterOptionsList | null, filterQuery?: string, sortBy?: string | null, sortOrder?: string, performanceParams?: {
    targetRPS?: number;
    latencyProperty?: string;
    recommendations?: boolean;
}) => ModelList;
export {};
