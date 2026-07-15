import * as React from 'react';
import { FormGroup, Stack, StackItem } from '@patternfly/react-core';
import SimpleSelect, { SimpleSelectOption } from '@odh-dashboard/ui-core/components/SimpleSelect';
import IndentSection from '#~/pages/projects/components/IndentSection';
import { getDashboardMainContainer } from '#~/utilities/utils';

const ENV_VAR_POPPER_PROPS = { appendTo: getDashboardMainContainer() };

type EnvDataTypeFieldProps = {
  options: { [value: string]: { label: string; render: React.ReactNode } };
  selection: string;
  onSelection: (value: string) => void;
};

const EnvDataTypeField: React.FC<EnvDataTypeFieldProps> = ({ options, onSelection, selection }) => {
  const selectId = React.useId().replace(/:/g, '');

  return (
    <Stack hasGutter>
      <StackItem data-testid="env-data-type-field">
        <FormGroup label="Data type" fieldId={selectId}>
          <SimpleSelect
            dataTestId="environment-variable-data-type-toggle"
            isFullWidth
            placeholder="Select one"
            ariaLabel="Data type"
            toggleProps={{ id: selectId }}
            popperProps={ENV_VAR_POPPER_PROPS}
            value={selection}
            options={Object.keys(options).map(
              (option): SimpleSelectOption => ({
                key: option,
                label: options[option].label,
              }),
            )}
            onChange={onSelection}
          />
        </FormGroup>
      </StackItem>
      {selection && (
        <StackItem>
          <IndentSection>{options[selection].render}</IndentSection>
        </StackItem>
      )}
    </Stack>
  );
};

export default EnvDataTypeField;
