import * as React from 'react';
import type { CatalogSettingsDefinition } from './types';
type CatalogSettingsRoutesProps = {
    definition: CatalogSettingsDefinition;
};
/**
 * Mounts the standard 4-route tree for a catalog settings section:
 *   /          → ListPage
 *   add-source → ManagePage
 *   manage-source/:catalogSourceId → ManagePage
 *   *          → redirect to /
 *
 * Wraps routes in the catalog's ContextProvider (from definition).
 */
declare const CatalogSettingsRoutes: React.FC<CatalogSettingsRoutesProps>;
export default CatalogSettingsRoutes;
