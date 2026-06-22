import * as React from 'react';
import { FormGroup, TextInput, Stack, StackItem, Title, Flex, Label } from '@patternfly/react-core';
import { extractTemplateVariables } from '~/app/Chatbot/promptTemplateUtils';

interface PromptVariableInputPanelProps {
  systemInstruction: string;
  variableValues: Record<string, string>;
  onVariableValuesChange: (values: Record<string, string>) => void;
  isDisabled?: boolean;
}

export default function PromptVariableInputPanel({
  systemInstruction,
  variableValues,
  onVariableValuesChange,
  isDisabled = false,
}: PromptVariableInputPanelProps): React.ReactNode {
  const variables = React.useMemo(
    () => extractTemplateVariables(systemInstruction),
    [systemInstruction],
  );

  if (variables.length === 0) {
    return null;
  }

  function handleValueChange(variableName: string, value: string) {
    onVariableValuesChange({ ...variableValues, [variableName]: value });
  }

  return (
    <Stack hasGutter data-testid="prompt-variable-input-panel">
      <StackItem>
        <Flex gap={{ default: 'gapSm' }} alignItems={{ default: 'alignItemsCenter' }}>
          <Title headingLevel="h6">Variables</Title>
          <Label isCompact variant="outline">
            {variables.length}
          </Label>
        </Flex>
      </StackItem>
      {variables.map((name) => (
        <StackItem key={name}>
          <FormGroup label={name} fieldId={`prompt-variable-${name}`}>
            <TextInput
              id={`prompt-variable-${name}`}
              data-testid={`prompt-variable-input-${name}`}
              value={variableValues[name] ?? ''}
              onChange={(_event, value) => handleValueChange(name, value)}
              aria-label={`Value for variable ${name}`}
              placeholder={`Enter value for ${name}`}
              isDisabled={isDisabled}
            />
          </FormGroup>
        </StackItem>
      ))}
    </Stack>
  );
}
