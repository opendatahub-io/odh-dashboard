import * as React from 'react';
import { FormGroup, TextArea, Stack } from '@patternfly/react-core';

interface SystemPromptFormGroupProps {
  systemPrompt: string;
  onSystemPromptChange: (value: string) => void;
}

const SystemPromptFormGroup: React.FunctionComponent<SystemPromptFormGroupProps> = ({
  systemPrompt,
  onSystemPromptChange,
}) => (
  <FormGroup label="System instructions" fieldId="system-instructions">
    <Stack hasGutter>
      <TextArea
        id="system-instructions-input"
        type="text"
        value={systemPrompt}
        onChange={(_event, value) => onSystemPromptChange(value)}
        aria-label="System instructions input"
        rows={8}
      />
    </Stack>
  </FormGroup>
);

export default SystemPromptFormGroup;
