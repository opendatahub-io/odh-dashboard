import * as React from 'react';
import { Form, FormGroup, Switch } from '@patternfly/react-core';
import { fireMiscTrackingEvent } from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import { ChatbotContext } from '~/app/context/ChatbotContext';
import useWorkspaceCapabilities from '~/app/hooks/useWorkspaceCapabilities';
import TabContentWrapper from '~/app/Chatbot/components/settingsPanelTabs/TabContentWrapper';
import ModelParameterFormGroup from '~/app/Chatbot/components/ModelParameterFormGroup';
import ModelDetailsDropdown from '~/app/Chatbot/components/ModelDetailsDropdown';
import SubscriptionDropdown from '~/app/Chatbot/components/SubscriptionDropdown';
import TranscriptionModelSection from '~/app/Chatbot/components/settingsPanelTabs/TranscriptionModelSection';
import { useChatbotConfigStore, selectIsPreview } from '~/app/Chatbot/store';

interface ModelTabContentProps {
  temperature: number;
  onTemperatureChange: (value: number) => void;
  isStreamingEnabled: boolean;
  onStreamingToggle: (enabled: boolean) => void;
  /** Custom title for the section (e.g., "Model 1 settings" in compare mode) */
  title?: string;
  selectedModel: string;
  onModelChange: (model: string) => void;
  selectedSubscription: string;
  onSubscriptionChange: (subscription: string) => void;
  configId: string;
}

const ModelTabContent: React.FunctionComponent<ModelTabContentProps> = ({
  temperature,
  onTemperatureChange,
  isStreamingEnabled,
  onStreamingToggle,
  title = 'Model',
  selectedModel,
  onModelChange,
  selectedSubscription,
  onSubscriptionChange,
  configId,
}) => {
  const { aiModels, aiModelsLoaded, aiModelsError, maasModelsLoaded } =
    React.useContext(ChatbotContext);

  const isPreview = useChatbotConfigStore(selectIsPreview(configId));

  const { hasASRModel, capabilitiesReady, capabilitiesError } = useWorkspaceCapabilities(
    aiModels,
    aiModelsLoaded,
    maasModelsLoaded,
    aiModelsError,
  );

  React.useEffect(() => {
    if (capabilitiesReady && !capabilitiesError && !hasASRModel) {
      const store = useChatbotConfigStore.getState();
      store.updateAsrModelEnabled(configId, false);
      store.updateSelectedAsrModel(configId, '');
    }
  }, [capabilitiesReady, capabilitiesError, hasASRModel, configId]);

  return (
    <TabContentWrapper title={title}>
      <Form>
        <FormGroup fieldId="model-selector">
          <ModelDetailsDropdown
            selectedModel={selectedModel}
            onModelChange={onModelChange}
            style={{ width: '100%' }}
            testId="settings-model-selector-toggle"
            isDisabled={isPreview}
          />
        </FormGroup>
        <SubscriptionDropdown
          selectedModel={selectedModel}
          selectedSubscription={selectedSubscription}
          onSubscriptionChange={onSubscriptionChange}
          isDisabled={isPreview}
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
          isDisabled={isPreview}
        />

        <FormGroup fieldId="streaming" data-testid="streaming-section">
          <Switch
            id="streaming-switch"
            label="Streaming"
            isChecked={isStreamingEnabled}
            onChange={(_event, checked) => onStreamingToggle(checked)}
            aria-label="Toggle streaming responses"
            data-testid="streaming-toggle"
            isDisabled={isPreview}
          />
        </FormGroup>
        {hasASRModel && <TranscriptionModelSection configId={configId} />}
      </Form>
    </TabContentWrapper>
  );
};

export default ModelTabContent;
