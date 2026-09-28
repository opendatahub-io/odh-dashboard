import * as React from 'react';
import {
  Alert,
  Button,
  Dropdown,
  DropdownItem,
  DropdownList,
  FormGroup,
  HelperText,
  HelperTextItem,
  Label,
  List,
  ListItem,
  MenuToggle,
  MenuToggleElement,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Spinner,
  Title,
} from '@patternfly/react-core';
import { Link } from 'react-router-dom';
import { fireMiscTrackingEvent } from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import { ChatbotContext } from '~/app/context/ChatbotContext';
import { PLAYGROUND_MULTIMODAL_EVENTS } from '~/app/tracking/playgroundMultimodalTrackingConstants';
import { AIModel } from '~/app/types';
import useASRModels from '~/app/hooks/useASRModels';
import { convertMaaSModelToAIModel, getLlamaModelDisplayName } from '~/app/utilities';
import SubscriptionDropdown from '~/app/Chatbot/components/SubscriptionDropdown';
import {
  useChatbotConfigStore,
  selectSelectedAsrModel,
  selectSelectedAsrSubscription,
  selectIsAsrModelEnabled,
  selectSelectedModel,
} from '~/app/Chatbot/store';

interface TranscriptionModelSectionProps {
  configId: string;
}

const TranscriptionModelSection: React.FunctionComponent<TranscriptionModelSectionProps> = ({
  configId,
}) => {
  const { aiModels, aiModelsLoaded, maasModels, maasModelsLoaded } =
    React.useContext(ChatbotContext);
  const allModels = React.useMemo(
    () => [...aiModels, ...maasModels.map(convertMaaSModelToAIModel)],
    [aiModels, maasModels],
  );
  const asrModels = useASRModels(allModels);

  const selectedAsrModel = useChatbotConfigStore(selectSelectedAsrModel(configId));
  const selectedAsrSubscription = useChatbotConfigStore(selectSelectedAsrSubscription(configId));
  const isAsrModelEnabled = useChatbotConfigStore(selectIsAsrModelEnabled(configId));
  const selectedMainModel = useChatbotConfigStore(selectSelectedModel(configId));

  const updateSelectedAsrModel = useChatbotConfigStore((s) => s.updateSelectedAsrModel);
  const updateSelectedAsrSubscription = useChatbotConfigStore(
    (s) => s.updateSelectedAsrSubscription,
  );
  const updateAsrModelEnabled = useChatbotConfigStore((s) => s.updateAsrModelEnabled);

  const [isAllModelsOpen, setIsAllModelsOpen] = React.useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = React.useState(false);
  const [staleWarning, setStaleWarning] = React.useState(false);

  const modelsLoaded = aiModelsLoaded && maasModelsLoaded;

  React.useEffect(() => {
    if (!isAsrModelEnabled || !modelsLoaded) {
      return;
    }

    // Stale: selected model no longer exists in the available list
    if (selectedAsrModel && !allModels.some((m) => m.model_id === selectedAsrModel)) {
      updateSelectedAsrModel(configId, '');
      setStaleWarning(true);
    }
  }, [
    isAsrModelEnabled,
    modelsLoaded,
    allModels,
    selectedAsrModel,
    configId,
    updateSelectedAsrModel,
  ]);

  const handleRemove = React.useCallback(() => {
    updateAsrModelEnabled(configId, false);
    updateSelectedAsrModel(configId, '');
    setStaleWarning(false);
    requestAnimationFrame(() => {
      document.getElementById('asr-model-selector')?.focus();
    });
  }, [configId, updateAsrModelEnabled, updateSelectedAsrModel]);

  const handleSelect = React.useCallback(
    (value: string) => {
      updateSelectedAsrModel(configId, value);
      setStaleWarning(false);
      const model = allModels.find((m) => m.model_id === value);
      fireMiscTrackingEvent(PLAYGROUND_MULTIMODAL_EVENTS.ASR_MODEL_SELECTED, {
        modelName: model?.display_name || value,
        isDefaultModel: false,
      });
      setIsAllModelsOpen(false);
      setIsDropdownOpen(false);
    },
    [configId, updateSelectedAsrModel, allModels],
  );

  const getSelectedDisplayName = (models: AIModel[], modelId: string): string => {
    const model = models.find((m) => m.model_id === modelId);
    return model?.display_name || modelId;
  };

  if (!modelsLoaded) {
    return (
      <div data-testid="transcription-model-loading">
        <Spinner size="md" aria-label="Loading transcription models" />
      </div>
    );
  }

  const toggleLabel = selectedAsrModel
    ? getSelectedDisplayName(allModels, selectedAsrModel)
    : asrModels.length > 0
      ? 'Select a transcription model'
      : 'No models tagged for audio transcription';

  const mainModelDisplayName = selectedMainModel
    ? getLlamaModelDisplayName(selectedMainModel, aiModels)
    : '';

  const helperContent = (() => {
    if (staleWarning) {
      return (
        <HelperTextItem variant="warning">
          Previously selected model is no longer available.
        </HelperTextItem>
      );
    }
    if (selectedAsrModel && mainModelDisplayName) {
      return (
        <HelperTextItem>
          Audio is transcribed to text, then sent to {mainModelDisplayName}.
        </HelperTextItem>
      );
    }
    return null;
  })();

  const allModelsModal = (
    <Modal isOpen={isAllModelsOpen} onClose={() => setIsAllModelsOpen(false)} variant="medium">
      <ModalHeader title="Select audio transcription model" />
      <ModalBody>
        <Alert
          variant="info"
          isInline
          title="Models tagged with audio are verified for audio transcription. Select any other model to test it manually."
          className="pf-v6-u-mb-md"
        />
        <List isPlain>
          {[...asrModels, ...allModels.filter((m) => !asrModels.includes(m))].map((model) => (
            <ListItem key={model.model_id}>
              <Button
                variant="link"
                onClick={() => {
                  updateAsrModelEnabled(configId, true);
                  handleSelect(model.model_id);
                }}
                data-testid={`all-model-option-${model.model_id}`}
              >
                {model.display_name || model.model_id}
              </Button>{' '}
              {asrModels.includes(model) && <Label color="blue">Recommended</Label>}
              {model.description && <div className="pf-v6-u-pl-sm">{model.description}</div>}
            </ListItem>
          ))}
        </List>
      </ModalBody>
      <ModalFooter>
        <Button variant="link" className="pf-v6-u-pl-0" onClick={() => setIsAllModelsOpen(false)}>
          Cancel
        </Button>
      </ModalFooter>
    </Modal>
  );

  return (
    <FormGroup fieldId="asr-model-selector" className="pf-v6-u-mt-md">
      <Title headingLevel="h3" size="lg" className="pf-v6-u-mb-sm">
        Transcription model
      </Title>
      <Dropdown
        isOpen={isDropdownOpen}
        onSelect={(_, value) => {
          if (typeof value === 'string') {
            updateAsrModelEnabled(configId, true);
            handleSelect(value);
          }
        }}
        onOpenChange={setIsDropdownOpen}
        toggle={(toggleRef: React.Ref<MenuToggleElement>) => (
          <MenuToggle
            ref={toggleRef}
            id="asr-model-selector"
            aria-label="Transcription model"
            isDisabled={asrModels.length === 0}
            isExpanded={isDropdownOpen}
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            data-testid="transcription-model-selector"
          >
            {toggleLabel}
          </MenuToggle>
        )}
        shouldFocusToggleOnSelect
      >
        <DropdownList>
          {asrModels.map((model) => (
            <DropdownItem key={model.model_id} value={model.model_id}>
              {model.display_name || model.model_id}
            </DropdownItem>
          ))}
        </DropdownList>
      </Dropdown>
      <div>
        <Button variant="link" className="pf-v6-u-pl-0" onClick={() => setIsAllModelsOpen(true)}>
          View all models
        </Button>
        {selectedAsrModel && (
          <Button
            variant="link"
            onClick={handleRemove}
            data-testid="remove-transcription-model-btn"
          >
            Remove
          </Button>
        )}
      </div>
      {asrModels.length === 0 && !selectedAsrModel && (
        <HelperText>
          <HelperTextItem>
            To enable audio transcription, tag a model with the audio capability in{' '}
            <Link to="/ai-hub/models/registry">Model registry</Link>.
          </HelperTextItem>
        </HelperText>
      )}
      <div aria-live="polite" aria-atomic="true">
        {helperContent && <HelperText className="pf-v6-u-mt-xs">{helperContent}</HelperText>}
      </div>
      {allModels.find((m) => m.model_id === selectedAsrModel)?.model_source_type === 'maas' && (
        <SubscriptionDropdown
          selectedModel={selectedAsrModel}
          selectedSubscription={selectedAsrSubscription}
          onSubscriptionChange={(sub) => updateSelectedAsrSubscription(configId, sub)}
          isMaaSModel
          label="Transcription subscription"
          helpText="Select the subscription to use for the transcription model. This controls access and rate limits for audio transcription."
          className="pf-v6-u-mt-sm"
        />
      )}
      {allModelsModal}
    </FormGroup>
  );
};

export default TranscriptionModelSection;
