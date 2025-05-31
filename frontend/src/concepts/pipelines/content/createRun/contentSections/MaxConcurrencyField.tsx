import * as React from 'react';
import { FormGroup } from '@patternfly/react-core';
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
      <DashboardHelpTooltip content="Specifies how many runs can be executed concurrently. Range [1-10]" />
    }
  >
    <NumberInputWrapper
      data-testid="maxConcurrencyField"
      min={1}
      max={10}
      onChange={(newValue) => onChange(newValue ?? 0)}
      value={value}
    />
  </FormGroup>
);

export default MaxConcurrencyField;
