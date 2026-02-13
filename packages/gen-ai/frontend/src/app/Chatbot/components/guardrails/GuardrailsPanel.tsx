import * as React from 'react';
import {
  Button,
  Form,
  FormGroup,
  FormHelperText,
  HelperText,
  HelperTextItem,
  MenuToggle,
  Popover,
  Select,
  SelectOption,
  SelectList,
  Switch,
} from '@patternfly/react-core';
import { HelpIcon } from '@patternfly/react-icons';
import { fireMiscTrackingEvent } from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
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
      fireMiscTrackingEvent('Guardrails Model Dropdown Option Selected', {
        selectedModel: value,
      });
    }
    setIsModelSelectOpen(false);
  };

  const handleUserInputToggle = (_event: React.FormEvent<HTMLInputElement>, checked: boolean) => {
    // Update state
    updateUserInputEnabled(configId, checked);

    // Fire tracking with the new input value and current output value
    fireMiscTrackingEvent('Guardrails Enabled', {
      inputEnabled: checked,
      outputEnabled: modelOutputEnabled,
    });
  };

  const handleModelOutputToggle = (_event: React.FormEvent<HTMLInputElement>, checked: boolean) => {
    // Update state
    updateModelOutputEnabled(configId, checked);

    // Fire tracking with current input value and the new output value
    fireMiscTrackingEvent('Guardrails Enabled', {
      inputEnabled: userInputEnabled,
      outputEnabled: checked,
    });
  };

  const handleInfoIconClick = () => {
    fireMiscTrackingEvent('Guardrail Model Info Icon Selected', {
      infoClicked: true,
    });
  };

  return (
    <Form>
      <FormGroup
        label={
          <span>
            Guardrail model
            <Popover
              bodyContent={
                <div>
                  Select the model to use for guardrails. This model evaluates user inputs and model
                  outputs for security and content policy violations.
                </div>
              }
            >
              <Button
                variant="plain"
                aria-label="More info for guardrail model field"
                onClick={handleInfoIconClick}
              >
                <HelpIcon />
              </Button>
            </Popover>
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
