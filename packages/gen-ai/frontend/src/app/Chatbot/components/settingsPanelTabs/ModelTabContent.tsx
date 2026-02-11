import * as React from 'react';
import { Form, FormGroup, Switch } from '@patternfly/react-core';
import { fireMiscTrackingEvent } from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import TabContentWrapper from '~/app/Chatbot/components/settingsPanelTabs/TabContentWrapper';
import ModelParameterFormGroup from '~/app/Chatbot/components/ModelParameterFormGroup';
import ModelDetailsDropdown from '~/app/Chatbot/components/ModelDetailsDropdown';

interface ModelTabContentProps {
  temperature: number;
  onTemperatureChange: (value: number) => void;
  isStreamingEnabled: boolean;
  onStreamingToggle: (enabled: boolean) => void;
  /** Custom title for the section (e.g., "Model 1 settings" in compare mode) */
  title?: string;
  selectedModel: string;
  onModelChange: (model: string) => void;
}

const ModelTabContent: React.FunctionComponent<ModelTabContentProps> = ({
  temperature,
  onTemperatureChange,
  isStreamingEnabled,
  onStreamingToggle,
  title = 'Model',
  selectedModel,
  onModelChange,
}) => (
  <TabContentWrapper title={title}>
    <Form>
      <FormGroup fieldId="model-selector">
        <ModelDetailsDropdown
          selectedModel={selectedModel}
          onModelChange={onModelChange}
          style={{ width: '100%' }}
        />
      </FormGroup>
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
