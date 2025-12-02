/**
 * Base path configuration for model registry and model catalog routes.
 *
 * These can be overridden downstream (e.g., in ODH) to customize the root paths
 * while keeping the internal route structure consistent.
 */
export declare const DEFAULT_MODEL_REGISTRY_BASE_PATH = "/model-registry";
export declare const DEFAULT_MODEL_CATALOG_BASE_PATH = "/model-catalog";
/**
 * Get the base path for model registry routes.
 * Can be overridden by environment variable or downstream configuration.
 */
export declare const getModelRegistryBasePath: () => string;
/**
 * Get the base path for model catalog routes.
 * Can be overridden by environment variable or downstream configuration.
 */
export declare const getModelCatalogBasePath: () => string;
