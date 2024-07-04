import * as React from 'react';
import { Stack, StackItem } from '@patternfly/react-core';
import IndentSection from '~/pages/projects/components/IndentSection';
import { getDashboardMainContainer } from '~/utilities/utils';
import SimpleSelect from '~/components/SimpleSelect';

type EnvDataTypeFieldProps = {
  options: { [value: string]: { label: string; render: React.ReactNode } };
  selection: string;
  onSelection: (value: string) => void;
};

const EnvDataTypeField: React.FC<EnvDataTypeFieldProps> = ({ options, onSelection, selection }) => (
  <Stack hasGutter>
    <StackItem data-testid="env-data-type-field">
      <SimpleSelect
        popperProps={{ appendTo: getDashboardMainContainer() }}
        isFullWidth
        toggleLabel={selection ? options[selection].label : 'Select one'}
        selected={selection}
        options={Object.keys(options).map((option) => ({
          key: option,
          children: options[option].label,
        }))}
        onSelect={(e, value) => {
          if (typeof value === 'string') {
            onSelection(value);
          }
        }}
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
