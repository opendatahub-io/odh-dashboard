import { CatalogSourceConfig, HuggingFaceCatalogSourceConfig, CatalogSourceType } from '~/app/modelCatalogTypes';
export declare const CATALOG_SOURCE_TYPE_LABELS: Record<CatalogSourceType, string>;
export declare enum ModelVisibilityBadgeColor {
    FILTERED = "purple",
    UNFILTERED = "grey"
}
export declare enum CatalogSourceStatus {
    AVAILABLE = "available",
    PARTIALLY_AVAILABLE = "partially-available",
    ERROR = "error",
    DISABLED = "disabled"
}
/**
 * Checks whether a catalog source status indicates that models are available.
 * Sources with 'available' or 'partially-available' status have discoverable models.
 */
export declare const isSourceStatusWithModels: (status: string | undefined) => boolean;
export declare const isHuggingFaceSource: (config: CatalogSourceConfig) => config is HuggingFaceCatalogSourceConfig;
