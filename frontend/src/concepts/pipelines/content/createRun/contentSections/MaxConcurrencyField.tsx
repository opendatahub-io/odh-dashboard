import * as React from 'react';
import { FormGroup, FormHelperText, HelperText, HelperTextItem } from '@patternfly/react-core';
import NumberInputWrapper from '#~/components/NumberInputWrapper';
import DashboardHelpTooltip from '#~/concepts/dashboard/DashboardHelpTooltip';

type MaxConcurrencyFieldProps = {
  onChange: (value: number) => void;
  value: number;
};

const MaxConcurrencyField: React.FC<MaxConcurrencyFieldProps> = ({ onChange, value }) => (
  <FormGroup
    label="Maximum concurrent runs"
    isRequired
    fieldId="maxConcurrency"
    labelHelp={
      <DashboardHelpTooltip content="Defines how many runs can be executed at the same time." />
    }
  >
    <NumberInputWrapper
      data-testid="maxConcurrencyField"
      min={1}
      max={10}
      onChange={(newValue) => onChange(newValue ?? 0)}
      value={value}
    />
    <FormHelperText>
      <HelperText>
        <HelperTextItem>Must be between 1 and 10, inclusive.</HelperTextItem>
      </HelperText>
    </FormHelperText>
  </FormGroup>
);

export default MaxConcurrencyField;
