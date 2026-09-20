import * as React from 'react';
import { Navigate, Routes, Route } from 'react-router-dom';
import RoutingConfigContextProvider from './RoutingConfigContext';
import RoutingConfigurationsView from './RoutingConfigurationsView';
import LlmInferenceServiceConfigAccessGate from '../LlmInferenceServiceConfigAccessGate';

/**
 * Content of the "llm-d routing configurations" tab on the Model deployment
 * settings page.
 *
 * Only the list lives in the tab panel. The add, edit, and duplicate forms are
 * registered separately as full-page breakout routes (see RoutingConfigFormRoutes)
 * so they render with their own breadcrumb and title rather than nested beneath
 * the page title and tab bar.
 */
const RoutingConfigTabRoutes: React.FC = () => (
  <LlmInferenceServiceConfigAccessGate>
    <Routes>
      <Route path="/" element={<RoutingConfigContextProvider />}>
        <Route index element={<RoutingConfigurationsView />} />
        <Route path="*" element={<Navigate to="." replace />} />
      </Route>
    </Routes>
  </LlmInferenceServiceConfigAccessGate>
);

export default RoutingConfigTabRoutes;
