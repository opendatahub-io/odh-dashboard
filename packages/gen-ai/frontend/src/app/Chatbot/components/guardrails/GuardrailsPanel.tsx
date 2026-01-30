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
  Checkbox,
  Popover,
  Button,
} from '@patternfly/react-core';
import { HelpIcon } from '@patternfly/react-icons';
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

const HelpPopover: React.FC<{ content: string; label: string }> = ({ content, label }) => (
  <Popover bodyContent={<div>{content}</div>}>
    <Button
      variant="plain"
      aria-label={`More info for ${label.toLowerCase()} field`}
      onClick={(e) => e.preventDefault()}
    >
      <HelpIcon />
    </Button>
  </Popover>
);

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
        label={
          <span>
            Guardrail model
            <HelpPopover
              label="guardrail model"
              content="Select the model to use for guardrail checks on user inputs and model outputs."
            />
          </span>
        }
        fieldId="guardrail-model"
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
        <Checkbox
          id="user-input-guardrails-checkbox"
          label={
            <span>
              <strong>User input guardrails</strong>
              <HelpPopover
                label="user input guardrails"
                content="Protects against jailbreak attempts, prompt injection attacks, PII exposure, and harmful content in user messages."
              />
            </span>
          }
          isChecked={userInputEnabled}
          onChange={(_event, checked) => updateUserInputEnabled(configId, checked)}
          data-testid="user-input-guardrails-checkbox"
        />
        <FormHelperText style={{ marginLeft: 24 }}>
          <HelperText>
            <HelperTextItem>
              Includes jailbreak &amp; prompt attack protection, PII filtering, and content
              moderation (toxicity, hate speech, sexual content, violence, harassment).
            </HelperTextItem>
          </HelperText>
        </FormHelperText>
      </FormGroup>

      <FormGroup fieldId="model-output-guardrails">
        <Checkbox
          id="model-output-guardrails-checkbox"
          label={
            <span>
              <strong>Model output guardrails</strong>
              <HelpPopover
                label="model output guardrails"
                content="Prevents PII leakage and filters harmful content from model responses."
              />
            </span>
          }
          isChecked={modelOutputEnabled}
          onChange={(_event, checked) => updateModelOutputEnabled(configId, checked)}
          data-testid="model-output-guardrails-checkbox"
        />
        <FormHelperText style={{ marginLeft: 24 }}>
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
