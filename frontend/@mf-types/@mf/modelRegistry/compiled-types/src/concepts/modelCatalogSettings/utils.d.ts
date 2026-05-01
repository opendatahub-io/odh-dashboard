import { CatalogSourceConfig } from '~/app/modelCatalogTypes';
/**
 * Checks if a catalog source has filters applied
 * @param config - The catalog source configuration
 * @returns true if the source has included or excluded models
 */
export declare const hasSourceFilters: (config: CatalogSourceConfig) => boolean;
/**
 * Gets the organization display value for a catalog source
 * @param config - The catalog source configuration
 * @param isDefault - Whether this is a default source
 * @returns The organization name or '-' if not applicable
 */
export declare const getOrganizationDisplay: (config: CatalogSourceConfig, isDefault: boolean) => string;
