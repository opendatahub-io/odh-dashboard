import type { CatalogSettingsContextDefinition, CatalogSettingsContextValue } from './types';
/**
 * Factory that builds a reusable context-value hook for a catalog settings
 * section.  Call once at module level (outside any component) and use the
 * returned `useCatalogSettingsValue` hook inside your context provider.
 *
 * The returned hook handles:
 *   - settings API state (CRUD)
 *   - source-config list
 *   - catalog source polling (for status updates)
 *
 * Domain-specific context types (Model / MCP) are responsible for mapping the
 * generic field names (`sourceConfigs`, `catalogSources`, …) to their own
 * exported field names.
 */
export declare const createCatalogSettingsContext: <TAPIState, TConfigList>(contextDef: CatalogSettingsContextDefinition<TAPIState, TConfigList>) => {
    useCatalogSettingsValue: () => CatalogSettingsContextValue<TAPIState, TConfigList>;
};
