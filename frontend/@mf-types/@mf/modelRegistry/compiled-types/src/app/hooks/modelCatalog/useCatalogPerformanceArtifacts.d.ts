import { FetchState } from 'mod-arch-core';
import { CatalogFilterOptionsList, CatalogPerformanceArtifactList, CatalogPerformanceMetricsArtifact, ModelCatalogFilterStates, PerformanceArtifactsParams } from '~/app/modelCatalogTypes';
/**
 * Hook for fetching performance artifacts from the /performance_artifacts endpoint.
 * This endpoint returns only performance artifacts and supports server-side filtering,
 * sorting, and pagination.
 *
 * @param sourceId - The catalog source ID
 * @param modelName - The model name
 * @param params - Performance-specific parameters (targetRPS, latencyProperty, recommendations, pagination)
 * @param filterData - Current filter state for building filterQuery
 * @param filterOptions - Filter options from the API for validation
 * @param enabled - Whether to enable fetching (default: true)
 */
export declare const useCatalogPerformanceArtifacts: (sourceId: string, modelName: string, params?: PerformanceArtifactsParams, filterData?: ModelCatalogFilterStates, filterOptions?: CatalogFilterOptionsList | null, enabled?: boolean) => FetchState<CatalogPerformanceArtifactList>;
type PaginatedPerformanceArtifactList = {
    items: CatalogPerformanceMetricsArtifact[];
    size: number;
    pageSize: number;
    nextPageToken: string;
    loadMore: () => void;
    isLoadingMore: boolean;
    hasMore: boolean;
    loadMoreError?: Error;
    refresh: () => void;
};
type PaginatedPerformanceArtifactsResult = {
    performanceArtifacts: PaginatedPerformanceArtifactList;
    performanceArtifactsLoaded: boolean;
    performanceArtifactsLoadError: Error | undefined;
    refresh: () => void;
};
export declare const usePaginatedCatalogPerformanceArtifacts: (sourceId: string, modelName: string, params?: PerformanceArtifactsParams, filterData?: ModelCatalogFilterStates, filterOptions?: CatalogFilterOptionsList | null, enabled?: boolean) => PaginatedPerformanceArtifactsResult;
export {};
