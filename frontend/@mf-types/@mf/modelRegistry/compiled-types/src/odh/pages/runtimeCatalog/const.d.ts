import type { CatalogGridSpans } from '~/app/shared/components/catalog/types/catalogFilterTypes';
export declare const RUNTIME_CATALOG_FILTER_KEYS: readonly ["hardware"];
export type RuntimeCatalogFilterKey = (typeof RUNTIME_CATALOG_FILTER_KEYS)[number];
export type RuntimeCatalogFiltersState = Partial<Record<RuntimeCatalogFilterKey, string[]>>;
export declare const RUNTIME_CATALOG_FILTER_CATEGORY_NAMES: Record<RuntimeCatalogFilterKey, string>;
export declare const RUNTIME_CATALOG_HARDWARE_LABELS: Record<string, string>;
export declare const RUNTIME_CATALOG_GALLERY_PAGE_SIZE = 10;
export declare const RUNTIME_CATALOG_GRID_SPANS: CatalogGridSpans;
