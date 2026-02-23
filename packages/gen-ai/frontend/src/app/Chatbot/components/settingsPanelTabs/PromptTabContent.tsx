import * as React from 'react';
import { Button, Form, FormGroup } from '@patternfly/react-core';
import { AddCircleOIcon } from '@patternfly/react-icons';
import TabContentWrapper from '~/app/Chatbot/components/settingsPanelTabs/TabContentWrapper';
import SystemPromptFormGroup from '~/app/Chatbot/components/SystemInstructionFormGroup';
import { usePlaygroundStore } from '~/app/Chatbot/store/usePlaygroundStore';

interface PromptTabContentProps {
  systemInstruction: string;
  onSystemInstructionChange: (value: string) => void;
}

function PromptTabContent({
  systemInstruction,
  onSystemInstructionChange,
}: PromptTabContentProps): React.ReactNode {
  const { setIsPromptManagementModalOpen } = usePlaygroundStore();

  function buildHeaderActions() {
    return (
      <Button
        variant="link"
        icon={<AddCircleOIcon aria-hidden="true" />}
        onClick={() => {
          setIsPromptManagementModalOpen(true);
        }}
      >
        Load Prompt
      </Button>
    );
  }

  return (
    <TabContentWrapper title="Prompt" headerActions={buildHeaderActions()}>
      <Form>
        <FormGroup fieldId="system-instructions" data-testid="system-instructions-section">
          <SystemPromptFormGroup
            systemInstruction={systemInstruction}
            onSystemInstructionChange={onSystemInstructionChange}
          />
        </FormGroup>
      </Form>
    </TabContentWrapper>
  );
}

export default PromptTabContent;
