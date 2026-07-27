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
