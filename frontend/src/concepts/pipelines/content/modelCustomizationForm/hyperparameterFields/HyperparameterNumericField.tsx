import { FormGroup } from '@patternfly/react-core';
import * as React from 'react';
import NumberInputWrapper from '~/components/NumberInputWrapper';
import { HyperparameterFields } from '~/pages/pipelines/global/modelCustomization/const';

type HyperparameterNumericFieldProps = {
  onChange: (hyperparameter: HyperparameterFields, hyperparameterValue: number | string) => void;
  label: string;
  field: HyperparameterFields;
  value: number | string;
  isInt: boolean;
  min?: number;
  isRequired?: boolean;
  isDisabled?: boolean;
  displayLabel?: boolean;
};

const HyperparameterNumericField: React.FC<HyperparameterNumericFieldProps> = ({
  onChange,
  label,
  field,
  value,
  isInt,
  min = 0,
  isRequired = true,
  isDisabled = false,
  displayLabel = true,
}) => (
  <FormGroup isRequired={isRequired} label={displayLabel && label}>
    <NumberInputWrapper
      min={min}
      value={typeof value === 'number' ? value : Number(value)}
      onChange={(val) => {
        if (val) {
          onChange(field, typeof value === 'number' ? val : val.toString());
        }
      }}
      isDisabled={isDisabled}
      intOnly={isInt}
    />
  </FormGroup>
);

export default HyperparameterNumericField;
