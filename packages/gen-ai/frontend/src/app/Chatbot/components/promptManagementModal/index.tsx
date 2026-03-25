import * as React from 'react';
import { Modal, ModalHeader, ModalBody } from '@patternfly/react-core';
import { useChatbotConfigStore } from '~/app/Chatbot/store';
import { usePlaygroundStore } from '~/app/Chatbot/store/usePlaygroundStore';
import { MLflowPromptVersion } from '~/app/types';
import PromptTable from './promptTable';
import CreatePrompt from './createPrompt';

export default function PromptManagementModal(): React.ReactNode {
  const updateSystemInstruction = useChatbotConfigStore((state) => state.updateSystemInstruction);
  const { setActivePrompt, setIsPromptManagementModalOpen, restoreDirtyPromptSnapshot, modalMode } =
    usePlaygroundStore();

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
  function handleClose() {
    if (modalMode === 'create' || modalMode === 'edit') {
      restoreDirtyPromptSnapshot();
    }
    setIsPromptManagementModalOpen(false);
  }

  function handleClickLoad(prompt: MLflowPromptVersion) {
    setActivePrompt(prompt);
    const instruction =
      prompt.template ?? prompt.messages?.find((m) => m.role === 'system')?.content ?? '';
    updateSystemInstruction('default', instruction);
    handleClose();
  }

  return (
    <Modal isOpen variant="large" onClose={handleClose}>
      <ModalHeader title={displayText.title} description={displayText.description} />
      <ModalBody>
        {modalMode === 'allPrompts' && (
          <PromptTable onClose={handleClose} onClickLoad={handleClickLoad} />
        )}
        {(modalMode === 'create' || modalMode === 'edit') && <CreatePrompt onClose={handleClose} />}
      </ModalBody>
    </Modal>
  );
}
