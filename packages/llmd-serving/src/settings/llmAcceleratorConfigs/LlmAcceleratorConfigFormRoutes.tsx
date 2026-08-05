import * as React from 'react';
import { Navigate, Routes, Route } from 'react-router-dom';
import LlmAcceleratorConfigContextProvider from './LlmAcceleratorConfigContext';
import LlmAcceleratorConfigAddForm, {
  LlmAcceleratorConfigFormByName,
} from './LlmAcceleratorConfigAddForm';
import { LLM_ACCELERATOR_CONFIGS_TAB_PATH } from './paths';
import LlmInferenceServiceConfigAccessGate from '../LlmInferenceServiceConfigAccessGate';

/**
 * Full-page breakout routes for the accelerator configuration forms when the
 * tabbed Model deployment settings page is enabled.
 *
 * These are registered as their own `app.route` extensions rather than as tab
 * content so the forms render with their own breadcrumb and title instead of
 * inside the tab panel, beneath the page title and tab bar. The route paths are
 * absolute here because each form path is registered as a separate top-level
 * route, matching the pattern used by the agent-ops tabbed page.
 */
const LlmAcceleratorConfigFormRoutes: React.FC = () => (
  <LlmInferenceServiceConfigAccessGate>
    <Routes>
      <Route
        path={LLM_ACCELERATOR_CONFIGS_TAB_PATH}
        element={<LlmAcceleratorConfigContextProvider />}
      >
        <Route
          path="add"
          element={
            <LlmAcceleratorConfigAddForm mode="add" listPath={LLM_ACCELERATOR_CONFIGS_TAB_PATH} />
          }
        />
        <Route
          path="edit/:configName"
          element={
            <LlmAcceleratorConfigFormByName
              mode="edit"
              listPath={LLM_ACCELERATOR_CONFIGS_TAB_PATH}
            />
          }
        />
        <Route
          path="duplicate/:configName"
          element={
            <LlmAcceleratorConfigFormByName
              mode="duplicate"
              listPath={LLM_ACCELERATOR_CONFIGS_TAB_PATH}
            />
          }
        />
        <Route path="*" element={<Navigate to={LLM_ACCELERATOR_CONFIGS_TAB_PATH} replace />} />
      </Route>
    </Routes>
  </LlmInferenceServiceConfigAccessGate>
);

export default LlmAcceleratorConfigFormRoutes;
