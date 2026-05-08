import * as React from 'react';
import { fireMiscTrackingEvent } from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import { useChatbotConfigStore, DEFAULT_CONFIG_ID } from '~/app/Chatbot/store';
import { usePlaygroundStore } from '~/app/Chatbot/store/usePlaygroundStore';
import { MLflowPromptVersion } from '~/app/types';
import PromptTable from './promptTable';
import CreatePrompt from './createPrompt';

export default function PromptManagementModal(): React.ReactNode {
  const updateSystemInstruction = useChatbotConfigStore((state) => state.updateSystemInstruction);
  const updateActivePrompt = useChatbotConfigStore((state) => state.updateActivePrompt);
  const updateDirtyPrompt = useChatbotConfigStore((state) => state.updateDirtyPrompt);
  const { modalMode, modalConfigId, dirtyPromptSnapshot, closeModal } = usePlaygroundStore();

  const configId = modalConfigId ?? DEFAULT_CONFIG_ID;

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
    </div>
  );
}
