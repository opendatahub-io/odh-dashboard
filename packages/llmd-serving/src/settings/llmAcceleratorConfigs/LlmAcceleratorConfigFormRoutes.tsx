import * as React from 'react';
import { useMatch } from 'react-router-dom';
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
const LlmAcceleratorConfigFormRoutes: React.FC = () => {
  const isEdit = useMatch(`${LLM_ACCELERATOR_CONFIGS_TAB_PATH}/edit/:configName`) !== null;
  const isDuplicate =
    useMatch(`${LLM_ACCELERATOR_CONFIGS_TAB_PATH}/duplicate/:configName`) !== null;

  return (
    <LlmInferenceServiceConfigAccessGate>
      <LlmAcceleratorConfigContextProvider>
        {isEdit || isDuplicate ? (
          <LlmAcceleratorConfigFormByName mode={isEdit ? 'edit' : 'duplicate'} />
        ) : (
          <LlmAcceleratorConfigAddForm mode="add" />
        )}
      </LlmAcceleratorConfigContextProvider>
    </LlmInferenceServiceConfigAccessGate>
  );
};

export default LlmAcceleratorConfigFormRoutes;
