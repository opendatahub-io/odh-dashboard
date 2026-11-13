import * as React from 'react';
import { useMatch } from 'react-router-dom';
import LlmInferenceServiceConfigContextProvider from './LlmInferenceServiceConfigContext';
import LlmInferenceServiceConfigAddForm, {
  LlmInferenceServiceConfigFormByName,
} from './LlmInferenceServiceConfigAddForm';
import { LLM_INFERENCE_SERVICE_CONFIGS_TAB_PATH } from './paths';
import LlmInferenceServiceConfigAccessGate from '../LlmInferenceServiceConfigAccessGate';

/**
 * Full-page breakout routes for the inference service configuration forms when the
 * tabbed Model deployment settings page is enabled.
 *
 * Registered as their own `app.route` extensions rather than as tab content, so
 * the forms render with their own breadcrumb and title instead of inside the tab
 * panel beneath the page title and tab bar.
 *
 * There is deliberately no nested `<Routes>` here. Each extension registers an
 * exact path, so by the time this renders the parent route has already consumed
 * the whole pathname and a descendant router would be handed an empty remaining
 * path to match against — matching nothing and rendering blank. The mode is
 * therefore resolved from the location directly.
 */
const LlmInferenceServiceConfigFormRoutes: React.FC = () => {
  const isEdit = useMatch(`${LLM_INFERENCE_SERVICE_CONFIGS_TAB_PATH}/edit/:configName`) !== null;
  const isDuplicate =
    useMatch(`${LLM_INFERENCE_SERVICE_CONFIGS_TAB_PATH}/duplicate/:configName`) !== null;

  return (
    <LlmInferenceServiceConfigAccessGate>
      <LlmInferenceServiceConfigContextProvider>
        {isEdit || isDuplicate ? (
          <LlmInferenceServiceConfigFormByName mode={isEdit ? 'edit' : 'duplicate'} />
        ) : (
          <LlmInferenceServiceConfigAddForm mode="add" />
        )}
      </LlmInferenceServiceConfigContextProvider>
    </LlmInferenceServiceConfigAccessGate>
  );
};

export default LlmInferenceServiceConfigFormRoutes;
