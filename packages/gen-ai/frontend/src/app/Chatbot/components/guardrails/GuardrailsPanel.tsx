/* eslint-disable camelcase */
import * as React from 'react';
import {
  Form,
  FormGroup,
  FormHelperText,
  HelperText,
  HelperTextItem,
  Switch,
} from '@patternfly/react-core';
import { fireMiscTrackingEvent } from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import {
  useChatbotConfigStore,
  selectGuardrail,
  selectGuardrailUserInputEnabled,
  selectGuardrailModelOutputEnabled,
  selectGuardrailSubscription,
} from '~/app/Chatbot/store';
import ModelDetailsDropdown from '~/app/Chatbot/components/ModelDetailsDropdown';
import SubscriptionDropdown from '~/app/Chatbot/components/SubscriptionDropdown';
import { ChatbotContext } from '~/app/context/ChatbotContext';
import useFetchBFFConfig from '~/app/hooks/useFetchBFFConfig';
import { isLlamaModelEnabled } from '~/app/utilities/utils';

interface GuardrailsPanelProps {
  configId: string;
}

const GuardrailsPanel: React.FC<GuardrailsPanelProps> = ({ configId }) => {
  const { models, modelsLoaded, aiModels, maasModels } = React.useContext(ChatbotContext);
  const { data: bffConfig } = useFetchBFFConfig();

  const guardrail = useChatbotConfigStore(selectGuardrail(configId));
  const userInputEnabled = useChatbotConfigStore(selectGuardrailUserInputEnabled(configId));
  const modelOutputEnabled = useChatbotConfigStore(selectGuardrailModelOutputEnabled(configId));
  const guardrailSubscription = useChatbotConfigStore(selectGuardrailSubscription(configId));

  const updateGuardrail = useChatbotConfigStore((state) => state.updateGuardrail);
  const updateUserInputEnabled = useChatbotConfigStore(
    (state) => state.updateGuardrailUserInputEnabled,
  );
  const updateModelOutputEnabled = useChatbotConfigStore(
    (state) => state.updateGuardrailModelOutputEnabled,
  );
  const updateGuardrailSubscription = useChatbotConfigStore(
    (state) => state.updateGuardrailSubscription,
  );

  React.useEffect(() => {
    if (modelsLoaded && models.length > 0 && !guardrail) {
      const first = models.find((m) =>
        isLlamaModelEnabled(m.id, aiModels, maasModels, bffConfig?.isCustomLSD ?? false),
      );
      if (first) {
        updateGuardrail(configId, first.id);
      }
    }
  }, [modelsLoaded, models, guardrail, aiModels, maasModels, bffConfig, configId, updateGuardrail]);

  const handleModelChange = (value: string) => {
    updateGuardrail(configId, value);
    fireMiscTrackingEvent('Guardrails Model Dropdown Option Selected', { selectedModel: value });
  };

  const handleUserInputToggle = (_event: React.FormEvent<HTMLInputElement>, checked: boolean) => {
    updateUserInputEnabled(configId, checked);
    fireMiscTrackingEvent('Guardrails Enabled', {
      inputEnabled: checked,
      outputEnabled: modelOutputEnabled,
    });
  };

  const handleModelOutputToggle = (_event: React.FormEvent<HTMLInputElement>, checked: boolean) => {
    updateModelOutputEnabled(configId, checked);
    fireMiscTrackingEvent('Guardrails Enabled', {
      inputEnabled: userInputEnabled,
      outputEnabled: checked,
    });
  };

  return (
    <Form>
      <FormGroup label="Guardrail model" fieldId="guardrail-model">
        <ModelDetailsDropdown
          selectedModel={guardrail}
          onModelChange={handleModelChange}
          style={{ width: '100%' }}
          testId="guardrail-model-toggle"
        />
      </FormGroup>

      <SubscriptionDropdown
        selectedModel={guardrail}
        selectedSubscription={guardrailSubscription}
        onSubscriptionChange={(value) => updateGuardrailSubscription(configId, value)}
      />

      <FormGroup fieldId="user-input-guardrails">
        <Switch
          id="user-input-guardrails-switch"
          label="User input guardrails"
          isChecked={userInputEnabled}
          onChange={handleUserInputToggle}
          data-testid="user-input-guardrails-switch"
        />
        <FormHelperText>
          <HelperText>
            <HelperTextItem>
              Includes jailbreak &amp; prompt attack protection, PII filtering, and content
              moderation (toxicity, hate speech, sexual content, violence, harassment).
            </HelperTextItem>
          </HelperText>
        </FormHelperText>
      </FormGroup>

      <FormGroup fieldId="model-output-guardrails">
        <Switch
          id="model-output-guardrails-switch"
          label="Model output guardrails"
          isChecked={modelOutputEnabled}
          onChange={handleModelOutputToggle}
          data-testid="model-output-guardrails-switch"
        />
        <FormHelperText>
          <HelperText>
            <HelperTextItem>
              Includes PII leak prevention and content moderation (toxicity, hate speech, sexual
              content, violence, harassment).
            </HelperTextItem>
          </HelperText>
        </FormHelperText>
      </FormGroup>
    </Form>
  );
};

export default GuardrailsPanel;
