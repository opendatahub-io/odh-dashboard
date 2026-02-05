import * as React from 'react';
import { Form, FormGroup, Switch } from '@patternfly/react-core';
import { fireMiscTrackingEvent } from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import TabContentWrapper from '~/app/Chatbot/components/settingsPanelTabs/TabContentWrapper';
import ModelParameterFormGroup from '~/app/Chatbot/components/ModelParameterFormGroup';

interface ModelTabContentProps {
  temperature: number;
  onTemperatureChange: (value: number) => void;
  isStreamingEnabled: boolean;
  onStreamingToggle: (enabled: boolean) => void;
}

const ModelTabContent: React.FunctionComponent<ModelTabContentProps> = ({
  temperature,
  onTemperatureChange,
  isStreamingEnabled,
  onStreamingToggle,
}) => (
  <TabContentWrapper title="Model">
    <Form>
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

      <FormGroup fieldId="streaming">
        <Switch
          id="streaming-switch"
          label="Streaming"
          isChecked={isStreamingEnabled}
          onChange={(_event, checked) => onStreamingToggle(checked)}
          aria-label="Toggle streaming responses"
        />
      </FormGroup>
    </Form>
  </TabContentWrapper>
);

export default ModelTabContent;
