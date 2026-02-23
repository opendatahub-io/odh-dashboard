import * as React from 'react';
import { Modal, Flex, ModalHeader, ModalBody, Spinner } from '@patternfly/react-core';
import { useChatbotConfigStore } from '~/app/Chatbot/store';
import { usePlaygroundStore } from '~/app/Chatbot/store/usePlaygroundStore';
import useFetchMLflowPrompts from '~/app/hooks/useFetchMLflowPrompts';
import { MLflowPromptVersion } from '~/app/types';
import PromptTable from './promptTable';

export default function PromptManagementModal(): React.ReactNode {
  const [promptsData, loaded, loadError] = useFetchMLflowPrompts();
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
  const { prompts } = promptsData;
  return (
    <Modal isOpen variant="large" onClose={handleClose}>
      <ModalHeader
        title="Load Prompt"
        description="Select a saved prompt from the current project or a global prompt template"
      />
      <ModalBody>
        {prompts.length === 0 && <div>empty state</div>}
        {prompts.length > 0 && (
          <PromptTable rows={prompts} onClose={handleClose} onClickLoad={handleClickLoad} />
        )}
        {!loaded && (
          <Flex justifyContent={{ default: 'justifyContentSpaceAround' }}>
            <Spinner />
          </Flex>
        )}
        {loadError && <div>error state</div>}
      </ModalBody>
    </Modal>
  );
}
