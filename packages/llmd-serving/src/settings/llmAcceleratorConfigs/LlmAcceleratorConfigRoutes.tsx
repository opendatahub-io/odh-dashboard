import * as React from 'react';
import { Navigate, Routes, Route } from 'react-router-dom';
import LlmAcceleratorConfigContextProvider from './LlmAcceleratorConfigContext';
import LlmAcceleratorConfigView from './LlmAcceleratorConfigView';
import LlmAcceleratorConfigAddForm, {
  LlmAcceleratorConfigFormByName,
} from './LlmAcceleratorConfigAddForm';
import { LLM_ACCELERATOR_CONFIGS_STANDALONE_PATH } from './paths';
import LlmInferenceServiceConfigAccessGate from '../LlmInferenceServiceConfigAccessGate';

/**
 * Routes for the standalone LLM accelerator configurations page, used when the
 * `modelDeploymentSettings` feature flag is off. When the flag is on this page is
 * replaced by the tab (see LlmAcceleratorConfigTabRoutes) and the form breakout
 * routes (see LlmAcceleratorConfigFormRoutes).
 *
 * Temporary — this whole file is deleted by RHOAIENG-80077 along with the flag.
 * https://issues.redhat.com/browse/RHOAIENG-80077
 */
const LlmAcceleratorConfigRoutes: React.FC = () => (
  <LlmInferenceServiceConfigAccessGate>
    <Routes>
      <Route path="/" element={<LlmAcceleratorConfigContextProvider />}>
        <Route index element={<LlmAcceleratorConfigView />} />
        <Route
          path="add"
          element={
            <LlmAcceleratorConfigAddForm
              mode="add"
              listPath={LLM_ACCELERATOR_CONFIGS_STANDALONE_PATH}
            />
          }
        />
        <Route
          path="edit/:configName"
          element={
            <LlmAcceleratorConfigFormByName
              mode="edit"
              listPath={LLM_ACCELERATOR_CONFIGS_STANDALONE_PATH}
            />
          }
        />
        <Route
          path="duplicate/:configName"
          element={
            <LlmAcceleratorConfigFormByName
              mode="duplicate"
              listPath={LLM_ACCELERATOR_CONFIGS_STANDALONE_PATH}
            />
          }
        />
        <Route path="*" element={<Navigate to="." />} />
      </Route>
    </Routes>
  </LlmInferenceServiceConfigAccessGate>
);

export default LlmAcceleratorConfigRoutes;
