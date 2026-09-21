import * as React from 'react';
import { Navigate, Routes, Route } from 'react-router-dom';
import CustomServingRuntimeContextProvider from './CustomServingRuntimeContext';
import ServingRuntimeTemplatesView from './ServingRuntimeTemplatesView';

/**
 * Content of the "Serving runtime templates" tab on the Model deployment
 * settings page.
 *
 * Only the list lives in the tab panel. The add, edit, and duplicate forms are
 * registered separately as full-page breakout routes (see
 * ServingRuntimeTemplatesFormRoutes) so they render with their own breadcrumb
 * and title rather than nested beneath the page title and tab bar.
 */
const ServingRuntimeTemplatesTabRoutes: React.FC = () => (
  <Routes>
    <Route path="/" element={<CustomServingRuntimeContextProvider />}>
      <Route index element={<ServingRuntimeTemplatesView />} />
      <Route path="*" element={<Navigate to="." replace />} />
    </Route>
  </Routes>
);

export default ServingRuntimeTemplatesTabRoutes;
