import * as React from 'react';
import { Navigate, Routes, Route } from 'react-router-dom';
import LlmInferenceServiceConfigContextProvider from './LlmInferenceServiceConfigContext';
import LlmInferenceServiceConfigView from './LlmInferenceServiceConfigView';
import LlmInferenceServiceConfigAccessGate from '../LlmInferenceServiceConfigAccessGate';

/**
 * Content of the "LLM inference service configurations" tab on the Model deployment
 * settings page.
 *
 * Only the list lives in the tab panel. The add, edit, and duplicate forms are
 * registered separately as full-page breakout routes (see
 * LlmInferenceServiceConfigFormRoutes) so they render with their own breadcrumb and
 * title rather than nested beneath the page title and tab bar.
 */
const LlmInferenceServiceConfigTabRoutes: React.FC = () => (
  <LlmInferenceServiceConfigAccessGate>
    <Routes>
      <Route path="/" element={<LlmInferenceServiceConfigContextProvider />}>
        <Route index element={<LlmInferenceServiceConfigView />} />
        <Route path="*" element={<Navigate to="." replace />} />
      </Route>
    </Routes>
  </LlmInferenceServiceConfigAccessGate>
);

export default LlmInferenceServiceConfigTabRoutes;
