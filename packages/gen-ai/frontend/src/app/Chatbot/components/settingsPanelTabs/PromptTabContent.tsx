import * as React from 'react';
import { Button, Form, FormGroup } from '@patternfly/react-core';
import { AddCircleOIcon } from '@patternfly/react-icons';
import { useFeatureFlag } from '@openshift/dynamic-plugin-sdk';
import { fireMiscTrackingEvent } from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import TabContentWrapper from '~/app/Chatbot/components/settingsPanelTabs/TabContentWrapper';
import SystemPromptFormGroup from '~/app/Chatbot/components/SystemInstructionFormGroup';
import PromptAssistantFormGroup from '~/app/Chatbot/components/PromptAssistantFormGroup';
import { useChatbotConfigStore, selectDirtyPrompt, DEFAULT_CONFIG_ID } from '~/app/Chatbot/store';
import { usePlaygroundStore } from '~/app/Chatbot/store/usePlaygroundStore';
import { useConfirmation } from '~/app/Chatbot/hooks/useConfirmation';
import { usePromptEdited } from '~/app/Chatbot/hooks/usePromptEdited';
import { PROMPT_MANAGEMENT } from '~/odh/extensions';

interface PromptTabContentProps {
  configId?: string;
  systemInstruction: string;
  onSystemInstructionChange: (value: string) => void;
}

function PromptTabContent({
  configId = DEFAULT_CONFIG_ID,
  systemInstruction,
  onSystemInstructionChange,
}: PromptTabContentProps): React.ReactNode {
  const { openModal } = usePlaygroundStore();
  const dirtyPrompt = useChatbotConfigStore(selectDirtyPrompt(configId));
  const isEdited = usePromptEdited(configId);
  const [promptManagementEnabled] = useFeatureFlag(PROMPT_MANAGEMENT);
  const { confirm, modal: confirmationModal } = useConfirmation(isEdited);

  function handleLoadPromptClick() {
    confirm(() => openModal('allPrompts', configId, dirtyPrompt), {
      title: 'Load a different prompt?',
      message: 'Your current prompt has unsaved changes that will be lost.',
      confirmLabel: 'Load',
      onConfirmTracking: () =>
        fireMiscTrackingEvent('Playground Prompt Load Interrupted', {
          outcome: 'submit',
        }),
      onCancelTracking: () =>
        fireMiscTrackingEvent('Playground Prompt Load Interrupted', {
          outcome: 'cancel',
        }),
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
                configId={configId}
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
