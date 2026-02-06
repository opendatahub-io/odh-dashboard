import * as React from 'react';
import {
  Form,
  FormGroup,
  FormHelperText,
  HelperText,
  HelperTextItem,
  MenuToggle,
  Select,
  SelectOption,
  SelectList,
  Switch,
} from '@patternfly/react-core';
import { FieldGroupHelpLabelIcon } from 'mod-arch-shared';
import {
  useChatbotConfigStore,
  selectGuardrail,
  selectGuardrailUserInputEnabled,
  selectGuardrailModelOutputEnabled,
} from '~/app/Chatbot/store';

// Keep this type for useChatbotMessages API payload
export type GuardrailsConfig = {
  enabled: boolean;
  guardrail: string;
  userInputEnabled: boolean;
  modelOutputEnabled: boolean;
};

interface GuardrailsPanelProps {
  configId: string;
  availableModels: string[];
}

const GuardrailsPanel: React.FC<GuardrailsPanelProps> = ({ configId, availableModels }) => {
  const [isModelSelectOpen, setIsModelSelectOpen] = React.useState(false);

  // Read from store
  const guardrail = useChatbotConfigStore(selectGuardrail(configId));
  const userInputEnabled = useChatbotConfigStore(selectGuardrailUserInputEnabled(configId));
  const modelOutputEnabled = useChatbotConfigStore(selectGuardrailModelOutputEnabled(configId));

  // Get updaters directly
  const updateGuardrail = useChatbotConfigStore((state) => state.updateGuardrail);
  const updateUserInputEnabled = useChatbotConfigStore(
    (state) => state.updateGuardrailUserInputEnabled,
  );
  const updateModelOutputEnabled = useChatbotConfigStore(
    (state) => state.updateGuardrailModelOutputEnabled,
  );

  const handleModelSelect = (
    _event: React.MouseEvent<Element, MouseEvent> | undefined,
    value: string | number | undefined,
  ) => {
    if (typeof value === 'string') {
      updateGuardrail(configId, value);
    }
    setIsModelSelectOpen(false);
  };

  return (
    <Form>
      <FormGroup
        label="Guardrail model"
        fieldId="guardrail-model"
        labelHelp={
          <FieldGroupHelpLabelIcon content="This is the model that enforces the guardrails." />
        }
      >
        <Select
          id="guardrail-model-select"
          isOpen={isModelSelectOpen}
          selected={guardrail}
          onSelect={handleModelSelect}
          onOpenChange={setIsModelSelectOpen}
          toggle={(toggleRef) => (
            <MenuToggle
              ref={toggleRef}
              onClick={() => setIsModelSelectOpen(!isModelSelectOpen)}
              isExpanded={isModelSelectOpen}
              style={{ width: '100%' }}
              data-testid="guardrail-model-toggle"
            >
              {guardrail || 'Select a model'}
            </MenuToggle>
          )}
        >
          <SelectList>
            {availableModels.map((model) => (
              <SelectOption key={model} value={model}>
                {model}
              </SelectOption>
            ))}
          </SelectList>
        </Select>
      </FormGroup>

      <FormGroup fieldId="user-input-guardrails">
        <Switch
          id="user-input-guardrails-switch"
          label="User input guardrails"
          isChecked={userInputEnabled}
          onChange={(_event, checked) => updateUserInputEnabled(configId, checked)}
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
          onChange={(_event, checked) => updateModelOutputEnabled(configId, checked)}
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
