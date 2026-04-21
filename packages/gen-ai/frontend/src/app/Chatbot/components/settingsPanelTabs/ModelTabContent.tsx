import * as React from 'react';
import { Button, Form, FormGroup, Popover, Switch, TextInput } from '@patternfly/react-core';
import { HelpIcon } from '@patternfly/react-icons';
import { fireMiscTrackingEvent } from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import TabContentWrapper from '~/app/Chatbot/components/settingsPanelTabs/TabContentWrapper';
import ModelParameterFormGroup from '~/app/Chatbot/components/ModelParameterFormGroup';
import ModelDetailsDropdown from '~/app/Chatbot/components/ModelDetailsDropdown';
import SubscriptionDropdown from '~/app/Chatbot/components/SubscriptionDropdown';

interface ModelTabContentProps {
  temperature: number;
  onTemperatureChange: (value: number) => void;
  maxTokens: number | undefined;
  onMaxTokensChange: (value: number | undefined) => void;
  isStreamingEnabled: boolean;
  onStreamingToggle: (enabled: boolean) => void;
  /** Custom title for the section (e.g., "Model 1 settings" in compare mode) */
  title?: string;
  selectedModel: string;
  onModelChange: (model: string) => void;
  selectedSubscription: string;
  onSubscriptionChange: (subscription: string) => void;
}

const ModelTabContent: React.FunctionComponent<ModelTabContentProps> = ({
  temperature,
  onTemperatureChange,
  maxTokens,
  onMaxTokensChange,
  isStreamingEnabled,
  onStreamingToggle,
  title = 'Model',
  selectedModel,
  onModelChange,
  selectedSubscription,
  onSubscriptionChange,
}) => (
  <TabContentWrapper title={title}>
    <Form>
      <FormGroup fieldId="model-selector">
        <ModelDetailsDropdown
          selectedModel={selectedModel}
          onModelChange={onModelChange}
          style={{ width: '100%' }}
          testId="settings-model-selector-toggle"
        />
      </FormGroup>
      <SubscriptionDropdown
        selectedModel={selectedModel}
        selectedSubscription={selectedSubscription}
        onSubscriptionChange={onSubscriptionChange}
      />
      <ModelParameterFormGroup
        fieldId="temperature"
        label="Temperature: 0 - 2"
        helpText="Controls randomness in the output. Lower values make the output more focused and deterministic, while higher values increase creativity and diversity."
        value={temperature}
        onChange={(value) => {
          onTemperatureChange(value);
          fireMiscTrackingEvent('Playground Model Parameter Changed', {
            parameter: 'temperature',
            value,
          });
        }}
        max={2}
        showPopoverCloseButton={false}
      />

      <FormGroup
        fieldId="max-tokens"
        label={
          <span>
            Max tokens
            <Popover
              bodyContent={
                <div>
                  Sets the maximum number of tokens the model can generate in a single response.
                  Leave empty to use the model default.
                </div>
              }
              showClose={false}
            >
              <Button
                variant="plain"
                aria-label="More info for max tokens field"
                onClick={(e) => e.preventDefault()}
                style={{ marginLeft: 'var(--pf-t--global--spacer--xs)' }}
              >
                <HelpIcon />
              </Button>
            </Popover>
          </span>
        }
      >
        <TextInput
          id="max-tokens-input"
          type="number"
          aria-label="max tokens input field"
          value={maxTokens ?? ''}
          placeholder="Default"
          onChange={(_event, newValue) => {
            if (newValue === '') {
              onMaxTokensChange(undefined);
              fireMiscTrackingEvent('Playground Model Parameter Changed', {
                parameter: 'max_tokens',
                value: 'default',
              });
            } else {
              const parsed = parseInt(newValue, 10);
              if (!Number.isNaN(parsed) && parsed > 0) {
                onMaxTokensChange(parsed);
                fireMiscTrackingEvent('Playground Model Parameter Changed', {
                  parameter: 'max_tokens',
                  value: parsed,
                });
              }
            }
          }}
          min={1}
          data-testid="max-tokens-input"
        />
      </FormGroup>

      <FormGroup fieldId="streaming" data-testid="streaming-section">
        <Switch
          id="streaming-switch"
          label="Streaming"
          isChecked={isStreamingEnabled}
          onChange={(_event, checked) => onStreamingToggle(checked)}
          aria-label="Toggle streaming responses"
          data-testid="streaming-toggle"
        />
      </FormGroup>
    </Form>
  </TabContentWrapper>
);

export default ModelTabContent;
