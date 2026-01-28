import * as React from 'react';
import { Form, FormGroup, Button } from '@patternfly/react-core';
import { PlusCircleIcon } from '@patternfly/react-icons';
import TabContentWrapper from '~/app/Chatbot/components/settingsPanelTabs/TabContentWrapper';
import SystemPromptFormGroup from '~/app/Chatbot/components/SystemInstructionFormGroup';

interface PromptTabContentProps {
  systemInstruction: string;
  onSystemInstructionChange: (value: string) => void;
}

const PromptTabContent: React.FunctionComponent<PromptTabContentProps> = ({
  systemInstruction,
  onSystemInstructionChange,
}) => {
  const headerActions = (
    <Button
      variant="link"
      icon={<PlusCircleIcon />}
      iconPosition="start"
      onClick={() => {
        // TODO: Implement load prompt functionality
      }}
      data-testid="load-prompt-button"
    >
      Load prompt
    </Button>
  );

  return (
    <TabContentWrapper title="System instructions" headerActions={headerActions}>
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
};

export default PromptTabContent;
