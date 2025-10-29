/**
 * ODH-specific override for base paths.
 *
 * This file overrides the default upstream base paths to use ODH's navigation structure.
 * This allows the upstream code to remain generic while ODH can customize the paths.
 */
export declare const ODH_MODEL_REGISTRY_BASE_PATH = "/ai-hub/registry";
export declare const ODH_MODEL_CATALOG_BASE_PATH = "/ai-hub/catalog";
/**
 * Get the base path for model registry routes in ODH context.
 */
export declare const getModelRegistryBasePath: () => string;
/**
 * Get the base path for model catalog routes in ODH context.
 */
export declare const getModelCatalogBasePath: () => string;
