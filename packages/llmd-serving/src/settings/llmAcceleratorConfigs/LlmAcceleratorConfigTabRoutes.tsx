import * as React from 'react';
import { Navigate, Routes, Route } from 'react-router-dom';
import LlmAcceleratorConfigContextProvider from './LlmAcceleratorConfigContext';
import LlmAcceleratorConfigView from './LlmAcceleratorConfigView';
import LlmInferenceServiceConfigAccessGate from '../LlmInferenceServiceConfigAccessGate';

/**
 * Content of the "LLM accelerator configurations" tab on the Model deployment
 * settings page.
 *
 * Only the list lives in the tab panel. The add, edit, and duplicate forms are
 * registered separately as full-page breakout routes (see
 * LlmAcceleratorConfigFormRoutes) so they render with their own breadcrumb and
 * title rather than nested beneath the page title and tab bar.
 */
const LlmAcceleratorConfigTabRoutes: React.FC = () => (
  <LlmInferenceServiceConfigAccessGate>
    <Routes>
      <Route path="/" element={<LlmAcceleratorConfigContextProvider />}>
        <Route index element={<LlmAcceleratorConfigView />} />
        <Route path="*" element={<Navigate to="." replace />} />
      </Route>
    </Routes>
  </LlmInferenceServiceConfigAccessGate>
);

export default LlmAcceleratorConfigTabRoutes;
