export declare enum CatalogSourceStatus {
    AVAILABLE = "available",
    PARTIALLY_AVAILABLE = "partially-available",
    ERROR = "error",
    DISABLED = "disabled"
}
export type { CatalogSource, CatalogSourceList, CatalogAssetType, CatalogSourceListParams, PaginationParams, } from '../../modelCatalogTypes';
export interface CatalogListParams {
    pageSize?: number | string;
    nextPageToken?: string;
    filterQuery?: string;
    orderBy?: string;
    sortOrder?: string;
}
