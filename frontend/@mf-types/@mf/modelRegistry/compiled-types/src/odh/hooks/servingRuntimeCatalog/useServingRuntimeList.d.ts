import { FetchState } from 'mod-arch-core';
import { ServingRuntimeList, ServingRuntimeListParams } from '~/odh/types/servingRuntimeCatalogTypes';
type PaginatedServingRuntimeList = ServingRuntimeList & {
    loadMore: () => Promise<void>;
    hasMore: boolean;
    isLoadingMore: boolean;
    loadMoreError?: Error;
};
export declare const useServingRuntimeList: (params?: ServingRuntimeListParams) => FetchState<PaginatedServingRuntimeList>;
export {};
