import * as React from 'react';
import {
  Button,
  FormGroup,
  HelperText,
  HelperTextItem,
  MenuToggle,
  Select,
  SelectList,
  SelectOption,
  Spinner,
  Tooltip,
} from '@patternfly/react-core';
import { MinusCircleIcon, PlusCircleIcon } from '@patternfly/react-icons';

type CSSCustomProperties = { [key: `--${string}`]: string | number };
type ExtendedCSSProperties = React.CSSProperties & CSSCustomProperties;
import FieldGroupHelpLabelIcon from '@odh-dashboard/internal/components/FieldGroupHelpLabelIcon';
import { ChatbotContext } from '~/app/context/ChatbotContext';
import { AIModel } from '~/app/types';
import useASRModels from '~/app/hooks/useASRModels';
import { getLlamaModelDisplayName } from '~/app/utilities';
import {
  useChatbotConfigStore,
  selectSelectedAsrModel,
  selectIsAsrModelEnabled,
  selectSelectedModel,
  selectIsPreview,
} from '~/app/Chatbot/store';

interface TranscriptionModelSectionProps {
  configId: string;
}

const TranscriptionModelSection: React.FunctionComponent<TranscriptionModelSectionProps> = ({
  configId,
}) => {
  const { aiModels, aiModelsLoaded } = React.useContext(ChatbotContext);
  const asrModels = useASRModels(aiModels);

  const selectedAsrModel = useChatbotConfigStore(selectSelectedAsrModel(configId));
  const isAsrModelEnabled = useChatbotConfigStore(selectIsAsrModelEnabled(configId));
  const selectedMainModel = useChatbotConfigStore(selectSelectedModel(configId));
  const isPreview = useChatbotConfigStore(selectIsPreview(configId));
  const updateSelectedAsrModel = useChatbotConfigStore((s) => s.updateSelectedAsrModel);
  const updateAsrModelEnabled = useChatbotConfigStore((s) => s.updateAsrModelEnabled);

  const [isOpen, setIsOpen] = React.useState(false);
  const [staleWarning, setStaleWarning] = React.useState(false);

  const selectContainerRef = React.useRef<HTMLDivElement>(null);
  const addButtonRef = React.useRef<HTMLButtonElement>(null);

  // Combined effect: auto-select (N=1) + stale detection, gated on aiModelsLoaded
  React.useEffect(() => {
    if (!isAsrModelEnabled || !aiModelsLoaded) {
      return;
    }

    // Stale: selected model no longer exists in the available list
    if (selectedAsrModel && !asrModels.some((m) => m.model_id === selectedAsrModel)) {
      updateSelectedAsrModel(configId, '');
      setStaleWarning(true);
      return;
    }

    // Auto-select when exactly one model available and none selected
    if (asrModels.length === 1 && !selectedAsrModel) {
      updateSelectedAsrModel(configId, asrModels[0].model_id);
      setStaleWarning(false);
    }
  }, [
    isAsrModelEnabled,
    aiModelsLoaded,
    asrModels,
    selectedAsrModel,
    configId,
    updateSelectedAsrModel,
  ]);

  const handleEnable = React.useCallback(() => {
    updateAsrModelEnabled(configId, true);
    requestAnimationFrame(() => {
      const toggle = selectContainerRef.current?.querySelector<HTMLButtonElement>(
        '[data-testid="asr-model-selector-toggle"]',
      );
      toggle?.focus();
    });
  }, [configId, updateAsrModelEnabled]);

  const handleRemove = React.useCallback(() => {
    updateAsrModelEnabled(configId, false);
    updateSelectedAsrModel(configId, '');
    setStaleWarning(false);
    requestAnimationFrame(() => {
      addButtonRef.current?.focus();
    });
  }, [configId, updateAsrModelEnabled, updateSelectedAsrModel]);

  const handleSelect = React.useCallback(
    (
      _event: React.MouseEvent<Element, MouseEvent> | undefined,
      value: string | number | undefined,
    ) => {
      if (typeof value === 'string') {
        updateSelectedAsrModel(configId, value);
        setStaleWarning(false);
      }
      setIsOpen(false);
    },
    [configId, updateSelectedAsrModel],
  );

  const getSelectedDisplayName = (models: AIModel[], modelId: string): string => {
    const model = models.find((m) => m.model_id === modelId);
    return model?.display_name || modelId;
  };

  if (!aiModelsLoaded) {
    return (
      <div data-testid="transcription-model-loading">
        <Spinner size="md" aria-label="Loading transcription models" />
      </div>
    );
  }

  // State 1: Add button (disabled with tooltip when N=0 ASR models)
  if (!isAsrModelEnabled) {
    const noModelsAvailable = asrModels.length === 0;
    const disabledLinkStyle: ExtendedCSSProperties = {
      '--pf-v6-c-button--disabled--BackgroundColor': 'transparent',
      '--pf-v6-c-button--disabled--Color': 'var(--pf-t--global--text--color--subtle)',
      '--pf-v6-c-button--disabled__icon--Color': 'currentColor',
    };
    const addButton = (
      <Button
        ref={addButtonRef}
        variant="link"
        icon={<PlusCircleIcon />}
        onClick={handleEnable}
        isAriaDisabled={noModelsAvailable || isPreview}
        data-testid="add-transcription-model-btn"
        aria-label="Add audio transcription model"
        style={noModelsAvailable ? disabledLinkStyle : undefined}
      >
        Add audio transcription model
      </Button>
    );

    return (
      <div
        className="pf-v6-u-p-md pf-v6-u-mt-md"
        style={{
          border: '1px dashed var(--pf-t--global--border--color--default)',
          borderRadius: 'var(--pf-t--global--border--radius--small)',
          textAlign: 'center',
        }}
        data-testid="transcription-model-add-section"
      >
        {noModelsAvailable ? (
          <Tooltip content="Deploy an ASR model to enable audio transcription">{addButton}</Tooltip>
        ) : (
          addButton
        )}
      </div>
    );
  }

  // State 2/2b: Enabled section
  const toggleLabel = selectedAsrModel
    ? getSelectedDisplayName(asrModels, selectedAsrModel)
    : 'Select a transcription model';

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
    if (asrModels.length === 0) {
      return (
        <HelperTextItem>
          No ASR models available.{' '}
          <a
            href="https://docs.redhat.com/en/documentation/red_hat_openshift_ai_self-managed"
            target="_blank"
            rel="noopener noreferrer"
          >
            Deploy an ASR model
          </a>{' '}
          to enable audio transcription.
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

  return (
    <FormGroup
      fieldId="asr-model-selector"
      label="Transcription model"
      labelHelp={
        <FieldGroupHelpLabelIcon content="Transcribes audio files to text before sending to the chat model." />
      }
      className="pf-v6-u-mt-md"
    >
      <div ref={selectContainerRef}>
        <Select
          id="asr-model-selector"
          isOpen={isOpen}
          selected={selectedAsrModel || undefined}
          onSelect={handleSelect}
          onOpenChange={setIsOpen}
          toggle={(toggleRef) => (
            <MenuToggle
              ref={toggleRef}
              onClick={() => setIsOpen(!isOpen)}
              isExpanded={isOpen}
              isDisabled={asrModels.length === 0 || isPreview}
              isFullWidth
              data-testid="asr-model-selector-toggle"
              aria-label="Select a transcription model"
            >
              {toggleLabel}
            </MenuToggle>
          )}
        >
          <SelectList>
            {asrModels.map((model) => (
              <SelectOption
                key={model.model_id}
                value={model.model_id}
                data-testid={`asr-model-option-${model.model_id}`}
              >
                {model.display_name || model.model_id}
              </SelectOption>
            ))}
          </SelectList>
        </Select>
      </div>
      <div aria-live="polite" aria-atomic="true">
        {helperContent && <HelperText className="pf-v6-u-mt-xs">{helperContent}</HelperText>}
      </div>
      <Button
        variant="link"
        icon={<MinusCircleIcon />}
        onClick={handleRemove}
        className="pf-v6-u-mt-sm"
        data-testid="remove-transcription-model-btn"
        aria-label="Remove transcription model"
        isDisabled={isPreview}
      >
        Remove
      </Button>
    </FormGroup>
  );
};

export default TranscriptionModelSection;
