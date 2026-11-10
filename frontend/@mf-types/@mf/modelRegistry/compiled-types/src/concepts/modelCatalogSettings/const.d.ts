import { CatalogSourceConfig, HuggingFaceCatalogSourceConfig, CatalogSourceType } from '~/app/modelCatalogTypes';
import { CatalogSourceStatus } from '~/app/shared/types/catalogTypes';
export { CatalogSourceStatus };
export declare const CATALOG_SOURCE_TYPE_LABELS: Record<CatalogSourceType, string>;
export declare enum ModelVisibilityBadgeColor {
    FILTERED = "purple",
    UNFILTERED = "grey"
}
/**
 * Checks whether a catalog source status indicates that models are available.
 * Sources with 'available' or 'partially-available' status have discoverable models.
 */
export declare const isSourceStatusWithModels: (status: string | undefined) => boolean;
export declare const isHuggingFaceSource: (config: CatalogSourceConfig) => config is HuggingFaceCatalogSourceConfig;
