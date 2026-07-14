import * as React from 'react';
import { Radio, Stack, StackItem } from '@patternfly/react-core';

export type EnvDataTypeOption = {
  label: string;
  description?: string;
  render: React.ReactNode;
  isDisabled?: boolean;
  labelIcon?: React.ReactNode;
};

type EnvDataTypeFieldProps = {
  options: { [value: string]: EnvDataTypeOption };
  selection: string;
  onSelection: (value: string) => void;
  radioGroupName?: string;
};

const EnvDataTypeField: React.FC<EnvDataTypeFieldProps> = ({
  options,
  onSelection,
  selection,
  radioGroupName = 'env-data-type',
}) => {
  const uniqueId = React.useId();
  return (
    <Stack hasGutter data-testid="env-data-type-field">
      {Object.entries(options).map(([value, option]) => (
        <StackItem key={value}>
          <Radio
            id={`${uniqueId}-env-data-type-${value}`}
            name={`${uniqueId}-${radioGroupName}`}
            label={
              <>
                {option.label}
                {option.labelIcon}
              </>
            }
            description={option.description}
            isChecked={selection === value}
            onChange={() => onSelection(value)}
            isDisabled={option.isDisabled}
            body={selection === value ? option.render : undefined}
            data-testid={`env-data-type-radio-${value}`}
          />
        </StackItem>
      ))}
    </Stack>
  );
};

export default EnvDataTypeField;
