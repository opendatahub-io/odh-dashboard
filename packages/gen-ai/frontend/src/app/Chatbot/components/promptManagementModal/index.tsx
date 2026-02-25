import * as React from 'react';
import { Modal, ModalHeader, ModalBody } from '@patternfly/react-core';
import { useChatbotConfigStore } from '~/app/Chatbot/store';
import { usePlaygroundStore } from '~/app/Chatbot/store/usePlaygroundStore';
import { MLflowPromptVersion } from '~/app/types';
import PromptTable from './promptTable';

export default function PromptManagementModal(): React.ReactNode {
  const updateSystemInstruction = useChatbotConfigStore((state) => state.updateSystemInstruction);
  const { setIsPromptManagementModalOpen } = usePlaygroundStore();

  function handleClose() {
    setIsPromptManagementModalOpen(false);
  }

  function handleClickLoad(prompt: MLflowPromptVersion) {
    const instruction =
      prompt.template ?? prompt.messages?.find((m) => m.role === 'system')?.content ?? '';
    updateSystemInstruction('default', instruction);
    handleClose();
  }

  return (
    <Modal isOpen variant="large" onClose={handleClose}>
      <ModalHeader
        title="Load Prompt"
        description="Select a saved prompt from the current project or a global prompt template"
      />
      <ModalBody>
        <PromptTable onClose={handleClose} onClickLoad={handleClickLoad} />
      </ModalBody>
    </Modal>
  );
}
