import { CatalogModel } from '~/app/modelCatalogTypes';
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
export declare const useCatalogModelsBySources: (sourceId: string, pageSize?: number, searchQuery?: string) => ModelList;
export {};
