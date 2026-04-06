import * as React from 'react';
import { Button, Form, FormGroup } from '@patternfly/react-core';
import { AddCircleOIcon } from '@patternfly/react-icons';
import { useFeatureFlag } from '@openshift/dynamic-plugin-sdk';
import TabContentWrapper from '~/app/Chatbot/components/settingsPanelTabs/TabContentWrapper';
import SystemPromptFormGroup from '~/app/Chatbot/components/SystemInstructionFormGroup';
import PromptAssistantFormGroup from '~/app/Chatbot/components/PromptAssistantFormGroup';
import { usePlaygroundStore } from '~/app/Chatbot/store/usePlaygroundStore';
import { useConfirmation } from '~/app/Chatbot/hooks/useConfirmation';
import { usePromptEdited } from '~/app/Chatbot/hooks/usePromptEdited';
import { PROMPT_MANAGEMENT } from '~/odh/extensions';

interface PromptTabContentProps {
  systemInstruction: string;
  onSystemInstructionChange: (value: string) => void;
}

function PromptTabContent({
  systemInstruction,
  onSystemInstructionChange,
}: PromptTabContentProps): React.ReactNode {
  const { openModal } = usePlaygroundStore();
  const [promptManagementEnabled] = useFeatureFlag(PROMPT_MANAGEMENT);
  const isEdited = usePromptEdited();
  const { confirm, modal: confirmationModal } = useConfirmation(isEdited);

  function handleLoadPromptClick() {
    confirm(() => openModal('allPrompts'), {
      title: 'Load a different prompt?',
      message: 'Your current prompt has unsaved changes that will be lost.',
      confirmLabel: 'Load',
    });
  }

  function buildHeaderActions() {
    if (!promptManagementEnabled) {
      return null;
    }
    return (
      <Button
        variant="link"
        icon={<AddCircleOIcon aria-hidden="true" />}
        onClick={handleLoadPromptClick}
      >
        Load Prompt
      </Button>
    );
  }

  return (
    <>
      {confirmationModal}
      <TabContentWrapper title="Prompt" headerActions={buildHeaderActions()}>
        <Form>
          {!promptManagementEnabled && (
            <FormGroup fieldId="system-instructions" data-testid="system-instructions-section">
              <SystemPromptFormGroup
                systemInstruction={systemInstruction}
                onSystemInstructionChange={onSystemInstructionChange}
              />
            </FormGroup>
          )}
          {promptManagementEnabled && (
            <FormGroup fieldId="prompt-instructions" data-testid="prompt-instructions-section">
              <PromptAssistantFormGroup
                systemInstruction={systemInstruction}
                onSystemInstructionChange={onSystemInstructionChange}
              />
            </FormGroup>
          )}
        </Form>
      </TabContentWrapper>
    </>
  );
}

export default PromptTabContent;
