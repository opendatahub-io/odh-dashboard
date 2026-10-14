// Catalog source status values from the API
export enum CatalogSourceStatus {
  AVAILABLE = 'available',
  PARTIALLY_AVAILABLE = 'partially-available',
  ERROR = 'error',
  DISABLED = 'disabled',
}

export type {
  CatalogSource,
  CatalogSourceList,
  CatalogAssetType,
  CatalogSourceListParams,
  PaginationParams,
} from '../../modelCatalogTypes';

// Shared query parameters for catalog list endpoints.
export interface CatalogListParams {
  pageSize?: number | string;
  nextPageToken?: string;
  filterQuery?: string;
  orderBy?: string;
  sortOrder?: string;
}
