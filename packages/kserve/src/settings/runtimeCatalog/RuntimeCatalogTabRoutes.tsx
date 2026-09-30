import * as React from 'react';
import { Navigate, Routes, Route } from 'react-router-dom';
import RuntimeCatalogView from './RuntimeCatalogView';

/**
 * Content of the "Runtime image library" tab on the Model deployment
 * settings page.
 *
 * The list lives in the tab panel. The details page is registered separately
 * as a full-page breakout route (see RuntimeCatalogDetailsRoutes) so it
 * renders with its own breadcrumb and title rather than nested beneath the
 * page title and tab bar.
 */
const RuntimeCatalogTabRoutes: React.FC = () => (
  <Routes>
    <Route index element={<RuntimeCatalogView />} />
    <Route path="*" element={<Navigate to="." replace />} />
  </Routes>
);

export default RuntimeCatalogTabRoutes;
