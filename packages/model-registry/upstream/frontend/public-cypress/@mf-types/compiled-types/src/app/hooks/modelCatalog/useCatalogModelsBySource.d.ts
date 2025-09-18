import { CatalogModel } from '~/app/modelCatalogTypes';
type PaginatedCatalogModelList = {
    items: CatalogModel[];
    size: number;
    pageSize: number;
    nextPageToken: string;
    loadMore: () => void;
    isLoadingMore: boolean;
    hasMore: boolean;
};
type CatalogModelList = [
    models: PaginatedCatalogModelList,
    catalogModelLoaded: boolean,
    catalogModelLoadError: Error | undefined,
    refresh: () => void
];
export declare const useCatalogModelsBySources: (sourceId: string, pageSize?: number, searchQuery?: string) => CatalogModelList;
export {};
