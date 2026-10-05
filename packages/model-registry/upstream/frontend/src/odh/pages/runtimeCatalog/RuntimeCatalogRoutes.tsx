import * as React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { RUNTIME_CATALOG_TAB_PATH } from '~/odh/routes/runtimeCatalog/runtimeCatalog';
import RuntimeCatalogView from './RuntimeCatalogView';
import RuntimeCatalogDetailsView from './RuntimeCatalogDetailsView';
import { RUNTIME_CATALOG_LANDING_TITLE } from './const';

/**
 * Standalone routes for the runtime catalog.
 *
 * In federated mode the tab-route extension (extensions.ts) mounts the catalog
 * inside the host's Model deployment settings page.  These routes allow the
 * pages to also render in standalone / Cypress-mock mode.
 */

const standaloneBreadcrumbs = [
  { title: RUNTIME_CATALOG_LANDING_TITLE, href: RUNTIME_CATALOG_TAB_PATH },
];

const RuntimeCatalogRoutes: React.FC = () => (
  <Routes>
    <Route index element={<RuntimeCatalogView />} />
    <Route
      path=":runtimeName"
      element={<RuntimeCatalogDetailsView breadcrumbs={standaloneBreadcrumbs} />}
    />
    <Route path="*" element={<Navigate to="." replace />} />
  </Routes>
);

export default RuntimeCatalogRoutes;
