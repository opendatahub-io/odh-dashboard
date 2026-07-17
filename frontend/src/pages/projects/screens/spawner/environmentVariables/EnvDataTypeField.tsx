import * as React from 'react';
import { FormGroup, Radio, Stack, StackItem } from '@patternfly/react-core';
import IndentSection from '#~/pages/projects/components/IndentSection';

type EnvDataTypeFieldProps = {
  options: { [value: string]: { label: string; description?: string; render: React.ReactNode } };
  selection: string;
  onSelection: (value: string) => void;
};

const EnvDataTypeField: React.FC<EnvDataTypeFieldProps> = ({ options, onSelection, selection }) => {
  const groupId = React.useId().replace(/:/g, '');

  return (
    <Stack hasGutter>
      <StackItem data-testid="env-data-type-field">
        <FormGroup label="Data type" fieldId={groupId}>
          <Stack hasGutter>
            {Object.keys(options).map((optionKey) => (
              <StackItem key={optionKey}>
                <Radio
                  id={`${groupId}-${optionKey}`}
                  data-testid={`env-data-type-radio-${optionKey}`}
                  name={groupId}
                  label={options[optionKey].label}
                  description={options[optionKey].description}
                  isChecked={selection === optionKey}
                  onChange={() => onSelection(optionKey)}
                />
              </StackItem>
            ))}
          </Stack>
        </FormGroup>
      </StackItem>
      {selection ? (
        <StackItem>
          <IndentSection>{options[selection].render}</IndentSection>
        </StackItem>
      ) : null}
    </Stack>
  );
};

export default EnvDataTypeField;
