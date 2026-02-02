import * as React from 'react';
import { Form, FormGroup } from '@patternfly/react-core';
import TabContentWrapper from '~/app/Chatbot/components/settingsPanelTabs/TabContentWrapper';
import SystemPromptFormGroup from '~/app/Chatbot/components/SystemInstructionFormGroup';

interface PromptTabContentProps {
  systemInstruction: string;
  onSystemInstructionChange: (value: string) => void;
}

const PromptTabContent: React.FunctionComponent<PromptTabContentProps> = ({
  systemInstruction,
  onSystemInstructionChange,
}) => (
  <TabContentWrapper title="System instructions">
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

export default PromptTabContent;
