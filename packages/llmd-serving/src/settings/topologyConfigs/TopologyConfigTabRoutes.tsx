import * as React from 'react';
import { Navigate, Routes, Route } from 'react-router-dom';
import TopologyConfigContextProvider from './TopologyConfigContext';
import TopologyConfigurationsView from './TopologyConfigurationsView';
import LlmInferenceServiceConfigAccessGate from '../LlmInferenceServiceConfigAccessGate';

/**
 * Content of the "llm-d topology configurations" tab on the Model deployment
 * settings page.
 *
 * Only the list lives in the tab panel. The add, edit, and duplicate forms are
 * registered separately as full-page breakout routes (see
 * TopologyConfigFormRoutes) so they render with their own breadcrumb and title
 * rather than nested beneath the page title and tab bar.
 */
const TopologyConfigTabRoutes: React.FC = () => (
  <LlmInferenceServiceConfigAccessGate>
    <Routes>
      <Route path="/" element={<TopologyConfigContextProvider />}>
        <Route index element={<TopologyConfigurationsView />} />
        <Route path="*" element={<Navigate to="." replace />} />
      </Route>
    </Routes>
  </LlmInferenceServiceConfigAccessGate>
);

export default TopologyConfigTabRoutes;
