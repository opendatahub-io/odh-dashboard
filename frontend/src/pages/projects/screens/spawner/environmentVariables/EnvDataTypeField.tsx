import * as React from 'react';
import { Stack, StackItem } from '@patternfly/react-core';
import IndentSection from '#~/pages/projects/components/IndentSection';
import SimpleSelect, { SimpleSelectOption } from '#~/components/SimpleSelect';

type EnvDataTypeFieldProps = {
  options: { [value: string]: { label: string; render: React.ReactNode } };
  selection: string;
  onSelection: (value: string) => void;
};

const EnvDataTypeField: React.FC<EnvDataTypeFieldProps> = ({ options, onSelection, selection }) => (
  <Stack hasGutter>
    <StackItem data-testid="env-data-type-field">
      <SimpleSelect
        isFullWidth
        placeholder="Select one"
        ariaLabel="Data type"
        value={selection}
        options={Object.keys(options).map(
          (option): SimpleSelectOption => ({
            key: option,
            label: options[option].label,
          }),
        )}
        onChange={onSelection}
      />
    </StackItem>
    {selection && (
      <StackItem>
        <IndentSection>{options[selection].render}</IndentSection>
      </StackItem>
    )}
  </Stack>
);

export default EnvDataTypeField;
