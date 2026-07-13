import * as React from 'react';
import { Button, Modal, ModalBody, ModalFooter, ModalHeader, Radio } from '@patternfly/react-core';
import { fireMiscTrackingEvent } from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import { useChatbotConfigStore, DEFAULT_CONFIG_ID, selectSelectedModel } from '~/app/Chatbot/store';
import { usePlaygroundStore } from '~/app/Chatbot/store/usePlaygroundStore';
import { MLflowPromptVersion } from '~/app/types';
import { ChatbotContext } from '~/app/context/ChatbotContext';
import { getLlamaModelDisplayName, isLlamaModelEnabled } from '~/app/utilities/utils';
import PromptTable from './promptTable';
import CreatePrompt from './createPrompt';

type PromptManagementModalProps = {
  onShowModelSwitchAlert?: (modelName: string) => void;
};

export default function PromptManagementModal({
  onShowModelSwitchAlert,
}: PromptManagementModalProps): React.ReactNode {
  const updateSystemInstruction = useChatbotConfigStore((state) => state.updateSystemInstruction);
  const updateActivePrompt = useChatbotConfigStore((state) => state.updateActivePrompt);
  const updateDirtyPrompt = useChatbotConfigStore((state) => state.updateDirtyPrompt);
  const updateSelectedModel = useChatbotConfigStore((state) => state.updateSelectedModel);
  const { modalMode, modalConfigId, dirtyPromptSnapshot, closeModal } = usePlaygroundStore();
  const { aiModels, maasModels, lsdStatus } = React.useContext(ChatbotContext);

  const configId = modalConfigId ?? DEFAULT_CONFIG_ID;
  const selectedModel = useChatbotConfigStore(selectSelectedModel(configId));

  const [pendingPrompt, setPendingPrompt] = React.useState<MLflowPromptVersion | null>(null);
  const [showModelMismatchModal, setShowModelMismatchModal] = React.useState(false);
  const [showModelUnavailableWarning, setShowModelUnavailableWarning] = React.useState(false);
  const [switchToAssociated, setSwitchToAssociated] = React.useState(true);

  const displayTextLookup = {
    allPrompts: {
      title: 'Load prompt',
      description: 'Select a saved prompt from the current project or a global prompt template',
    },
    create: {
      title: 'Save prompt',
      description: 'Create a new managed chat prompt in your project.',
    },
    edit: {
      title: 'New prompt version',
      description: 'Create a new version of this chat prompt in your project.',
    },
  };
  const displayText = displayTextLookup[modalMode];

  function handleCloseSave() {
    // Restore the dirty prompt snapshot on cancel
    updateDirtyPrompt(configId, dirtyPromptSnapshot);
    const trackingEvent =
      modalMode === 'create' ? 'Playground Prompt Saved' : 'Playground Prompt Version Saved';
    fireMiscTrackingEvent(trackingEvent, {
      outcome: 'cancel',
    });
    closeModal();
  }

  function handleCloseLoad() {
    fireMiscTrackingEvent('Playground Prompt Loaded', {
      isSample: false,
      outcome: 'cancel',
    });
    closeModal();
  }

  function handleClickLoad(prompt: MLflowPromptVersion) {
    const { associatedModel } = prompt;

    // No associated model OR matches current model → load directly
    if (!associatedModel || associatedModel === selectedModel) {
      loadPrompt(prompt);
      return;
    }

    // Check if associated model is available
    const isCustomLSD = lsdStatus?.distribution_type === 'custom';
    const isAvailable = isLlamaModelEnabled(associatedModel, aiModels, maasModels, isCustomLSD);

    if (!isAvailable) {
      // Show warning and load with current model
      setPendingPrompt(prompt);
      setShowModelUnavailableWarning(true);
      return;
    }

    // Model mismatch → show confirmation
    setPendingPrompt(prompt);
    setSwitchToAssociated(true); // Reset to default choice
    setShowModelMismatchModal(true);
  }

  function handleConfirmModelSwitch() {
    if (!pendingPrompt) {
      return;
    }

    if (switchToAssociated && pendingPrompt.associatedModel) {
      // Switch model
      updateSelectedModel(configId, pendingPrompt.associatedModel);

      // Get model display name for alert
      const modelName = getLlamaModelDisplayName(pendingPrompt.associatedModel, aiModels);

      // Show success alert
      onShowModelSwitchAlert?.(modelName);

      // Tracking
      fireMiscTrackingEvent('Playground Model Switched via Prompt', {
        model: pendingPrompt.associatedModel,
      });
    }

    // Load prompt (with either new or current model)
    loadPrompt(pendingPrompt);

    // Close modal
    setShowModelMismatchModal(false);
    setPendingPrompt(null);
  }

  function handleCancelModelSwitch() {
    // Don't load, just close
    setShowModelMismatchModal(false);
    setPendingPrompt(null);
  }

  function handleContinueUnavailable() {
    // Load with current model
    if (pendingPrompt) {
      loadPrompt(pendingPrompt);
    }
    setShowModelUnavailableWarning(false);
    setPendingPrompt(null);
  }

  function handleCancelUnavailable() {
    // Don't load, just close
    setShowModelUnavailableWarning(false);
    setPendingPrompt(null);
  }

  function loadPrompt(prompt: MLflowPromptVersion) {
    updateActivePrompt(configId, prompt);
    const instruction =
      prompt.template ?? prompt.messages?.find((m) => m.role === 'system')?.content ?? '';
    updateSystemInstruction(configId, instruction);
    closeModal();
    fireMiscTrackingEvent('Playground Prompt Loaded', {
      isSample: false,
      outcome: 'success',
    });
  }

  return (
    <div data-testid="prompt-management-modal">
      {modalMode === 'allPrompts' && (
        <PromptTable
          onClose={handleCloseLoad}
          onClickLoad={handleClickLoad}
          displayText={displayText}
        />
      )}
      {(modalMode === 'create' || modalMode === 'edit') && (
        <CreatePrompt configId={configId} displayText={displayText} onClose={handleCloseSave} />
      )}

      {/* Model Mismatch Confirmation */}
      <Modal
        isOpen={showModelMismatchModal}
        onClose={handleCancelModelSwitch}
        variant="small"
        data-testid="model-mismatch-modal"
      >
        <ModalHeader title="Switch model?" />
        <ModalBody>
          <p>
            This prompt was validated against the{' '}
            <strong>
              {pendingPrompt?.associatedModel &&
                getLlamaModelDisplayName(pendingPrompt.associatedModel, aiModels)}
            </strong>{' '}
            model. Switch to the validated model, keep your current model, or cancel to return to
            the prompts list.
          </p>
          <p style={{ marginTop: 'var(--pf-t--global--spacer--md)' }}>
            <strong>Current model:</strong>{' '}
            {selectedModel && getLlamaModelDisplayName(selectedModel, aiModels)}
          </p>
          <p>
            <strong>Validated model:</strong>{' '}
            {pendingPrompt?.associatedModel &&
              getLlamaModelDisplayName(pendingPrompt.associatedModel, aiModels)}
          </p>
          <div style={{ marginTop: 'var(--pf-t--global--spacer--lg)' }}>
            <Radio
              isChecked={switchToAssociated}
              name="model-switch-choice"
              onChange={() => setSwitchToAssociated(true)}
              label="Yes, switch to the associated model"
              id="switch-to-associated"
              data-testid="radio-switch-to-associated"
            />
            <Radio
              isChecked={!switchToAssociated}
              name="model-switch-choice"
              onChange={() => setSwitchToAssociated(false)}
              label="No, keep the current model"
              id="keep-current"
              data-testid="radio-keep-current"
            />
          </div>
        </ModalBody>
        <ModalFooter>
          <Button
            variant="primary"
            onClick={handleConfirmModelSwitch}
            data-testid="model-switch-confirm"
          >
            Confirm
          </Button>
          <Button
            variant="link"
            onClick={handleCancelModelSwitch}
            data-testid="model-switch-cancel"
          >
            Cancel
          </Button>
        </ModalFooter>
      </Modal>

      {/* Model Unavailable Warning */}
      <Modal
        isOpen={showModelUnavailableWarning}
        onClose={handleCancelUnavailable}
        variant="small"
        data-testid="model-unavailable-modal"
      >
        <ModalHeader title="Associated model unavailable" />
        <ModalBody>
          <p>
            The model associated with this prompt, <strong>{pendingPrompt?.associatedModel}</strong>
            , is not available. The prompt will be loaded with your current selection (
            <strong>{selectedModel}</strong>). To enable access to the associated model, contact
            your administrator.
          </p>
        </ModalBody>
        <ModalFooter>
          <Button
            variant="primary"
            onClick={handleContinueUnavailable}
            data-testid="model-unavailable-continue"
          >
            Continue
          </Button>
          <Button
            variant="link"
            onClick={handleCancelUnavailable}
            data-testid="model-unavailable-cancel"
          >
            Cancel
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
